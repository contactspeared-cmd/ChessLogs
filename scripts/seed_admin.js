import { createClient } from '@supabase/supabase-js';
import process from 'process';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_admin.js <admin_email> [admin_password] [display_name]');
  process.exit(1);
}

const adminEmail = process.argv[2] || process.env.ADMIN_EMAIL || 'coach@chesslogs.com';
const adminPassword = process.argv[3] || process.env.ADMIN_PASSWORD || 'ChessLogsAdmin2026!';
const displayName = process.argv[4] || process.env.ADMIN_NAME || 'Head Coach';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Checking / seeding admin account for ${adminEmail}...`);

  // 1. Check if user already exists in auth
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list auth users:', listError.message);
    process.exit(1);
  }

  let user = usersData.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());

  if (!user) {
    console.log(`User not found in Auth. Creating user ${adminEmail}...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        display_name: displayName,
      },
    });

    if (createError) {
      console.error('Failed to create auth user:', createError.message);
      process.exit(1);
    }
    user = createData.user;
    console.log(`Created Auth user with ID: ${user.id}`);
  } else {
    console.log(`Found existing Auth user with ID: ${user.id}`);
  }

  // 2. Ensure profile exists and role is set to 'admin'
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        role: 'admin',
        display_name: displayName,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (profileError) {
    console.error('Failed to upsert profile:', profileError.message);
    process.exit(1);
  }

  console.log('✅ Successfully seeded / promoted Admin profile:');
  console.log({
    id: profile.id,
    role: profile.role,
    display_name: profile.display_name,
    email: adminEmail,
  });
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
