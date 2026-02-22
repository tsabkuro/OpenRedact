type Props = {
  onPickPdf: () => void;
};

export default function UploadEmptyState({ onPickPdf }: Props) {
  return (
    <div className="upload-empty-state">
      <div className="upload-empty-card">
        <h1>Upload File</h1>
        <p>Select a PDF to start reviewing and applying redactions.</p>
        <button className="btn-primary upload-empty-button" onClick={onPickPdf}>
          Upload File
        </button>
      </div>
    </div>
  );
}
