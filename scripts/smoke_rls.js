/**
 * Smoke-test RLS: student A must not read student B's games/profile.
 *
 * Requires .env with VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (service role creates users; anon key exercises RLS as each student).
 *
 * Usage: node --env-file=.env scripts/smoke_rls.js
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const password = 'SmokeTestPass123!';

async function createStudent(label) {
  const email = `smoke-${label}-${stamp}@chesslogs.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Smoke ${label}`, role: 'student' },
  });
  if (error) throw error;

  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    role: 'student',
    display_name: `Smoke ${label}`,
  });
  if (profileError) throw profileError;

  return { id: data.user.id, email };
}

async function clientAs(email) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function main() {
  console.log('Creating two student accounts...');
  const studentA = await createStudent('a');
  const studentB = await createStudent('b');

  // Seed a game owned by B (service role bypasses RLS)
  const { data: gameB, error: gameErr } = await admin
    .from('games')
    .insert({
      student_id: studentB.id,
      chesscom_game_id: `smoke-${stamp}`,
      pgn: '[Event "Smoke"]\n\n1. e4 e5 *',
      time_class: 'blitz',
      result: 'win',
      white_username: 'smoke-b',
      black_username: 'opponent',
      played_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (gameErr) throw gameErr;

  const clientA = await clientAs(studentA.email);
  const clientB = await clientAs(studentB.email);

  const { data: aOwnProfile } = await clientA.from('profiles').select('id').eq('id', studentA.id);
  const { data: aSeesBProfile } = await clientA.from('profiles').select('id').eq('id', studentB.id);
  const { data: aSeesBGames } = await clientA.from('games').select('id').eq('student_id', studentB.id);
  const { data: bSeesOwnGames } = await clientB.from('games').select('id').eq('id', gameB.id);

  const results = {
    studentA_can_read_own_profile: (aOwnProfile || []).length === 1,
    studentA_cannot_read_studentB_profile: (aSeesBProfile || []).length === 0,
    studentA_cannot_read_studentB_games: (aSeesBGames || []).length === 0,
    studentB_can_read_own_game: (bSeesOwnGames || []).length === 1,
  };

  console.log(results);

  const failed = Object.entries(results).filter(([, ok]) => !ok);
  if (failed.length) {
    console.error('❌ RLS smoke test FAILED');
    process.exit(1);
  }

  console.log('✅ RLS smoke test passed');

  // Cleanup
  await admin.auth.admin.deleteUser(studentA.id);
  await admin.auth.admin.deleteUser(studentB.id);
}

main().catch((err) => {
  console.error('Unexpected error:', err.message || err);
  process.exit(1);
});
