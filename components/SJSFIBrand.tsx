import React from 'react';

interface SJSFIBrandProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export default function SJSFIBrand({ size = 'md', showSubtitle = true }: SJSFIBrandProps) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center gap-3">
      {/* SJSFI Crest Emblem */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-sjsfi-900 via-sjsfi-850 to-sjsfi-950 flex items-center justify-center shadow-md border border-sjsfi-700/50 relative overflow-hidden group shrink-0`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:6px_6px] opacity-20"></div>
        {/* Chess Knight with Laurel / SJSFI Shield */}
        <svg
          viewBox="0 0 24 24"
          className="w-3/5 h-3/5 text-white fill-current drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
        >
          <path d="M19 22H5a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1zm-3.3-7.5c-.8.6-1.7 1-2.7 1.2V17h-2v-1.3c-1-.2-1.9-.6-2.7-1.2-1.2-.9-2-2.3-2.3-3.8-.4-1.8.1-3.6 1.4-4.8.4-.4.9-.7 1.4-.9.2-.5.5-.9.9-1.3.8-.8 1.9-1.2 3.1-1.2.6 0 1.2.1 1.7.4.2.1.3.3.3.5v.3c.4-.2.8-.3 1.2-.3 1.1 0 2.2.4 3 1.2.8.8 1.3 1.9 1.3 3.1 0 1.2-.4 2.3-1.2 3.1-.3.3-.6.6-1 .8.2 1.6-.3 3.3-1.4 4.5zm-5.7-9.5c-.6 0-1.1.2-1.6.6-.2.2-.4.4-.5.7 1-.1 2 .2 2.8.7l.3.2V5.4c-.3-.2-.7-.4-1-.4zm4 0c-.3 0-.7.1-1 .3v1.8l.3-.2c.8-.5 1.8-.8 2.8-.7-.1-.3-.3-.5-.5-.7-.5-.4-1-.5-1.6-.5z" />
        </svg>
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-sjsfi-gold rounded-full border border-white"></div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold tracking-tight text-gray-900 ${textSizes[size]}`}>
            Chess<span className="text-sjsfi-900">Logs</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-sjsfi-100 text-sjsfi-900 border border-sjsfi-200">
            SJSFI
          </span>
        </div>
        {showSubtitle && (
          <span className="text-xs text-gray-500 font-medium tracking-tight">
            Saint Joseph School Foundation • Zamboanga City
          </span>
        )}
      </div>
    </div>
  );
}
