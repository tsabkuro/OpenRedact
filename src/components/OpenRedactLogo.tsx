// Copyright (C) 2026 Tim Sabanshi
// Full AGPL notice: see NOTICE-AGPL.txt
type Props = {
  className?: string;
};

export default function OpenRedactLogo({ className }: Props) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="154"
      height="28"
      viewBox="0 0 154 28"
      role="img"
      aria-label="Open Redact"
    >
      <g transform="translate(-799 -483)">
        <g transform="translate(863 483)" fill="none">
          <path d="M0,0H90V28H0Z" stroke="none" />
          <path
            d="M 4 4 L 4 24 L 86 24 L 86 4 L 4 4 M 0 0 L 90 0 L 90 28 L 0 28 L 0 0 Z"
            stroke="none"
            fill="#000"
          />
        </g>
        <text
          transform="translate(799 505)"
          fill="#828282"
          fontSize="24"
          fontFamily="Arial-BoldMT, Arial"
          fontWeight="700"
        >
          <tspan x="0" y="0" fill="#000">
            Open
          </tspan>
          <tspan y="0" fill="#fff">
            {" "}
          </tspan>
          <tspan y="0" fill="#828282">
            Redact
          </tspan>
        </text>
      </g>
    </svg>
  );
}
