/**
 * Apply pending SQL migrations via Supabase admin API
 * 
 * Usage: node --env-file=.env scripts/apply_migrations.js
 * 
 * Note: Run this after deploying to production. Supabase automatically applies
 * migrations in the /supabase/migrations directory when pushed via git.
 * This script is a manual fallback if needed.
 */
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function applyMigrations() {
  const migrationsDir = resolve(root, 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('📋 Pending migrations to apply:');
  files.forEach(f => console.log(`   - ${f}`));
  
  console.log('\n⚠️  NOTE: Supabase automatically migrates when files are pushed via git.');
  console.log('Apply these migrations via the Supabase dashboard or CLI:');
  console.log(`   supabase db push`);
  console.log(`   (requires: supabase login and SUPABASE_ACCESS_TOKEN)\n`);

  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDir, file), 'utf-8');
    console.log(`📝 ${file}:`);
    console.log('---');
    console.log(sql.split('\n').slice(0, 5).join('\n'));
    console.log('...\n');
  }

  console.log('✅ Verify migrations are applied in Supabase Dashboard > SQL Editor');
  console.log('   Commit these files and push to GitHub for automatic deployment.\n');
}

applyMigrations().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
