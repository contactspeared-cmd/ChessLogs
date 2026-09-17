import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { getEngineInstance } from '../lib/engine';
import { ENGINE_CONFIG } from '../config/engine';
import { insertVariationIntoPgn, uciPvToSans } from '../lib/pgnVariations';
import { Sparkles, Loader2 } from 'lucide-react';

/**
 * B.8.1 — Admin tool: pick a mainline ply, fetch MultiPV alternatives, insert as PGN variation.
 */
export default function EngineVariationTools({ pgn, onPgnChange }) {
  const [selectedPly, setSelectedPly] = useState(0);
  const [alts, setAlts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parsed = useMemo(() => {
    if (!pgn?.trim()) return { history: [], startFen: null, ok: false };
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      const headers = typeof chess.header === 'function' ? chess.header() : {};
      return {
        history: chess.history({ verbose: true }),
        startFen: headers?.FEN || null,
        ok: true,
      };
    } catch {
      return { history: [], startFen: null, ok: false };
    }
  }, [pgn]);

  useEffect(() => {
    setAlts([]);
    setError(null);
    if (parsed.history.length === 0) {
      setSelectedPly(0);
      return;
    }
    setSelectedPly((prev) => Math.min(prev, parsed.history.length - 1));
  }, [parsed.history.length]);

  const fenBeforeSelected = useMemo(() => {
    if (!parsed.ok || !parsed.history[selectedPly]) return null;
    const board = new Chess();
    if (parsed.startFen) {
      try {
        board.load(parsed.startFen);
      } catch {
        board.reset();
      }
    }
    for (let i = 0; i < selectedPly; i++) {
      board.move(parsed.history[i]);
    }
    return board.fen();
  }, [parsed, selectedPly]);

  const mainlineUci = parsed.history[selectedPly]
    ? `${parsed.history[selectedPly].from}${parsed.history[selectedPly].to}${
        parsed.history[selectedPly].promotion || ''
      }`
    : null;

  const fetchAlternatives = async () => {
    if (!fenBeforeSelected || !mainlineUci) return;
    setLoading(true);
    setError(null);
    setAlts([]);
    try {
      const engine = getEngineInstance();
      const info = await engine.evaluatePosition(fenBeforeSelected, {
        depth: Math.max(12, ENGINE_CONFIG.deepAnalysis.depth - 6),
        movetime: 900,
        multiPv: 3,
      });

      const lines = (info.lines || []).length
        ? info.lines
        : info.bestMove
          ? [{ bestMove: info.bestMove, pv: info.pv || [info.bestMove], scoreCp: info.scoreCp }]
          : [];

      const suggestions = lines
        .map((line) => {
          const pv = line.pv?.length ? line.pv : line.bestMove ? [line.bestMove] : [];
          if (!pv.length) return null;
          if (pv[0] === mainlineUci) return null;
          const sans = uciPvToSans(fenBeforeSelected, pv, 8);
          if (!sans.length) return null;
          return {
            firstSan: sans[0],
            sans,
            scoreCp: line.scoreCp,
            isMate: line.isMate,
            mateIn: line.mateIn,
          };
        })
        .filter(Boolean);

      setAlts(suggestions);
      if (suggestions.length === 0) {
        setError('No alternate engine lines found (mainline may already be best).');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Engine evaluation failed');
    } finally {
      setLoading(false);
    }
  };

  const insertAlt = (alt) => {
    const next = insertVariationIntoPgn(pgn, selectedPly, alt.sans);
    onPgnChange(next);
    setAlts([]);
  };

  if (!pgn?.trim()) {
    return (
      <p className="text-[11px] text-slate-500">
        Add a chapter PGN first to insert engine variations.
      </p>
    );
  }

  if (!parsed.ok || parsed.history.length === 0) {
    return (
      <p className="text-[11px] text-rose-400">Could not parse chapter PGN for variations.</p>
    );
  }

  return (
    <div className="space-y-2 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Engine variations
        </p>
        <button
          type="button"
          onClick={fetchAlternatives}
          disabled={loading || !fenBeforeSelected}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-semibold border border-cyan-500/25 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Suggest at selected move
        </button>
      </div>

      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
        {parsed.history.map((move, idx) => {
          const label =
            move.color === 'w'
              ? `${Math.floor(idx / 2) + 1}. ${move.san}`
              : `${Math.floor(idx / 2) + 1}... ${move.san}`;
          const selected = idx === selectedPly;
          return (
            <button
              key={`${idx}-${move.san}`}
              type="button"
              onClick={() => {
                setSelectedPly(idx);
                setAlts([]);
                setError(null);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                selected
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && <p className="text-[11px] text-amber-300/90">{error}</p>}

      {alts.length > 0 && (
        <ul className="space-y-1.5">
          {alts.map((alt) => (
            <li
              key={alt.sans.join('-')}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-mono text-white truncate">
                  {alt.sans.join(' ')}
                </p>
                <p className="text-[10px] text-slate-500">
                  {alt.isMate
                    ? `Mate in ${Math.abs(alt.mateIn || 0)}`
                    : typeof alt.scoreCp === 'number'
                      ? `${alt.scoreCp > 0 ? '+' : ''}${(alt.scoreCp / 100).toFixed(1)}`
                      : 'eval n/a'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => insertAlt(alt)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-[11px] font-bold"
              >
                Insert
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
