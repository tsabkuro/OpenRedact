import { useEffect, useRef, useState } from "react";

import { pdfjsLib } from "@/lib/pdfjs";
import { PdfRect, toPdfRectFromSelection } from "@/lib/pdfSelection";

import {
  EventBus,
  PDFViewer,
  PDFLinkService,
  PDFFindController,
} from "pdfjs-dist/web/pdf_viewer.mjs";
import "pdfjs-dist/web/pdf_viewer.css";


type StoredSelection = {
  pageNumber: number; // 1-based
  text: string;
  rect: { x: number; y: number; width: number; height: number };
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

    const [storedSelections, setStoredSelections] = useState<StoredSelection[]>([]);

    useEffect(() => {
        console.log("All stored selections:", storedSelections);
    }, [storedSelections]);

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

                // One bounding box for the entire selection.
                const r = range.getBoundingClientRect();
                const pageBox = pageEl.getBoundingClientRect();

                const rect = {
                    x: r.left - pageBox.left,
                    y: r.top - pageBox.top,
                    width: r.width,
                    height: r.height,
                };

                const pdfRect = pdfViewerRef.current
                    ? toPdfRectFromSelection(pdfViewerRef.current, pageNumber, rect)
                    : null;

                const selectionData: StoredSelection = {
                    pageNumber,
                    text,
                    rect,
                    pdfRect,
                    createdAt: Date.now(),
                };

                console.log("Selection captured:", selectionData);
                setStoredSelections((prev) => [...prev, selectionData]);
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
            typeof file === "string" ? { url: file } : { data: file }
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
    }, [file]);

    return (
        <div className="pdf-shell">
            <div ref={containerRef} className="pdf-container">
                <div ref={viewerRef} className="pdfViewer" />
            </div>
        </div>
    )
}