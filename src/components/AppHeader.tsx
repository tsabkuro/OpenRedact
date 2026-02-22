// Copyright (C) 2026 Tim Sabanshi
// Full AGPL notice: see NOTICE-AGPL.txt
import { FaGithub, FaRegLightbulb } from "react-icons/fa";
import OpenRedactLogo from "./OpenRedactLogo";


type Props = {
  githubUrl: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onGoHome: () => void;
};

export default function AppHeader({
  githubUrl,
  isDarkMode,
  onToggleTheme,
  onGoHome,
}: Props) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <button
          type="button"
          className="app-header-home"
          onClick={onGoHome}
          aria-label="Go to start page"
        >
          <OpenRedactLogo className="app-header-logo" />
        </button>
      </div>
      <div className="app-header-actions">
        <button
          type="button"
          className={`app-header-theme${isDarkMode ? " is-active" : ""}`}
          onClick={onToggleTheme}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={isDarkMode}
        >
          <FaRegLightbulb size={22} aria-hidden="true" />
        </button>
        <a
          className="app-header-link"
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open source on GitHub"
        >
          <FaGithub size={26} aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
