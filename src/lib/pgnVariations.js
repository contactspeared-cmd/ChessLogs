import { Chess } from 'chess.js';

/**
 * Format a variation SAN sequence from a starting FEN (PGN parenthesis body).
 */
export function formatVariationSans(fenBefore, sans = []) {
  const board = new Chess(fenBefore);
  const parts = [];

  for (const san of sans) {
    const turn = board.turn();
    const moveNumber = board.moveNumber();
    let move;
    try {
      move = board.move(san);
    } catch {
      move = null;
    }
    if (!move) break;

    if (turn === 'w') {
      parts.push(`${moveNumber}. ${move.san}`);
    } else if (parts.length === 0) {
      parts.push(`${moveNumber}... ${move.san}`);
    } else {
      parts.push(move.san);
    }
  }

  return parts.join(' ');
}

/**
 * Insert an engine variation as an alternative to the mainline move at plyIndex0.
 * Returns updated PGN text (headers preserved when present).
 */
export function insertVariationIntoPgn(pgn, plyIndex0, variationSans) {
  if (!pgn || !variationSans?.length) return pgn;

  const parser = new Chess();
  try {
    parser.loadPgn(pgn);
  } catch {
    return pgn;
  }

  const headers =
    typeof parser.header === 'function' ? { ...parser.header() } : {};
  const history = parser.history({ verbose: true });
  if (plyIndex0 < 0 || plyIndex0 >= history.length) return pgn;

  const startFen = headers.FEN || null;
  const board = new Chess();
  if (startFen) {
    try {
      board.load(startFen);
    } catch {
      board.reset();
    }
  }

  let body = '';
  for (let i = 0; i < history.length; i++) {
    const fenBefore = board.fen();
    const turn = board.turn();
    const moveNumber = board.moveNumber();
    const move = board.move(history[i]);
    if (!move) break;

    if (turn === 'w') {
      body += `${moveNumber}. ${move.san}`;
    } else if (i === 0) {
      body += `${moveNumber}... ${move.san}`;
    } else {
      body += ` ${move.san}`;
    }

    if (i === plyIndex0) {
      const varText = formatVariationSans(fenBefore, variationSans);
      if (varText) {
        body += ` (${varText})`;
      }
    }

    if (turn === 'w') body += ' ';
    else body += ' ';
  }

  body = `${body.trim()} *`;

  const headerLines = Object.entries(headers)
    .filter(([k, v]) => k && v != null && String(v).length > 0)
    .map(([k, v]) => `[${k} "${v}"]`);

  return headerLines.length ? `${headerLines.join('\n')}\n\n${body}` : body;
}

/**
 * Convert a UCI PV (list of uci strings) into SAN moves from fenBefore.
 */
export function uciPvToSans(fenBefore, uciMoves = [], maxPlies = 6) {
  const board = new Chess(fenBefore);
  const sans = [];
  for (const uci of uciMoves.slice(0, maxPlies)) {
    if (!uci || uci.length < 4) break;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    let move;
    try {
      move = board.move({ from, to, promotion });
    } catch {
      move = null;
    }
    if (!move) break;
    sans.push(move.san);
  }
  return sans;
}
