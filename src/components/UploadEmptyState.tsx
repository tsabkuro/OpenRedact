// Copyright (C) 2026 Tim Sabanshi
// Full AGPL notice: see NOTICE-AGPL.txt
import TrustFaq from "./TrustFaq";

type Props = {
  onPickPdf: () => void;
  githubUrl: string;
};

export default function UploadEmptyState({ onPickPdf, githubUrl }: Props) {
  return (
    <div className="upload-empty-state">
      <div className="upload-empty-card">
        <p className="upload-empty-eyebrow">Private. Fast. Open source.</p>
        <h1>Redact Sensitive PDFs Without Uploading Them Anywhere</h1>
        <p className="upload-empty-subtext">
          Open Redact runs directly in your browser, so your documents stay on your machine.
          No cloud transfer, no account wall, no hidden paywall.
        </p>
        <button className="btn-primary upload-empty-button" onClick={onPickPdf}>
          Upload PDF
        </button>
        <p className="upload-empty-footnote">
          Start in seconds. Works entirely in-browser.
        </p>
        <TrustFaq githubUrl={githubUrl} />
      </div>
    </div>
  );
}
