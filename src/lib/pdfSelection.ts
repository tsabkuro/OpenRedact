import type { PDFViewer } from "pdfjs-dist/web/pdf_viewer.mjs";

export type CssPageRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfRect = [number, number, number, number];

function normalizeRect([x1, y1, x2, y2]: [number, number, number, number]): PdfRect {
  return [
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.max(x1, x2),
    Math.max(y1, y2),
  ];
}

export function cssRectToPdfRect(pageView: any, rect: CssPageRect): PdfRect {
  const [x1, y1] = pageView.viewport.convertToPdfPoint(rect.x, rect.y);
  const [x2, y2] = pageView.viewport.convertToPdfPoint(
    rect.x + rect.width,
    rect.y + rect.height
  );

  return normalizeRect([x1, y1, x2, y2]);
}

export function toPdfRectFromSelection(
  viewer: PDFViewer,
  pageNumber: number, // 1-based
  rect: CssPageRect
): PdfRect | null {
  const pageView = viewer.getPageView(pageNumber - 1);
  if (!pageView || !pageView.viewport) return null;
  return cssRectToPdfRect(pageView, rect);
}

