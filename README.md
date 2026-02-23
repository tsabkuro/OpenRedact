# Open Redact

Open Redact is a privacy-first PDF redaction app that runs entirely in the browser.
Users can upload a PDF, select text regions, apply permanent redactions, and download the result without sending files to a backend service.
Try it out at [OpenRedact.com](https://www.openredact.com/)

## Why Open Redact

- Local-first: Redaction is done client-side in the browser.
- Private by design: No account, no upload pipeline, no server-side PDF processing.
- Open source: Source code is public and auditable.
- Fast UX: Built with React + Vite, PDF.js rendering, and MuPDF processing in a Web Worker.

## Features

- Upload a PDF from local disk
- Select text regions visually
- Apply redactions to selected regions
- Download redacted PDF

## Tech Stack

- React 18
- TypeScript
- Vite
- PDF.js (`pdfjs-dist`) for viewing and text-layer selection
- MuPDF (`mupdf`) in a Web Worker for applying redactions
- Comlink for worker communication

## Project Structure

- `src/App.tsx`: App shell, file flow, toolbar commands
- `src/components/PDFJsViewer.tsx`: PDF rendering, selection capture, redaction orchestration
- `src/workers/mupdf.worker.ts`: MuPDF worker API (`loadDocument`, `applyRedactions`)
- `src/hooks/useMupdf.hook.ts`: Worker lifecycle + typed calls
- `src/lib/pdfjs.ts`: PDF.js worker wiring

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Start dev server

```bash
npm run dev
```

### Build production bundle

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

### What this app does

- Processes PDFs in-browser on the user's device.
- Uses browser memory + CPU only for document redaction.

## License

- Project: AGPL v3 (see `License.md` and `NOTICE-AGPL.txt`)
- Dependency note: MuPDF is available under AGPL v3 or commercial licensing from Artifex. Review obligations before redistribution/deployment.

## Credits

Created by Tim Sabanshi.
