import { GripVertical } from "lucide-react";

import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

type Props = {
  isDarkMode: boolean;
  isRedacting: boolean;
  selectionCount: number;
  toolbarPos: { x: number; y: number };
  toolbarRef: RefObject<HTMLDivElement | null>;
  onPickPdf: () => void;
  onApply: () => void;
  onUndo: () => void;
  onClear: () => void;
  onToggleTheme: () => void;
  onDragHandlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export default function AppToolbar({
  isDarkMode,
  isRedacting,
  selectionCount,
  toolbarPos,
  toolbarRef,
  onPickPdf,
  onApply,
  onUndo,
  onClear,
  onToggleTheme,
  onDragHandlePointerDown,
}: Props) {
  return (
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

      <button className="btn-secondary" onClick={onPickPdf} disabled={isRedacting}>
        Upload New PDF
      </button>
      <button
        className="btn-primary"
        onClick={onApply}
        disabled={isRedacting || selectionCount === 0}
      >
        {isRedacting ? (
          <span className="btn-loading">
            <span className="btn-spinner" aria-hidden="true" />
            Applying...
          </span>
        ) : (
          "Apply Redactions"
        )}
      </button>
      <button
        className="btn-ghost"
        onClick={onUndo}
        disabled={isRedacting || selectionCount === 0}
      >
        Undo Selection
      </button>
      <button
        className="btn-danger"
        onClick={onClear}
        disabled={isRedacting || selectionCount === 0}
      >
        Clear Selections
      </button>
      <button
        className="btn-theme"
        onClick={onToggleTheme}
        disabled={isRedacting}
        aria-pressed={isDarkMode}
      >
        {isDarkMode ? "Light Mode" : "Dark Mode"}
      </button>
    </div>
  );
}
