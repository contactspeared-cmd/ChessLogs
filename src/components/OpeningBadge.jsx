import { BookOpen } from 'lucide-react';
import { formatOpeningLabel } from '../lib/openings';

export default function OpeningBadge({
  eco,
  opening,
  variation,
  name,
  size = 'md',
  className = '',
}) {
  const label = formatOpeningLabel(
    name
      ? { eco, name, family: opening, variation }
      : {
          eco,
          family: opening,
          variation,
          name: [opening, variation].filter(Boolean).join(': ') || null,
        }
  );

  if (!label) return null;

  const sizing =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <div
      className={`inline-flex items-center max-w-full rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-medium ${sizing} ${className}`}
      title={label}
    >
      <BookOpen className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span className="truncate">{label}</span>
    </div>
  );
}
