import { ChessGame, ChesscomStats } from './types';
import { INITIAL_DEMO_GAMES } from './initialData';

const USER_AGENT = 'ChessLogs-SJSFI-App/1.0 (Coach to Student Chess Platform; contact: coach@sjsfi.edu.ph)';

export async function fetchChesscomPlayer(username: string) {
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // 5 min cache
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Chess.com error: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.warn(`Failed to fetch chess.com user ${username}:`, error);
    return null;
  }
}

export async function fetchChesscomStats(username: string): Promise<ChesscomStats | null> {
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn(`Failed to fetch stats for ${username}:`, error);
    return null;
  }
}

export async function fetchChesscomRecentGames(username: string, limit: number = 15): Promise<ChessGame[]> {
  try {
    const cleanUser = username.toLowerCase().trim();
    // 1. Get archives
    const archiveRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}/games/archives`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      next: { revalidate: 180 },
    });

    if (!archiveRes.ok) {
      // Return demo games matched or default demo games
      return INITIAL_DEMO_GAMES;
    }

    const archiveData = await archiveRes.json();
    const archives: string[] = archiveData.archives || [];

    if (archives.length === 0) {
      return INITIAL_DEMO_GAMES;
    }

    // Get the latest archive (most recent month)
    const latestArchiveUrl = archives[archives.length - 1];
    const gamesRes = await fetch(latestArchiveUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      next: { revalidate: 180 },
    });

    if (!gamesRes.ok) {
      return INITIAL_DEMO_GAMES;
    }

    const gamesData = await gamesRes.json();
    const games = (gamesData.games || []).slice(-limit).reverse();

    if (games.length === 0 && archives.length > 1) {
      // Check previous month if latest has 0 games
      const prevUrl = archives[archives.length - 2];
      const prevRes = await fetch(prevUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (prevRes.ok) {
        const prevData = await prevRes.json();
        const prevGames = (prevData.games || []).slice(-limit).reverse();
        if (prevGames.length > 0) {
          return formatChesscomGames(prevGames, cleanUser);
        }
      }
    }

    return formatChesscomGames(games, cleanUser);
  } catch (error) {
    console.error(`Error fetching games for ${username}:`, error);
    return INITIAL_DEMO_GAMES;
  }
}

function formatChesscomGames(rawGames: any[], currentUsername: string): ChessGame[] {
  return rawGames.map((g: any, index: number) => {
    // Extract opening name from PGN header if available
    let opening = 'Standard Game';
    if (g.pgn) {
      const ecoMatch = g.pgn.match(/\[ECOUrl\s+"https:\/\/www\.chess\.com\/openings\/([^"]+)"\]/);
      if (ecoMatch && ecoMatch[1]) {
        opening = ecoMatch[1].replace(/-/g, ' ');
      } else {
        const eventMatch = g.pgn.match(/\[ECO\s+"([^"]+)"\]/);
        if (eventMatch && eventMatch[1]) {
          opening = `ECO ${eventMatch[1]}`;
        }
      }
    }

    const id = g.url ? g.url.split('/').pop() || `game-${index}` : `game-${index}-${Date.now()}`;

    return {
      id,
      url: g.url || '#',
      pgn: g.pgn || '',
      time_control: g.time_control || '600',
      end_time: g.end_time || Math.floor(Date.now() / 1000),
      rated: g.rated ?? true,
      time_class: g.time_class || 'rapid',
      rules: g.rules || 'chess',
      white: {
        username: g.white?.username || 'White',
        rating: g.white?.rating || 1500,
        result: g.white?.result || 'unknown',
      },
      black: {
        username: g.black?.username || 'Black',
        rating: g.black?.rating || 1500,
        result: g.black?.result || 'unknown',
      },
      accuracies: g.accuracies ? {
        white: g.accuracies.white,
        black: g.accuracies.black,
      } : undefined,
      opening,
      coachReviewed: false,
    };
  });
}
