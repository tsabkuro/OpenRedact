import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import "@/App.css";
import { GripVertical } from "lucide-react";

import PDFJsViewer, { ViewerCommand } from "./components/PDFJsViewer";

type ViewerFile = string | Uint8Array | ArrayBuffer;
const MOBILE_BREAKPOINT = 700;

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const commandNonceRef = useRef(0);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
  } | null>(null);

  const [activeFile, setActiveFile] = useState<ViewerFile>("/test.pdf");
  const [selectionCount, setSelectionCount] = useState(0);
  const [isRedacting, setIsRedacting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [command, setCommand] = useState<ViewerCommand | null>(null);
  const [toolbarPos, setToolbarPos] = useState({ x: 20, y: 20 });

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

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const rawX = drag.originX + dx;
      const rawY = drag.originY + dy;

      const maxX = Math.max(8, window.innerWidth - drag.width - 8);
      const maxY = Math.max(8, window.innerHeight - drag.height - 8);

      setToolbarPos({
        x: Math.min(maxX, Math.max(8, rawX)),
        y: Math.min(maxY, Math.max(8, rawY)),
      });
    };

    const onPointerUp = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      dragStateRef.current = null;
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const onDragHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (window.innerWidth <= MOBILE_BREAKPOINT) return;

    const measuredWidth = toolbarRef.current?.scrollWidth ?? toolbarRef.current?.offsetWidth ?? 400;
    const measuredHeight = toolbarRef.current?.offsetHeight ?? 56;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: toolbarPos.x,
      originY: toolbarPos.y,
      width: measuredWidth,
      height: measuredHeight,
    };
    document.body.style.userSelect = "none";
    event.preventDefault();
  };

  useEffect(() => {
    const clampToolbarToViewport = () => {
      if (window.innerWidth <= MOBILE_BREAKPOINT) return;
      const width = toolbarRef.current?.scrollWidth ?? toolbarRef.current?.offsetWidth ?? 320;
      const height = toolbarRef.current?.offsetHeight ?? 56;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(8, window.innerHeight - height - 8);
      setToolbarPos((prev) => ({
        x: Math.min(maxX, Math.max(8, prev.x)),
        y: Math.min(maxY, Math.max(8, prev.y)),
      }));
    };

    clampToolbarToViewport();
    window.addEventListener("resize", clampToolbarToViewport);
    return () => window.removeEventListener("resize", clampToolbarToViewport);
  }, []);

  return (
    <div className="pdf-shell">
      <div
        ref={toolbarRef}
        className="pdf-toolbar"
        style={{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px` }}
      >
        <div
          className="toolbar-handle"
          onPointerDown={onDragHandlePointerDown}
          title="Drag toolbar"
          aria-label="Drag toolbar"
        >
          <GripVertical className="toolbar-handle-icon" size={16} strokeWidth={2.1} aria-hidden="true" />
        </div>
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
