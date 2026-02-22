import { useEffect, useRef, useState } from "react";

import { pdfjsLib } from "@/lib/pdfjs";
import { CssPageRect, PdfRect, toPdfRectFromSelection } from "@/lib/pdfSelection";

import {
  EventBus,
  PDFViewer,
  PDFLinkService,
  PDFFindController,
} from "pdfjs-dist/web/pdf_viewer.mjs";
import "pdfjs-dist/web/pdf_viewer.css";
import { useMupdf } from "@/hooks/useMupdf.hook";
import { RedactionTarget } from "@/workers/mupdf.worker";


type StoredSelection = {
  pageNumber: number; // 1-based
  text: string;
  previewRect: CssPageRect;
  pdfRect: PdfRect | null;
  createdAt: number;
};


type Props = {
    file: string | Uint8Array | ArrayBuffer;
};

export default function PDFJsViewer({ file }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewerRef = useRef<HTMLDivElement | null>(null);
    const pdfViewerRef = useRef<PDFViewer | null>(null);
    const isMouseDown = useRef(false);
    const [activeFile, setActiveFile] = useState<Props["file"]>(file);
    const [storedSelections, setStoredSelections] = useState<StoredSelection[]>([]);
    const [isRedacting, setIsRedacting] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const { isWorkerInitialized, redactPages, loadDocument } = useMupdf();

    useEffect(() => {
        setActiveFile(file);
        setStoredSelections([]);
    }, [file]);

    useEffect(() => {
        document.body.classList.toggle("theme-dark", isDarkMode);
        return () => {
            document.body.classList.remove("theme-dark");
        };
    }, [isDarkMode]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onMouseDown = () => {
            isMouseDown.current = true;
        };

        const onMouseUp = () => {
            if (!isMouseDown.current) return;
            isMouseDown.current = false;

            // Wait one frame so selection is finalized.
            requestAnimationFrame(() => {
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

                const text = sel.toString().trim();
                if (!text) return;

                const range = sel.getRangeAt(0);

                const node =
                    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
                        ? (range.commonAncestorContainer as Element)
                        : range.commonAncestorContainer.parentElement;

                const pageEl = node?.closest(".page") as HTMLElement | null;
                if (!pageEl) return;

                const pageNumber = Number(pageEl.getAttribute("data-page-number") || "0");
                if (!pageNumber) return;

                const pageBox = pageEl.getBoundingClientRect();
                const textLayerEl = pageEl.querySelector(".textLayer") as HTMLElement | null;
                const contentBox = textLayerEl?.getBoundingClientRect() ?? pageBox;
                const fragmentRects = Array.from(range.getClientRects());
                if (!fragmentRects.length) return;

                const selectionItems: StoredSelection[] = fragmentRects
                    .map((frag) => {
                        const previewRect: CssPageRect = {
                            x: frag.left - pageBox.left - pageEl.clientLeft,
                            y: frag.top - pageBox.top - pageEl.clientTop,
                            width: frag.width,
                            height: frag.height,
                        };

                        const rectForPdf: CssPageRect = {
                            x: frag.left - contentBox.left,
                            y: frag.top - contentBox.top,
                            width: frag.width,
                            height: frag.height,
                        };

                        return { previewRect, rectForPdf };
                    })
                    .filter(({ previewRect }) => previewRect.width > 0 && previewRect.height > 0)
                    .map(({ previewRect, rectForPdf }) => {
                        const pdfRect = pdfViewerRef.current
                            ? toPdfRectFromSelection(pdfViewerRef.current, pageNumber, rectForPdf)
                            : null;

                        return {
                            pageNumber,
                            text,
                            previewRect,
                            pdfRect,
                            createdAt: Date.now(),
                        };
                    });

                if (!selectionItems.length) return;
                setStoredSelections((prev) => [...prev, ...selectionItems]);
            });
        };

        container.addEventListener("mousedown", onMouseDown);
        container.addEventListener("mouseup", onMouseUp);

        return () => {
            container.removeEventListener("mousedown", onMouseDown);
            container.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    useEffect(() => {
        if (containerRef.current === null || viewerRef.current === null) return;

        let cancelled = false;
        let pdfDoc: any = null;

        const eventBus = new EventBus();
        const linkService = new PDFLinkService({ eventBus });
        const findController = new PDFFindController({ eventBus, linkService });

        const viewer = new PDFViewer({
            container: containerRef.current,
            viewer: viewerRef.current,
            eventBus: eventBus,
            linkService: linkService,
            findController: findController,
            textLayerMode: 2,
        });

        pdfViewerRef.current = viewer;
        linkService.setViewer(viewer);

        const loadingTask = pdfjsLib.getDocument(
            typeof activeFile === "string" ? { url: activeFile } : { data: activeFile }
        );

        (async () => {
            try {
                pdfDoc = await loadingTask.promise;
                if (cancelled) return;

                viewer.setDocument(pdfDoc);
                linkService.setDocument(pdfDoc);
                viewer.currentScaleValue = "page-width";
            } catch (err) {
                if (!cancelled) console.error(err);
            }
        })();

        return () => {
            cancelled = true;
            pdfViewerRef.current = null;
            loadingTask.destroy();
            if (pdfDoc) pdfDoc.destroy();
        };
    }, [activeFile]);

    useEffect(() => {
        const viewerRoot = viewerRef.current;
        if (!viewerRoot) return;

        const overlays = viewerRoot.querySelectorAll<HTMLElement>(".mupdf-debug-overlay");
        overlays.forEach((el) => el.remove());

        const byPage = new Map<number, StoredSelection[]>();
        for (const selection of storedSelections) {
            if (!byPage.has(selection.pageNumber)) {
                byPage.set(selection.pageNumber, []);
            }
            byPage.get(selection.pageNumber)!.push(selection);
        }

        byPage.forEach((items: StoredSelection[], pageNumber: number) => {
            const pageEl = viewerRoot.querySelector<HTMLElement>(`.page[data-page-number="${pageNumber}"]`);
            if (!pageEl) return;

            const overlay = document.createElement("div");
            overlay.className = "mupdf-debug-overlay";
            Object.assign(overlay.style, {
                position: "absolute",
                inset: "0px",
                pointerEvents: "none",
                zIndex: "7",
            });

            const pageStyle = window.getComputedStyle(pageEl);
            if (pageStyle.position === "static") {
                pageEl.style.position = "relative";
            }

            for (const item of items) {
                const box = item.previewRect;
                const rectEl = document.createElement("div");
                Object.assign(rectEl.style, {
                    position: "absolute",
                    left: `${box.x}px`,
                    top: `${box.y}px`,
                    width: `${Math.max(1, box.width)}px`,
                    height: `${Math.max(1, box.height)}px`,
                    border: "2px solid #ff1a1a",
                    background: "rgba(255, 26, 26, 0.18)",
                    boxSizing: "border-box",
                });

                overlay.appendChild(rectEl);
            }

            pageEl.appendChild(overlay);
        });
    }, [storedSelections, activeFile]);

    useEffect(() => {
        if (!isWorkerInitialized) return;

        let cancelled = false;

        const toArrayBuffer = async (file: string | Uint8Array | ArrayBuffer): Promise<ArrayBuffer> => {
            if (typeof file === "string") {
                return fetch(file).then((r) => r.arrayBuffer());
            }

            if (file instanceof ArrayBuffer) {
                return file;
            }

            // file is Uint8Array; copy into a new ArrayBuffer
            const copy = new Uint8Array(file.byteLength);
            copy.set(file);
            return copy.buffer;
        };

        const loadIntoMupdf = async () => {
            const bytes = await toArrayBuffer(activeFile);

            if (!cancelled) {
                await loadDocument(bytes);
            }
        };

        loadIntoMupdf().catch(console.error);

        return () => {
            cancelled = true;
        };
    }, [activeFile, isWorkerInitialized, loadDocument]);

    const redact = async () => {
        const targets: RedactionTarget[] = storedSelections
            .filter((s): s is StoredSelection & { pdfRect: PdfRect } => s.pdfRect !== null)
            .map((s) => ({
                pageIndex: s.pageNumber - 1,
                rect: s.pdfRect,
            }));

        if (!targets.length) return;

        setIsRedacting(true);
        try {
            const redactedBytes = await redactPages(targets);
            setActiveFile(new Uint8Array(redactedBytes));
            setStoredSelections([]);
        } finally {
            setIsRedacting(false);
        }
    };

    return (
        <div className="pdf-shell">
            <div className="pdf-toolbar">
                <button className="btn-secondary" onClick={() => setActiveFile("")} disabled={isRedacting}>
                    Upload New PDF
                </button>
                <button className="btn-primary" onClick={redact} disabled={isRedacting || !storedSelections.length}>
                    {isRedacting ? "Applying..." : "Apply Redactions"}
                </button>
                <button className="btn-ghost" onClick={() => setStoredSelections(storedSelections.slice(0, -1))} disabled={isRedacting || !storedSelections.length}>
                    Undo Selection
                </button>
                <button className="btn-danger" onClick={() => setStoredSelections([])} disabled={isRedacting || !storedSelections.length}>
                    Clear Selections
                </button>
                <button
                    className="btn-theme"
                    onClick={() => setIsDarkMode((v) => !v)}
                    disabled={isRedacting}
                    aria-pressed={isDarkMode}
                >
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                </button>
            </div>

            <div ref={containerRef} className="pdf-container">
                <div ref={viewerRef} className="pdfViewer" />
            </div>
        </div>
    );
}
