import { useCallback, useEffect, useRef, useState } from "react";

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

export type ViewerCommand =
  | { type: "applyRedactions"; nonce: number }
  | { type: "undoSelection"; nonce: number }
  | { type: "clearSelections"; nonce: number };

type Props = {
  file: string | Uint8Array | ArrayBuffer;
  command?: ViewerCommand | null;
  onSelectionCountChange?: (count: number) => void;
  onRedactingChange?: (isRedacting: boolean) => void;
  onRedactedFile?: (file: Uint8Array) => void;
};

export default function PDFJsViewer({
  file,
  command,
  onSelectionCountChange,
  onRedactingChange,
  onRedactedFile,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const pdfViewerRef = useRef<PDFViewer | null>(null);
  const isMouseDown = useRef(false);
  const [storedSelections, setStoredSelections] = useState<StoredSelection[]>([]);
  const [isRedacting, setIsRedacting] = useState(false);

  const { isWorkerInitialized, redactPages, loadDocument } = useMupdf();

  useEffect(() => {
    setStoredSelections([]);
  }, [file]);

  useEffect(() => {
    onSelectionCountChange?.(storedSelections.length);
  }, [storedSelections.length, onSelectionCountChange]);

  useEffect(() => {
    onRedactingChange?.(isRedacting);
  }, [isRedacting, onRedactingChange]);

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

  useEffect(() => {
    const viewerRoot = viewerRef.current;
    if (!viewerRoot) return;

    const overlays = viewerRoot.querySelectorAll<HTMLElement>(".selection-preview-overlay");
    overlays.forEach((el) => el.remove());

    const byPage = new Map<number, StoredSelection[]>();
    for (const selection of storedSelections) {
      if (!byPage.has(selection.pageNumber)) {
        byPage.set(selection.pageNumber, []);
      }
      byPage.get(selection.pageNumber)!.push(selection);
    }

    byPage.forEach((items: StoredSelection[], pageNumber: number) => {
      const pageEl = viewerRoot.querySelector<HTMLElement>(
        `.page[data-page-number="${pageNumber}"]`
      );
      if (!pageEl) return;

      const overlay = document.createElement("div");
      overlay.className = "selection-preview-overlay";
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
  }, [storedSelections, file]);

  useEffect(() => {
    if (!isWorkerInitialized) return;

    let cancelled = false;

    const toArrayBuffer = async (
      sourceFile: string | Uint8Array | ArrayBuffer
    ): Promise<ArrayBuffer> => {
      if (typeof sourceFile === "string") {
        return fetch(sourceFile).then((r) => r.arrayBuffer());
      }

      if (sourceFile instanceof ArrayBuffer) {
        return sourceFile;
      }

      const copy = new Uint8Array(sourceFile.byteLength);
      copy.set(sourceFile);
      return copy.buffer;
    };

    const loadIntoMupdf = async () => {
      const bytes = await toArrayBuffer(file);
      if (!cancelled) {
        await loadDocument(bytes);
      }
    };

    loadIntoMupdf().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [file, isWorkerInitialized, loadDocument]);

  const applyRedactions = useCallback(async () => {
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
      onRedactedFile?.(new Uint8Array(redactedBytes));
      setStoredSelections([]);
    } finally {
      setIsRedacting(false);
    }
  }, [storedSelections, redactPages, onRedactedFile]);

  const undoSelection = useCallback(() => {
    setStoredSelections((prev) => prev.slice(0, -1));
  }, []);

  const clearSelections = useCallback(() => {
    setStoredSelections([]);
  }, []);

  useEffect(() => {
    if (!command) return;

    if (command.type === "applyRedactions") {
      applyRedactions().catch(console.error);
      return;
    }

    if (command.type === "undoSelection") {
      undoSelection();
      return;
    }

    if (command.type === "clearSelections") {
      clearSelections();
    }
  }, [command?.nonce]);

  return (
    <div ref={containerRef} className="pdf-container">
      <div ref={viewerRef} className="pdfViewer" />
    </div>
  );
}
