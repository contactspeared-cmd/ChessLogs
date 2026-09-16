import { APP_CONFIG } from '../config/engine';

const BASE_URL = APP_CONFIG.chesscomPublicApiBase;

/**
 * Fetch public profile for a Chess.com user
 * @param {string} username
 */
export async function fetchChesscomProfile(username) {
  if (!username) return null;
  const cleanUsername = username.trim().toLowerCase();
  try {
    const res = await fetch(`${BASE_URL}/player/${cleanUsername}`, {
      headers: {
        'User-Agent': 'ChessLogs-Improvement-Platform/1.0',
      },
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
      headers: {
        'User-Agent': 'ChessLogs-Improvement-Platform/1.0',
      },
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
      const archivesRes = await fetch(`${BASE_URL}/player/${cleanUsername}/games/archives`, {
        headers: { 'User-Agent': 'ChessLogs-Improvement-Platform/1.0' },
      });
      if (archivesRes.ok) {
        const archivesData = await archivesRes.json();
        const archives = archivesData.archives || [];
        if (archives.length > 0) {
          const latestArchiveUrl = archives[archives.length - 1];
          const parts = latestArchiveUrl.split('/');
          targetYear = parts[parts.length - 2];
          targetMonth = parts[parts.length - 1];
        }
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
      headers: { 'User-Agent': 'ChessLogs-Improvement-Platform/1.0' },
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

/**
 * Parses raw Chess.com game object into our standardized schema
 * @param {Object} rawGame
 * @param {string} studentUsername
 * @param {string} studentId
 */
export function formatChesscomGame(rawGame, studentUsername, studentId) {
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

  return {
    student_id: studentId,
    chesscom_game_id: chesscomGameId,
    pgn: rawGame.pgn || '',
    time_class: rawGame.time_class || 'rapid',
    result,
    white_username: rawGame.white?.username || 'White',
    black_username: rawGame.black?.username || 'Black',
    white_rating: rawGame.white?.rating || 1200,
    black_rating: rawGame.black?.rating || 1200,
    url: rawGame.url || '',
    played_at: playedAt,
    synced_at: new Date().toISOString(),
  };
}

/**
 * Generates a verification token for bio verification (Constraint 1)
 */
export function generateVerificationCode(username) {
  const hash = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CHESSLOGS-${username.substring(0, 3).toUpperCase()}-${hash}`;
}
