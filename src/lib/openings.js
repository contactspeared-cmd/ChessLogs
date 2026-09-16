import { Chess } from 'chess.js';
import ecoOpenings from '../data/ecoOpenings.json';

/** @type {Map<string, { eco: string, name: string, moves: string }> | null} */
let movesIndex = null;

function getMovesIndex() {
  if (movesIndex) return movesIndex;
  movesIndex = new Map();
  for (const opening of ecoOpenings) {
    // Longer / later entries overwrite shorter prefixes with same key
    movesIndex.set(opening.moves, opening);
  }
  return movesIndex;
}

/**
 * Split a full opening title into family + variation.
 * e.g. "Sicilian Defense: Najdorf Variation" → { family, variation }
 */
export function splitOpeningName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { family: null, variation: null };
  }
  const cleaned = fullName.trim();
  const colon = cleaned.indexOf(':');
  if (colon === -1) {
    return { family: cleaned, variation: null };
  }
  const family = cleaned.slice(0, colon).trim();
  const variation = cleaned.slice(colon + 1).trim() || null;
  return { family, variation };
}

/**
 * Normalize a list of SAN moves into the eco index key format.
 */
export function normalizeSanMoves(sans) {
  return (sans || [])
    .map((san) => String(san).replace(/[+#]/g, ''))
    .filter(Boolean)
    .join(' ');
}

/**
 * Find the deepest ECO match for a SAN move sequence.
 */
export function findOpeningByMoves(sans) {
  const index = getMovesIndex();
  const tokens = (sans || []).map((san) => String(san).replace(/[+#]/g, '')).filter(Boolean);

  for (let len = tokens.length; len >= 1; len--) {
    const key = tokens.slice(0, len).join(' ');
    const hit = index.get(key);
    if (hit) {
      const { family, variation } = splitOpeningName(hit.name);
      return {
        eco: hit.eco,
        name: hit.name,
        family,
        variation,
        matchedPlies: len,
        source: 'eco',
      };
    }
  }

  return null;
}

/**
 * Read Opening / ECO / Variation from PGN headers when present.
 */
export function findOpeningFromHeaders(headers = {}) {
  const eco = headers.ECO || headers.Eco || null;
  const openingHeader = headers.Opening || headers.opening || null;
  const variationHeader = headers.Variation || headers.variation || null;

  if (!eco && !openingHeader && !variationHeader) {
    return null;
  }

  const fullName = openingHeader
    || (variationHeader ? variationHeader : null);

  const split = splitOpeningName(fullName || '');
  const family = split.family || openingHeader || null;
  const variation = variationHeader || split.variation || null;
  const name = [family, variation].filter(Boolean).join(': ') || eco;

  return {
    eco: eco || null,
    name,
    family,
    variation,
    matchedPlies: null,
    source: 'pgn',
  };
}

/**
 * Detect opening + variation for a PGN string or SAN list.
 * Prefers PGN headers when they include Opening/ECO; otherwise ECO move lookup.
 */
export function detectOpening(pgnOrMoves) {
  if (!pgnOrMoves) return null;

  if (Array.isArray(pgnOrMoves)) {
    return findOpeningByMoves(pgnOrMoves);
  }

  const pgn = String(pgnOrMoves).trim();
  if (!pgn) return null;

  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const headers = typeof chess.header === 'function' ? chess.header() : {};
    const fromHeaders = findOpeningFromHeaders(headers);

    // Prefer named opening from headers; if only ECO code, still try move lookup for a name
    if (fromHeaders?.name && fromHeaders.source === 'pgn' && (headers.Opening || headers.Variation)) {
      return fromHeaders;
    }

    const sans = chess.history();
    const fromMoves = findOpeningByMoves(sans);

    if (fromMoves && fromHeaders?.eco && !fromMoves.eco) {
      return { ...fromMoves, eco: fromHeaders.eco };
    }
    if (fromMoves) {
      // Keep header ECO if present (often more specific annotation)
      if (fromHeaders?.eco) {
        return { ...fromMoves, eco: fromHeaders.eco, source: 'eco+pgn' };
      }
      return fromMoves;
    }

    return fromHeaders;
  } catch {
    return null;
  }
}

/**
 * Compact display helpers for UI.
 */
export function formatOpeningLabel(opening) {
  if (!opening) return null;
  const eco = opening.eco ? `${opening.eco} · ` : '';
  if (opening.family && opening.variation) {
    return `${eco}${opening.family}: ${opening.variation}`;
  }
  return `${eco}${opening.name || opening.family || 'Unknown Opening'}`;
}

export function openingFieldsFromDetection(opening) {
  if (!opening) {
    return { eco: null, opening: null, variation: null };
  }
  return {
    eco: opening.eco || null,
    opening: opening.family || opening.name || null,
    variation: opening.variation || null,
  };
}
