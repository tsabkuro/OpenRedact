import { ChangeEvent, useEffect, useRef, useState } from "react";
import "@/App.css";

import PDFJsViewer, { ViewerCommand } from "./components/PDFJsViewer";

type ViewerFile = string | Uint8Array | ArrayBuffer;

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commandNonceRef = useRef(0);

  const [activeFile, setActiveFile] = useState<ViewerFile>("/test.pdf");
  const [selectionCount, setSelectionCount] = useState(0);
  const [isRedacting, setIsRedacting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [command, setCommand] = useState<ViewerCommand | null>(null);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", isDarkMode);
    return () => {
      document.body.classList.remove("theme-dark");
    };
  }, [isDarkMode]);

  const issueCommand = (type: ViewerCommand["type"]) => {
    commandNonceRef.current += 1;
    setCommand({ type, nonce: commandNonceRef.current });
  };

  const onPickPdf = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;

    const bytes = new Uint8Array(await picked.arrayBuffer());
    setActiveFile(bytes);
    event.target.value = "";
  };

  return (
    <div className="pdf-shell">
      <div className="pdf-toolbar">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          style={{ display: "none" }}
        />

        <button className="btn-secondary" onClick={onPickPdf} disabled={isRedacting}>
          Upload New PDF
        </button>
        <button
          className="btn-primary"
          onClick={() => issueCommand("applyRedactions")}
          disabled={isRedacting || selectionCount === 0}
        >
          {isRedacting ? "Applying..." : "Apply Redactions"}
        </button>
        <button
          className="btn-ghost"
          onClick={() => issueCommand("undoSelection")}
          disabled={isRedacting || selectionCount === 0}
        >
          Undo Selection
        </button>
        <button
          className="btn-danger"
          onClick={() => issueCommand("clearSelections")}
          disabled={isRedacting || selectionCount === 0}
        >
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

      <PDFJsViewer
        file={activeFile}
        command={command}
        onSelectionCountChange={setSelectionCount}
        onRedactingChange={setIsRedacting}
        onRedactedFile={setActiveFile}
      />
    </div>
  );
}

export default App;
