import { Chess } from 'chess.js';
import ecoOpenings from '../data/ecoOpenings.json';

let movesIndex = null;
let ecoIndex = null;

function getMovesIndex() {
  if (movesIndex) return movesIndex;
  movesIndex = new Map();
  for (const opening of ecoOpenings) {
    movesIndex.set(opening.moves, opening);
  }
  return movesIndex;
}

export function getEcoIndex() {
  if (ecoIndex) return ecoIndex;
  ecoIndex = new Map();
  for (const op of ecoOpenings) {
    if (op.eco && !ecoIndex.has(op.eco)) {
      ecoIndex.set(op.eco.toUpperCase(), op.name);
    }
  }
  return ecoIndex;
}

export function getOpeningNameByEco(eco) {
  if (!eco) return null;
  const clean = String(eco).trim().toUpperCase();
  return getEcoIndex().get(clean) || null;
}

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

export function normalizeSanMoves(sans) {
  return (sans || [])
    .map((san) => String(san).replace(/[+#]/g, ''))
    .filter(Boolean)
    .join(' ');
}

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

export function findOpeningFromHeaders(headers = {}) {
  const eco = headers.ECO || headers.Eco || headers.eco || null;
  const openingHeader = headers.Opening || headers.opening || null;
  const variationHeader = headers.Variation || headers.variation || null;
  const ecoUrl = headers.ECOUrl || headers.EcoUrl || headers.ECOURL || headers.ecourl || null;

  let derivedFamily = openingHeader;
  let derivedVariation = variationHeader;

  if (!derivedFamily && ecoUrl) {
    try {
      const slug = ecoUrl.split('/').filter(Boolean).pop() || '';
      const words = slug.split('-').filter(Boolean);
      const varIndex = words.findIndex((w) => w.toLowerCase() === 'variation');
      if (varIndex > 0) {
        derivedFamily = words.slice(0, varIndex - 1).join(' ');
        derivedVariation = words.slice(varIndex - 1).join(' ');
      } else {
        derivedFamily = words.join(' ');
      }
    } catch {}
  }

  if (!derivedFamily && eco) {
    const fallbackName = getOpeningNameByEco(eco);
    if (fallbackName) {
      const split = splitOpeningName(fallbackName);
      derivedFamily = split.family;
      derivedVariation = derivedVariation || split.variation;
    }
  }

  if (!eco && !derivedFamily && !derivedVariation) {
    return null;
  }

  const name = [derivedFamily, derivedVariation].filter(Boolean).join(': ') || derivedFamily || eco;

  return {
    eco: eco || null,
    name,
    family: derivedFamily,
    variation: derivedVariation,
    matchedPlies: null,
    source: 'pgn',
  };
}

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

    const sans = chess.history();
    const fromMoves = findOpeningByMoves(sans);

    if (fromMoves) {
      const finalEco = fromMoves.eco || fromHeaders?.eco || null;
      return {
        ...fromMoves,
        eco: finalEco,
        source: fromHeaders?.eco ? 'eco+pgn' : 'eco',
      };
    }

    if (fromHeaders?.eco && (!fromHeaders.family || fromHeaders.family === fromHeaders.eco)) {
      const fallback = getOpeningNameByEco(fromHeaders.eco);
      if (fallback) {
        const split = splitOpeningName(fallback);
        return {
          ...fromHeaders,
          name: fallback,
          family: split.family,
          variation: fromHeaders.variation || split.variation,
        };
      }
    }

    return fromHeaders;
  } catch {
    return null;
  }
}

export function formatOpeningLabel(opening) {
  if (!opening) return null;
  const ecoCode = opening.eco ? String(opening.eco).trim() : '';
  let openingName = opening.family || opening.name || '';
  if (!openingName || openingName === ecoCode) {
    if (ecoCode) {
      openingName = getOpeningNameByEco(ecoCode) || '';
    }
  }
  if (opening.variation && !openingName.includes(opening.variation)) {
    openingName = openingName ? `${openingName}: ${opening.variation}` : opening.variation;
  }
  if (ecoCode && openingName && openingName !== ecoCode) {
    return `${ecoCode} · ${openingName}`;
  }
  return openingName || ecoCode || 'Unknown Opening';
}

export function openingFieldsFromDetection(opening) {
  if (!opening) {
    return { eco: null, opening: null, variation: null };
  }
  const eco = opening.eco || null;
  let opName = opening.family || opening.name || null;
  if (!opName || opName === eco) {
    if (eco) {
      opName = getOpeningNameByEco(eco);
    }
  }
  return {
    eco,
    opening: opName,
    variation: opening.variation || null,
  };
}
