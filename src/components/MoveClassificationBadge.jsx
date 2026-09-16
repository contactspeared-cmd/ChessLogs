import { CLASSIFICATIONS } from '../config/engine';

export default function MoveClassificationBadge({ classificationId, size = 'md' }) {
  if (!classificationId) return null;

  const key = classificationId.toUpperCase();
  const info = CLASSIFICATIONS[key] || CLASSIFICATIONS.BOOK;

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-xs'
    : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${info.bg} ${sizeClasses} shadow-sm`}
      title={info.description}
    >
      <span className="font-mono font-bold">{info.symbol}</span>
      <span>{info.label}</span>
    </span>
  );
}
