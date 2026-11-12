import React from 'react';

export function ChessKnightIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M19.5 21a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1 0-1.5h13.5a.75.75 0 0 1 .75.75Zm-1.89-6.39c-.58-1.57-1.74-2.83-3.23-3.61.35-.91.43-1.92.19-2.92a5.55 5.55 0 0 0-1.78-2.97c-.36-.33-.89-.25-1.16.14l-.94 1.34c-.16.23-.42.36-.7.34-.69-.06-1.57-.02-2.34.42-.92.52-1.42 1.44-1.44 2.47 0 .42.12.83.35 1.18.25.38.16.89-.2 1.16l-.88.66c-.34.26-.45.72-.25 1.1.91 1.76 2.39 3.12 4.2 3.86.37.15.65.48.74.87l.45 1.95c.08.35.39.6.75.6h4.5a.75.75 0 0 0 .73-.59l.86-3.83c.12-.55.43-1.03.88-1.37.49-.38.74-.98.66-1.59l-.02-.24Z" />
    </svg>
  );
}

export function ChessCrownIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

export function ChessBoardIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}
