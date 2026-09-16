import { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import {
  X,
  Upload,
  Scissors,
  MessageSquare,
  Star,
  StarOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a PGN string and return a flat array of move objects */
function parsePgn(pgnText) {
  try {
    const chess = new Chess();
    chess.loadPgn(pgnText.trim());
    const verbose = chess.history({ verbose: true });
    if (!verbose.length) return { moves: [], error: 'No moves found in PGN.' };

    // Rebuild FEN at each ply
    const moves = [];
    const replay = new Chess();
    for (let i = 0; i < verbose.length; i++) {
      const m = verbose[i];
      replay.move(m);
      moves.push({
        ply: i + 1,          // 1-indexed
        san: m.san,
        from: m.from,
        to: m.to,
        color: m.color,      // 'w' | 'b'
        moveNumber: Math.ceil((i + 1) / 2),
        fenAfter: replay.fen(),
        // annotation defaults
        isKeyMove: false,
        comment: '',
      });
    }

    // Extract PGN headers for metadata
    const headers = chess.header();
    return { moves, headers, error: null };
  } catch (err) {
    return { moves: [], headers: {}, error: err?.message || 'Invalid PGN.' };
  }
}

/** Build a chapter-sliced PGN from a subset of the full move list */
function buildChapterPgn(allMoves, fromPly, toPly) {
  // fromPly and toPly are 1-indexed, inclusive
  const chess = new Chess();
  const subset = allMoves.slice(fromPly - 1, toPly);
  for (const m of subset) {
    chess.move({ from: m.from, to: m.to, promotion: 'q' });
  }
  // Append result terminator
  return chess.pgn() + (chess.pgn().endsWith('*') ? '' : ' *');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MoveChip({ move, isKeyMove, onClick, isChapterStart, isChapterEnd }) {
  const label =
    move.color === 'w'
      ? `${move.moveNumber}. ${move.san}`
      : move.san;

  return (
    <button
      type="button"
      onClick={onClick}
      title={isKeyMove ? 'Key move – click to toggle' : 'Click to toggle key move'}
      className={`
        relative inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-all
        ${isKeyMove
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/30'
          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white'}
        ${isChapterStart ? 'ml-3 border-l-2 border-l-emerald-500' : ''}
      `}
    >
      {isKeyMove && <Star className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Wizard
// ---------------------------------------------------------------------------

export default function PgnImportWizard({ onConfirm, onClose }) {
  // Step 1: paste PGN
  const [pgnInput, setPgnInput] = useState('');
  const [parseError, setParseError] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'divide' | 'annotate'

  // Parsed data
  const [allMoves, setAllMoves] = useState([]); // full flat move list
  const [pgnHeaders, setPgnHeaders] = useState({});

  // Chapter split points: array of ply numbers where a new chapter STARTS (first chapter always starts at ply 1)
  const [splitPoints, setSplitPoints] = useState([1]);

  // Per-move annotations: { [ply]: { isKeyMove, comment } }
  const [annotations, setAnnotations] = useState({});

  // Per-chapter metadata: { [chapterIndex]: { title, description } }
  const [chapterMeta, setChapterMeta] = useState({});

  // Which chapter is expanded in the annotate step
  const [expandedChapter, setExpandedChapter] = useState(0);

  // ------------------------------------------------------------------
  // Step 1: Parse PGN
  // ------------------------------------------------------------------
  const handleParse = () => {
    setParseError('');
    const { moves, headers, error } = parsePgn(pgnInput);
    if (error || !moves.length) {
      setParseError(error || 'No moves found.');
      return;
    }
    setAllMoves(moves);
    setPgnHeaders(headers || {});
    setSplitPoints([1]);
    setAnnotations({});

    // Pre-fill first chapter title from PGN headers
    const defaultTitle =
      headers?.White && headers?.Black
        ? `${headers.White} vs ${headers.Black}`
        : 'Chapter 1';
    setChapterMeta({ 0: { title: defaultTitle, description: '' } });
    setStep('divide');
  };

  // ------------------------------------------------------------------
  // Step 2: Divide into chapters
  // ------------------------------------------------------------------

  // Compute ordered unique split points (always starts with 1)
  const orderedSplits = useMemo(
    () => [...new Set([1, ...splitPoints])].sort((a, b) => a - b),
    [splitPoints]
  );

  // Chapters: array of { startPly, endPly }
  const chapters = useMemo(() => {
    return orderedSplits.map((startPly, i) => ({
      startPly,
      endPly: orderedSplits[i + 1] ? orderedSplits[i + 1] - 1 : allMoves.length,
    }));
  }, [orderedSplits, allMoves.length]);

  const toggleSplitAt = (ply) => {
    if (ply === 1) return; // can't remove first split
    setSplitPoints((prev) =>
      prev.includes(ply) ? prev.filter((p) => p !== ply) : [...prev, ply]
    );
  };

  // ------------------------------------------------------------------
  // Step 3: Annotate
  // ------------------------------------------------------------------

  const toggleKeyMove = (ply) => {
    setAnnotations((prev) => ({
      ...prev,
      [ply]: { ...prev[ply], isKeyMove: !prev[ply]?.isKeyMove },
    }));
  };

  const setMoveComment = (ply, comment) => {
    setAnnotations((prev) => ({
      ...prev,
      [ply]: { ...prev[ply], comment },
    }));
  };

  const setChapterTitle = (idx, title) => {
    setChapterMeta((prev) => ({ ...prev, [idx]: { ...prev[idx], title } }));
  };

  const setChapterDesc = (idx, description) => {
    setChapterMeta((prev) => ({ ...prev, [idx]: { ...prev[idx], description } }));
  };

  // ------------------------------------------------------------------
  // Confirm: build chapters array for saveCourse
  // ------------------------------------------------------------------
  const handleConfirm = () => {
    const result = chapters.map((ch, idx) => {
      const meta = chapterMeta[idx] || {};
      const chMoves = allMoves.slice(ch.startPly - 1, ch.endPly);

      // Build annotations array: only moves with isKeyMove = true
      const chAnnotations = chMoves
        .filter((m) => annotations[m.ply]?.isKeyMove)
        .map((m) => ({
          ply: m.ply - ch.startPly + 1, // relative ply within chapter
          keyMove: m.san,
          comment: annotations[m.ply]?.comment?.trim() || '',
        }));

      const pgn = buildChapterPgn(allMoves, ch.startPly, ch.endPly);

      return {
        title: meta.title?.trim() || `Chapter ${idx + 1}`,
        description: meta.description?.trim() || '',
        video_url: '',
        pgn,
        annotations: chAnnotations,
      };
    });

    onConfirm(result);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Upload className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">PGN Game Import Wizard</h2>
              <p className="text-[11px] text-slate-400">
                Import a game, divide it into chapters, and annotate key moves
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mr-6">
            {['input', 'divide', 'annotate'].map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    step === s
                      ? 'bg-emerald-600 text-white'
                      : ['divide', 'annotate'].indexOf(s) <=
                        ['divide', 'annotate'].indexOf(step)
                      ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 2 && <div className="w-4 h-px bg-slate-700" />}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ============================================================
              STEP 1: Paste PGN
              ============================================================ */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Paste PGN</h3>
                <p className="text-xs text-slate-400">
                  Paste the full PGN of the game you want to turn into a course. You can
                  export from Chess.com, Lichess, or any database.
                </p>
              </div>
              <textarea
                rows={12}
                value={pgnInput}
                onChange={(e) => { setPgnInput(e.target.value); setParseError(''); }}
                placeholder={`[Event "Example"]\n[White "Player1"]\n[Black "Player2"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 *`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 resize-y"
                spellCheck={false}
              />
              {parseError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              STEP 2: Divide into chapters
              ============================================================ */}
          {step === 'divide' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Divide Game into Chapters
                </h3>
                <p className="text-xs text-slate-400">
                  Click a move to set it as the <strong className="text-emerald-400">start of a new chapter</strong>. 
                  Click again to remove that split. Chapter boundaries are shown in{' '}
                  <span className="text-emerald-400">green</span>.
                </p>
              </div>

              {/* Move grid */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
                {allMoves.map((move) => {
                  const isSplit = orderedSplits.includes(move.ply) && move.ply !== 1;
                  const isFirst = move.ply === 1;
                  return (
                    <button
                      key={move.ply}
                      type="button"
                      onClick={() => toggleSplitAt(move.ply)}
                      title={
                        isFirst
                          ? 'First chapter always starts here'
                          : isSplit
                          ? 'Chapter starts here — click to remove split'
                          : 'Click to start a new chapter here'
                      }
                      className={`
                        inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-all border
                        ${isFirst
                          ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700 cursor-default'
                          : isSplit
                          ? 'bg-emerald-600/25 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/50 hover:text-white'}
                      `}
                    >
                      {isSplit && <Scissors className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
                      {move.color === 'w' ? `${move.moveNumber}. ${move.san}` : move.san}
                    </button>
                  );
                })}
              </div>

              {/* Chapter preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Chapter Preview ({chapters.length} chapters)
                </h4>
                <div className="space-y-1.5">
                  {chapters.map((ch, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                    >
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded shrink-0">
                        Ch {i + 1}
                      </span>
                      <span className="text-slate-300 font-mono">
                        Plies {ch.startPly}–{ch.endPly}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">
                        {ch.endPly - ch.startPly + 1} moves
                      </span>
                      <span className="text-slate-500 ml-auto font-mono text-[10px]">
                        {allMoves[ch.startPly - 1]?.color === 'w'
                          ? `${allMoves[ch.startPly - 1].moveNumber}.`
                          : `${allMoves[ch.startPly - 1]?.moveNumber}...`}{' '}
                        {allMoves[ch.startPly - 1]?.san}
                        {' → '}
                        {allMoves[ch.endPly - 1]?.san}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              STEP 3: Annotate chapters & moves
              ============================================================ */}
          {step === 'annotate' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Annotate Chapters &amp; Key Moves
                </h3>
                <p className="text-xs text-slate-400">
                  Set a title and description for each chapter. Click the{' '}
                  <Star className="inline w-3 h-3 text-amber-400" /> next to any move
                  to mark it as a <strong className="text-amber-300">key move</strong>{' '}
                  students must play, then add coaching commentary.
                </p>
              </div>

              {chapters.map((ch, chIdx) => {
                const meta = chapterMeta[chIdx] || {};
                const chMoves = allMoves.slice(ch.startPly - 1, ch.endPly);
                const keyMoveCount = chMoves.filter((m) => annotations[m.ply]?.isKeyMove).length;
                const isExpanded = expandedChapter === chIdx;

                return (
                  <div
                    key={chIdx}
                    className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden"
                  >
                    {/* Chapter header */}
                    <button
                      type="button"
                      onClick={() => setExpandedChapter(isExpanded ? -1 : chIdx)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-900/60 transition-colors text-left gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded shrink-0">
                          Ch {chIdx + 1}
                        </span>
                        <span className="text-sm font-semibold text-white truncate">
                          {meta.title || `Chapter ${chIdx + 1}`}
                        </span>
                        {keyMoveCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded shrink-0">
                            <Star className="w-2.5 h-2.5" />
                            {keyMoveCount} key
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {chMoves.length} moves
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-slate-800">
                        {/* Chapter metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold uppercase text-slate-400">
                              Chapter Title
                            </label>
                            <input
                              type="text"
                              value={meta.title || ''}
                              onChange={(e) => setChapterTitle(chIdx, e.target.value)}
                              placeholder={`Chapter ${chIdx + 1}: Opening Theme`}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold uppercase text-slate-400">
                              Chapter Description (optional)
                            </label>
                            <input
                              type="text"
                              value={meta.description || ''}
                              onChange={(e) => setChapterDesc(chIdx, e.target.value)}
                              placeholder="What concept does this chapter teach?"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        {/* Move annotation list */}
                        <div>
                          <h5 className="text-[11px] font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            Moves in this chapter — click{' '}
                            <Star className="w-3 h-3 text-amber-400 inline" /> to mark as key
                          </h5>
                          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                            {chMoves.map((move) => {
                              const anno = annotations[move.ply] || {};
                              return (
                                <div
                                  key={move.ply}
                                  className={`rounded-xl border transition-all ${
                                    anno.isKeyMove
                                      ? 'border-amber-500/40 bg-amber-500/5'
                                      : 'border-slate-800 bg-slate-900/40'
                                  }`}
                                >
                                  {/* Move row */}
                                  <div className="flex items-center gap-2 px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleKeyMove(move.ply)}
                                      title="Toggle key move"
                                      className={`shrink-0 p-1 rounded transition-colors ${
                                        anno.isKeyMove
                                          ? 'text-amber-400 hover:text-amber-300'
                                          : 'text-slate-600 hover:text-amber-400'
                                      }`}
                                    >
                                      {anno.isKeyMove ? (
                                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                                      ) : (
                                        <StarOff className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    <span className="font-mono text-xs font-semibold text-slate-300 w-20 shrink-0">
                                      {move.color === 'w'
                                        ? `${move.moveNumber}. ${move.san}`
                                        : `${move.moveNumber}… ${move.san}`}
                                    </span>

                                    <span className="text-[10px] text-slate-600 font-mono flex-1">
                                      ply {move.ply}
                                    </span>

                                    {anno.isKeyMove && (
                                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide shrink-0">
                                        Key Move
                                      </span>
                                    )}
                                  </div>

                                  {/* Comment input — only visible when key move */}
                                  {anno.isKeyMove && (
                                    <div className="px-3 pb-2.5 flex items-center gap-2">
                                      <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                      <input
                                        type="text"
                                        value={anno.comment || ''}
                                        onChange={(e) =>
                                          setMoveComment(move.ply, e.target.value)
                                        }
                                        placeholder="Coach commentary shown after student plays this move…"
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            {step === 'divide' && (
              <span>
                {allMoves.length} moves parsed •{' '}
                {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
              </span>
            )}
            {step === 'annotate' && (
              <span>
                {Object.values(annotations).filter((a) => a.isKeyMove).length} key move
                {Object.values(annotations).filter((a) => a.isKeyMove).length !== 1 ? 's' : ''} annotated
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step !== 'input' && (
              <button
                type="button"
                onClick={() =>
                  setStep(step === 'annotate' ? 'divide' : 'input')
                }
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                ← Back
              </button>
            )}

            {step === 'input' && (
              <button
                type="button"
                onClick={handleParse}
                disabled={!pgnInput.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Parse PGN →
              </button>
            )}

            {step === 'divide' && (
              <button
                type="button"
                onClick={() => {
                  // Pre-fill chapter meta if missing
                  chapters.forEach((_, i) => {
                    if (!chapterMeta[i]) {
                      setChapterMeta((prev) => ({
                        ...prev,
                        [i]: { title: `Chapter ${i + 1}`, description: '' },
                      }));
                    }
                  });
                  setExpandedChapter(0);
                  setStep('annotate');
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
              >
                Annotate Moves →
              </button>
            )}

            {step === 'annotate' && (
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                Import {chapters.length} Chapter{chapters.length !== 1 ? 's' : ''} into Course
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
