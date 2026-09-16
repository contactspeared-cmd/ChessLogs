/**
 * Live Chess.com sync smoke test → upserts into games for a student.
 *
 * Usage:
 *   node --env-file=.env scripts/smoke_chesscom_sync.js [chesscom_username] [student_email]
 *
 * Defaults: hikaru + ADMIN_EMAIL (creates/uses that auth user as the student_id owner for the test).
 * Prefer a dedicated student email once seeded.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const username = (process.argv[2] || 'hikaru').toLowerCase();
const studentEmail = process.argv[3] || process.env.ADMIN_EMAIL;

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!studentEmail) {
  console.error('Provide student email arg or ADMIN_EMAIL in .env');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const headers = { 'User-Agent': 'ChessLogs-Improvement-Platform/1.0' };

function mapResult(usernameClean, game) {
  const white = game.white?.username?.toLowerCase();
  const black = game.black?.username?.toLowerCase();
  const youAreWhite = white === usernameClean;
  const you = youAreWhite ? game.white : game.black;
  const resultRaw = (you?.result || '').toLowerCase();
  if (['win', 'checkmated', 'timeout', 'resigned', 'abandoned'].includes(resultRaw)) {
    if (resultRaw === 'win') return 'win';
    return 'loss';
  }
  if (['agreed', 'stalemate', 'repetition', 'insufficient', 'timevsinsufficient', '50move'].includes(resultRaw)) {
    return 'draw';
  }
  return resultRaw || 'unknown';
}

async function main() {
  const { data: usersData, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  const user = usersData.users.find((u) => u.email?.toLowerCase() === studentEmail.toLowerCase());
  if (!user) {
    throw new Error(`No auth user for ${studentEmail}. Seed admin or create a student first.`);
  }

  const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`, { headers });
  if (!archivesRes.ok) throw new Error(`archives HTTP ${archivesRes.status}`);
  const archives = (await archivesRes.json()).archives || [];
  if (!archives.length) throw new Error('No archives for username');
  const latest = archives[archives.length - 1];
  const gamesRes = await fetch(latest, { headers });
  if (!gamesRes.ok) throw new Error(`games HTTP ${gamesRes.status}`);
  const games = (await gamesRes.json()).games || [];

  const rows = games.slice(0, 25).map((g) => ({
    student_id: user.id,
    chesscom_game_id: String(g.uuid || g.url || `${g.end_time}`),
    pgn: g.pgn || '*',
    time_class: g.time_class || null,
    result: mapResult(username, g),
    white_username: g.white?.username || null,
    black_username: g.black?.username || null,
    white_rating: g.white?.rating || null,
    black_rating: g.black?.rating || null,
    url: g.url || null,
    played_at: g.end_time ? new Date(g.end_time * 1000).toISOString() : null,
    synced_at: new Date().toISOString(),
  }));

  const { data, error } = await admin
    .from('games')
    .upsert(rows, { onConflict: 'student_id,chesscom_game_id' })
    .select('id, chesscom_game_id, time_class, result');
  if (error) throw error;

  console.log(
    JSON.stringify(
      {
        ok: true,
        username,
        archive: latest,
        fetched: games.length,
        upserted: data.length,
        sample: data.slice(0, 3),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('FAIL', err.message || err);
  process.exit(1);
});
