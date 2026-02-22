import { useId, useState } from "react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export default function FaqAccordionItem({ title, children }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <article className={`faq-item${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="faq-summary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="faq-summary-text">{title}</span>
        <span className="faq-expand-icon" aria-hidden="true">
          v
        </span>
      </button>
      <div id={panelId} className="faq-panel" hidden={!open}>
        <div className="faq-details">{children}</div>
      </div>
    </article>
  );
}
