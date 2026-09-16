import { APP_CONFIG } from '../config/engine';
import {
  detectOpening,
  findOpeningFromHeaders,
  openingFieldsFromDetection,
} from './openings';

const BASE_URL = APP_CONFIG.chesscomPublicApiBase;
const ARCHIVE_CONCURRENCY = 4;

function chesscomHeaders() {
  return { 'User-Agent': 'ChessLogs-Improvement-Platform/1.0' };
}

/**
 * Fetch public profile for a Chess.com user
 * @param {string} username
 */
export async function fetchChesscomProfile(username) {
  if (!username) return null;
  const cleanUsername = username.trim().toLowerCase();
  try {
    const res = await fetch(`${BASE_URL}/player/${cleanUsername}`, {
      headers: chesscomHeaders(),
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Chess.com username "${cleanUsername}" was not found.`);
      }
      throw new Error(`Chess.com API returned HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching Chess.com profile:', error);
    throw error;
  }
}

/**
 * Fetch player ratings and statistics across bullet, blitz, rapid, daily
 * @param {string} username
 */
export async function fetchChesscomStats(username) {
  if (!username) return null;
  const cleanUsername = username.trim().toLowerCase();
  try {
    const res = await fetch(`${BASE_URL}/player/${cleanUsername}/stats`, {
      headers: chesscomHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch stats for ${cleanUsername}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching Chess.com stats:', error);
    return null;
  }
}

/**
 * List all monthly archive URLs for a player (all-time).
 */
export async function fetchChesscomArchiveUrls(username) {
  if (!username) return [];
  const cleanUsername = username.trim().toLowerCase();
  const res = await fetch(`${BASE_URL}/player/${cleanUsername}/games/archives`, {
    headers: chesscomHeaders(),
  });

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch Chess.com archives: ${res.statusText}`);
  }

  const data = await res.json();
  return data.archives || [];
}

/**
 * Fetch games for a specific month (or latest available month)
 * @param {string} username
 * @param {number} [year]
 * @param {number|string} [month]
 */
export async function fetchChesscomMonthlyGames(username, year, month) {
  if (!username) return [];
  const cleanUsername = username.trim().toLowerCase();

  let targetYear = year;
  let targetMonth = month;

  // If year/month not provided, fetch archives list and use the latest
  if (!targetYear || !targetMonth) {
    try {
      const archives = await fetchChesscomArchiveUrls(cleanUsername);
      if (archives.length > 0) {
        const latestArchiveUrl = archives[archives.length - 1];
        const parts = latestArchiveUrl.split('/');
        targetYear = parts[parts.length - 2];
        targetMonth = parts[parts.length - 1];
      }
    } catch (e) {
      console.warn('Could not fetch archives, defaulting to current date', e);
    }
  }

  // Fallback to current date if archives empty
  if (!targetYear || !targetMonth) {
    const now = new Date();
    targetYear = now.getFullYear();
    targetMonth = String(now.getMonth() + 1).padStart(2, '0');
  } else {
    targetMonth = String(targetMonth).padStart(2, '0');
  }

  const endpoint = `${BASE_URL}/player/${cleanUsername}/games/${targetYear}/${targetMonth}`;

  try {
    const res = await fetch(endpoint, {
      headers: chesscomHeaders(),
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`Failed to fetch games: ${res.statusText}`);
    }

    const data = await res.json();
    return data.games || [];
  } catch (error) {
    console.error('Error fetching monthly games:', error);
    throw error;
  }
}

async function fetchGamesFromArchiveUrl(archiveUrl) {
  const res = await fetch(archiveUrl, { headers: chesscomHeaders() });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch archive ${archiveUrl}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.games || [];
}

/**
 * Fetch ALL games across every monthly archive for a player.
 * @param {string} username
 * @param {Function} [onProgress] ({ completed, total, gameCount })
 * @returns {Promise<Object[]>} raw Chess.com game objects, newest first, deduped
 */
export async function fetchChesscomAllGames(username, onProgress = null) {
  if (!username) return [];
  const cleanUsername = username.trim().toLowerCase();
  const archives = await fetchChesscomArchiveUrls(cleanUsername);

  if (archives.length === 0) {
    if (onProgress) onProgress({ completed: 0, total: 0, gameCount: 0 });
    return [];
  }

  const allGames = [];
  let completed = 0;

  // Pull archives newest-first so progress feels responsive
  const ordered = [...archives].reverse();

  for (let i = 0; i < ordered.length; i += ARCHIVE_CONCURRENCY) {
    const batch = ordered.slice(i, i + ARCHIVE_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (url) => {
        try {
          return await fetchGamesFromArchiveUrl(url);
        } catch (err) {
          console.warn('Skipping Chess.com archive after error:', url, err);
          return [];
        }
      })
    );

    for (const games of results) {
      allGames.push(...games);
      completed += 1;
      if (onProgress) {
        onProgress({
          completed: Math.min(completed, ordered.length),
          total: ordered.length,
          gameCount: allGames.length,
        });
      }
    }
  }

  // Deduplicate by URL / uuid / end_time
  const seen = new Set();
  const unique = [];
  for (const game of allGames) {
    const key =
      game.url ||
      game.uuid ||
      `${game.end_time}-${game.white?.username}-${game.black?.username}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(game);
  }

  unique.sort((a, b) => (b.end_time || 0) - (a.end_time || 0));
  return unique;
}

/** Fast Opening/ECO extraction from PGN tags (no full ECO move walk). */
function detectOpeningFromPgnTags(pgn) {
  if (!pgn) return null;
  const headers = {};
  const re = /\[(\w+)\s+"([^"]*)"\]/g;
  let match;
  while ((match = re.exec(pgn))) {
    headers[match[1]] = match[2];
  }
  return findOpeningFromHeaders(headers);
}

/**
 * Parses raw Chess.com game object into our standardized schema
 * @param {Object} rawGame
 * @param {string} studentUsername
 * @param {string} studentId
 * @param {{ fullOpeningDetect?: boolean }} [options]
 */
export function formatChesscomGame(rawGame, studentUsername, studentId, options = {}) {
  const cleanStudent = studentUsername.toLowerCase();
  const isWhite = rawGame.white?.username?.toLowerCase() === cleanStudent;
  const userSide = isWhite ? rawGame.white : rawGame.black;
  const opponentSide = isWhite ? rawGame.black : rawGame.white;

  let result = 'draw';
  if (userSide?.result === 'win') {
    result = 'win';
  } else if (opponentSide?.result === 'win') {
    result = 'loss';
  }

  const playedAt = rawGame.end_time
    ? new Date(rawGame.end_time * 1000).toISOString()
    : new Date().toISOString();

  // Extract game id from URL e.g. https://www.chess.com/game/live/123456789
  const match = rawGame.url?.match(/\/(\d+)$/);
  const chesscomGameId = match ? match[1] : (rawGame.uuid || String(rawGame.end_time));

  const pgn = rawGame.pgn || '';
  const detected = options.fullOpeningDetect
    ? detectOpening(pgn)
    : detectOpeningFromPgnTags(pgn);
  const openingInfo = openingFieldsFromDetection(detected);

  return {
    student_id: studentId,
    chesscom_game_id: chesscomGameId,
    pgn,
    time_class: rawGame.time_class || 'rapid',
    result,
    white_username: rawGame.white?.username || 'White',
    black_username: rawGame.black?.username || 'Black',
    white_rating: rawGame.white?.rating || 1200,
    black_rating: rawGame.black?.rating || 1200,
    url: rawGame.url || '',
    played_at: playedAt,
    synced_at: new Date().toISOString(),
    eco: openingInfo.eco,
    opening: openingInfo.opening,
    variation: openingInfo.variation,
  };
}

/**
 * Generates a verification token for bio verification (Constraint 1)
 */
export function generateVerificationCode(username) {
  const hash = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CHESSLOGS-${username.substring(0, 3).toUpperCase()}-${hash}`;
}
