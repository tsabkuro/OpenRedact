import { FaGithub } from "react-icons/fa";


type Props = {
  title: string;
  tagline: string;
  githubUrl: string;
};

export default function AppHeader({ title, tagline, githubUrl }: Props) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <h1>{title}</h1>
        <p>{tagline}</p>
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
