import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import "@/App.css";

import PDFJsViewer, { ViewerCommand } from "./components/PDFJsViewer";
import AppToolbar from "./components/AppToolbar";
import UploadEmptyState from "./components/UploadEmptyState";
import AppHeader from "./components/AppHeader";

type ViewerFile = string | Uint8Array | ArrayBuffer;
const MOBILE_BREAKPOINT = 700;
const HEADER_HEIGHT = 76;

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
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

  const [activeFile, setActiveFile] = useState<ViewerFile | null>(null);
  const [selectionCount, setSelectionCount] = useState(0);
  const [isRedacting, setIsRedacting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [command, setCommand] = useState<ViewerCommand | null>(null);
  const [toolbarPos, setToolbarPos] = useState({ x: 20, y: HEADER_HEIGHT + 16 });

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

      const liveWidth = Math.ceil(toolbarRef.current?.getBoundingClientRect().width ?? drag.width);
      const liveHeight = Math.ceil(toolbarRef.current?.getBoundingClientRect().height ?? drag.height);
      const minY = HEADER_HEIGHT + 8;
      const maxX = Math.max(8, window.innerWidth - liveWidth - 40);
      const maxY = Math.max(minY, window.innerHeight - liveHeight - 16);

      setToolbarPos({
        x: Math.min(maxX, Math.max(8, rawX)),
        y: Math.min(maxY, Math.max(minY, rawY)),
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

    const measuredWidth = Math.ceil(toolbarRef.current?.getBoundingClientRect().width ?? 400);
    const measuredHeight = Math.ceil(toolbarRef.current?.getBoundingClientRect().height ?? 56);

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
      const width = Math.ceil(toolbarRef.current?.getBoundingClientRect().width ?? 320);
      const height = Math.ceil(toolbarRef.current?.getBoundingClientRect().height ?? 56);
      const minY = HEADER_HEIGHT + 8;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(minY, window.innerHeight - height - 8);
      setToolbarPos((prev) => ({
        x: Math.min(maxX, Math.max(8, prev.x)),
        y: Math.min(maxY, Math.max(minY, prev.y)),
      }));
    };

    clampToolbarToViewport();
    window.addEventListener("resize", clampToolbarToViewport);
    return () => window.removeEventListener("resize", clampToolbarToViewport);
  }, []);

  return (
    <div className="pdf-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={onFileChange}
        style={{ display: "none" }}
      />
      <AppHeader
        title="TrueLocal Redact"
        tagline="Local-first PDF redaction"
        githubUrl="https://github.com/tsabkuro/TrueLocal"
      />

      {!activeFile ? (
        <UploadEmptyState onPickPdf={onPickPdf} />
      ) : (
        <>
          <AppToolbar
            isDarkMode={isDarkMode}
            isRedacting={isRedacting}
            selectionCount={selectionCount}
            toolbarPos={toolbarPos}
            toolbarRef={toolbarRef}
            onPickPdf={onPickPdf}
            onApply={() => issueCommand("applyRedactions")}
            onUndo={() => issueCommand("undoSelection")}
            onClear={() => issueCommand("clearSelections")}
            onToggleTheme={() => setIsDarkMode((v) => !v)}
            onDragHandlePointerDown={onDragHandlePointerDown}
          />

          <PDFJsViewer
            file={activeFile}
            command={command}
            onSelectionCountChange={setSelectionCount}
            onRedactingChange={setIsRedacting}
            onRedactedFile={setActiveFile}
          />
        </>
      )}
    </div>
  );
}

export default App;
