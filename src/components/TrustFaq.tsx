// Copyright (C) 2026 Tim Sabanshi
// Full AGPL notice: see NOTICE-AGPL.txt
import FaqAccordionItem from "./FaqAccordionItem";

type Props = {
  githubUrl: string;
};

export default function TrustFaq({ githubUrl }: Props) {
  return (
    <section className="trust-faq" aria-label="Privacy and licensing information">
      <div className="trust-badges">
        <span>100% Local Processing</span>
        <span>Free to Use</span>
        <span>Open Source Code</span>
      </div>

      <FaqAccordionItem title="Where does my file go when I upload it?">
        It stays in your browser session on your device. Redaction and export happen locally, and
        this app flow does not upload your PDF to our servers.
      </FaqAccordionItem>

      <FaqAccordionItem title="Can I verify that claim myself?">
        Yes. The full source is public and reviewable:{" "}
        <a href={githubUrl} target="_blank" rel="noreferrer">
          {githubUrl}
        </a>
        .
      </FaqAccordionItem>

      <FaqAccordionItem title="What about licensing and AGPL?">
        Open Redact uses MuPDF.js. MuPDF is available under AGPL v3 or a commercial license. If
        you deploy or distribute derivative work, review AGPL obligations:{" "}
        <a href="https://artifex.com/licensing/gnu-agpl-v3" target="_blank" rel="noreferrer">
          GNU AGPL v3 licensing terms
        </a>
        .
      </FaqAccordionItem>
    </section>
  );
}
