export default function EvalBar({ scoreCp = 0, isMate = false, mateIn = null, orientation = 'white' }) {
  // Convert centipawns or mate into a 0 - 100 percentage for the white portion of the bar
  let whitePercent = 50;
  let label = '0.0';

  if (isMate) {
    if (mateIn > 0) {
      whitePercent = 100;
      label = `M${mateIn}`;
    } else {
      whitePercent = 0;
      label = `-M${Math.abs(mateIn || 1)}`;
    }
  } else {
    // Sigmoid mapping centered at 0
    // +500 cp -> ~90%, -500 cp -> ~10%
    const clipped = Math.max(-1200, Math.min(1200, scoreCp));
    whitePercent = 50 + 50 * (2 / (1 + Math.exp(-0.0035 * clipped)) - 1);
    whitePercent = Math.max(4, Math.min(96, whitePercent));

    const evalInPawns = (scoreCp / 100).toFixed(1);
    label = scoreCp > 0 ? `+${evalInPawns}` : evalInPawns;
  }

  // If orientation is black, flip the bar display
  const topPercent = orientation === 'white' ? (100 - whitePercent) : whitePercent;

  return (
    <div className="relative w-7 h-full min-h-[320px] bg-slate-900 rounded-md overflow-hidden flex flex-col border border-slate-700 select-none shadow-inner">
      {/* Black's share (dark grey/black) */}
      <div
        className="w-full bg-[#272522] transition-all duration-300 ease-out"
        style={{ height: `${topPercent}%` }}
      />

      {/* White's share (off-white) */}
      <div
        className="w-full bg-[#f1f1f1] transition-all duration-300 ease-out"
        style={{ height: `${100 - topPercent}%` }}
      />

      {/* Evaluation label overlay */}
      <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none">
        <span
          className={`text-[10px] font-mono font-bold px-1 py-0.5 rounded shadow-sm ${
            whitePercent >= 50
              ? 'bg-black/70 text-white'
              : 'bg-white/80 text-black'
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
