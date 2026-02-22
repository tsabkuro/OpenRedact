/// <reference lib="webworker" />
import * as Comlink from "comlink";
import * as mupdf from "mupdf"
import { PDFDocument } from "mupdf";

export const MUPDF_LOADED = "MUPDF_LOADED";

type PdfRect = [number, number, number, number];
export type RedactionTarget = { pageIndex: number; rect: PdfRect };

export class MupdfWorker {
  private pdfdocument?: mupdf.Document;

  private normalizeRect(rect: PdfRect): PdfRect {
    const [x1, y1, x2, y2] = rect;
    return [
      Math.min(x1, x2),
      Math.min(y1, y2),
      Math.max(x1, x2),
      Math.max(y1, y2),
    ];
  }

  // PDF.js rectangle y-axis is top-down for this pipeline; MuPDF expects bottom-up page coordinates.
  private pdfJsRectToMupdfRect(page: mupdf.PDFPage, rect: PdfRect): PdfRect {
    const [x1, y1, x2, y2] = this.normalizeRect(rect);
    const [, , , pageTop] = page.getBounds();
    return [x1, pageTop - y2, x2, pageTop - y1];
  }

  constructor() {
    this.initializeMupdf();
  }

  private initializeMupdf() {
    try {
      postMessage(MUPDF_LOADED);
    } catch (error) {
      console.error("Failed to initialize MuPDF:", error);
    }
  }

  // ===> Here you can create methods <===
  // ===> that call statics and methods <===
  // ===> from mupdf (in ./node_modules/mupdf/dist/mupdf.js) <===

  loadDocument(document: ArrayBuffer): boolean {

    this.pdfdocument = mupdf.Document.openDocument(
      document,
      "application/pdf"
    ) as PDFDocument;

    return true;
  }

  getPageCount(): number {
    if (!this.pdfdocument) throw new Error("Document not loaded");

    return this.pdfdocument.countPages();
  }

  applyRedactions(targets: RedactionTarget[]): Uint8Array {
    if (!this.pdfdocument) throw new Error("Document not loaded");

    for (const t of targets) {
      const page = (this.pdfdocument as mupdf.PDFDocument).loadPage(t.pageIndex);
      const annot = page.createAnnotation("Redact");
      const mupdfRect = this.pdfJsRectToMupdfRect(page, t.rect);
      annot.setRect(mupdfRect);
    }

    const touched = [...new Set(targets.map((t) => t.pageIndex))];
    for (const idx of touched) {
      const page = (this.pdfdocument as mupdf.PDFDocument).loadPage(idx);
      page.applyRedactions();
    }

    // Export redacted PDF
    const buf = (this.pdfdocument as mupdf.PDFDocument).saveToBuffer().asUint8Array();
    return new Uint8Array(buf);
  }
}

Comlink.expose(new MupdfWorker());
