import { FaGithub } from "react-icons/fa";
import OpenRedactLogo from "./OpenRedactLogo";


type Props = {
  githubUrl: string;
};

export default function AppHeader({ githubUrl }: Props) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <OpenRedactLogo className="app-header-logo" />
      </div>
      <a
        className="app-header-link"
        href={githubUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Open source on GitHub"
      >
        <FaGithub size={26} aria-hidden="true" />
      </a>
    </header>
  );
}
