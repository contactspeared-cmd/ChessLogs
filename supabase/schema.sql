-- ==============================================================================
-- ChessLogs: Supabase PostgreSQL Schema & Row-Level Security (RLS)
-- Tables first, then policies (avoids forward-reference errors).
-- ==============================================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('admin', 'coach', 'student')),
  first_name text,
  middle_initial text,
  last_name text,
  suffix text,
  date_of_birth date,
  display_name text,
  avatar_url text,
  chesscom_username text,
  bio text,
  elo_rating integer,
  min_student_elo integer not null default 0,
  coaching_standards text,
  current_elo integer not null default 1200,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure composite name and DOB columns exist for existing deployments
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists middle_initial text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists suffix text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists elo_rating integer;
alter table public.profiles add column if not exists min_student_elo integer not null default 0;
alter table public.profiles add column if not exists coaching_standards text;
alter table public.profiles add column if not exists current_elo integer not null default 1200;

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_chesscom on public.profiles(chesscom_username);

create table if not exists public.coach_credentials (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  verified_by_admin_id uuid references public.profiles(id) on delete set null,
  credential_type text not null,
  issuer text,
  document_url text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists idx_coach_credentials_coach on public.coach_credentials(coach_id);
create index if not exists idx_coach_credentials_status on public.coach_credentials(verification_status);

create table if not exists public.student_requirements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_by_admin_id uuid references public.profiles(id) on delete set null,
  requirement_type text not null,
  document_url text,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  review_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_student_requirements_student on public.student_requirements(student_id);
create index if not exists idx_student_requirements_status on public.student_requirements(review_status);

create table if not exists public.student_coach_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_by_admin_id uuid references public.profiles(id) on delete set null,
  applied_at timestamptz not null default now(),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_at timestamptz,
  constraint student_coach_enrollments_unique unique (student_id, coach_id)
);

create index if not exists idx_student_coach_enrollments_lookup on public.student_coach_enrollments(student_id, coach_id);
create index if not exists idx_student_coach_enrollments_status on public.student_coach_enrollments(review_status);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('video', 'walkthrough')),
  created_by uuid references public.profiles(id) on delete set null,
  orientation text default 'white',
  trained_side text default 'white',
  min_elo integer not null default 0 check (min_elo >= 0),
  max_elo integer not null default 3000 check (max_elo >= min_elo),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses add column if not exists min_elo integer not null default 0;
alter table public.courses add column if not exists max_elo integer not null default 3000;
alter table public.courses add column if not exists is_published boolean not null default true;

create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  order_index integer not null default 0,
  title text not null,
  description text,
  video_url text,
  pgn text,
  orientation text default 'white',
  trained_side text default 'white',
  -- Key moments: [{ ply, keyMove, comment }, ...]
  -- Or packed form: { description, moments: [{ ply, keyMove, comment }, ...] }
  annotations jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chapters_course on public.course_chapters(course_id, order_index);

create table if not exists public.course_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'dropped')),
  progress_pct numeric(5,2) not null default 0
    check (progress_pct between 0 and 100),
  last_accessed_at timestamptz,
  -- progress shape:
  -- {
  --   completed_chapter_ids: [],  -- legacy / overall (trained or video)
  --   read_chapter_ids: [],
  --   trained_chapter_ids: [],
  --   preferred_study_mode: 'trainer' | 'read',
  --   trainer: { cards: {} }
  -- }
  progress jsonb not null default '{"completed_chapter_ids": [], "read_chapter_ids": [], "trained_chapter_ids": []}'::jsonb,
  constraint course_assignments_unique unique (course_id, student_id)
);

alter table public.course_assignments add column if not exists status text not null default 'active';
alter table public.course_assignments add column if not exists progress_pct numeric(5,2) not null default 0;
alter table public.course_assignments add column if not exists last_accessed_at timestamptz;

create index if not exists idx_assignments_student on public.course_assignments(student_id);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  chesscom_game_id text,
  pgn text not null,
  time_class text,
  result text,
  white_username text,
  black_username text,
  white_rating integer,
  black_rating integer,
  url text,
  played_at timestamptz,
  synced_at timestamptz not null default now(),
  eco text,
  opening text,
  variation text,
  constraint unique_student_chesscom_game unique (student_id, chesscom_game_id)
);

create index if not exists idx_games_student on public.games(student_id, played_at desc);

-- Opening metadata (safe for existing deployments)
alter table public.games add column if not exists eco text;
alter table public.games add column if not exists opening text;
alter table public.games add column if not exists variation text;

create table if not exists public.game_reviews (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  engine_version text not null default 'Stockfish 18 NNUE',
  move_classifications jsonb not null default '[]'::jsonb,
  accuracy_white numeric(5,2),
  accuracy_black numeric(5,2),
  created_at timestamptz not null default now(),
  constraint unique_game_review unique (game_id)
);

create index if not exists idx_reviews_game on public.game_reviews(game_id);

-- ------------------------------------------------------------------------------
-- HELPERS + AUTH TRIGGER
-- ------------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_coach()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role in ('coach', 'admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Public signup is always student. Promote admins via scripts/seed_admin.js only.
  insert into public.profiles (
    id,
    first_name,
    middle_initial,
    last_name,
    suffix,
    date_of_birth,
    display_name,
    avatar_url,
    chesscom_username,
    role
  )
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'middle_initial',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'suffix',
    case
      when new.raw_user_meta_data->>'date_of_birth' is not null and new.raw_user_meta_data->>'date_of_birth' != ''
      then (new.raw_user_meta_data->>'date_of_birth')::date
      else null
    end,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'chesscom_username',
    'student'
  )
  on conflict (id) do update set
    first_name = coalesce(excluded.first_name, profiles.first_name),
    middle_initial = coalesce(excluded.middle_initial, profiles.middle_initial),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    suffix = coalesce(excluded.suffix, profiles.suffix),
    date_of_birth = coalesce(excluded.date_of_birth, profiles.date_of_birth),
    display_name = coalesce(excluded.display_name, profiles.display_name),
    chesscom_username = coalesce(excluded.chesscom_username, profiles.chesscom_username),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_chapters enable row level security;
alter table public.course_assignments enable row level security;
alter table public.games enable row level security;
alter table public.game_reviews enable row level security;
alter table public.coach_credentials enable row level security;
alter table public.student_requirements enable row level security;
alter table public.student_coach_enrollments enable row level security;

-- Profiles
drop policy if exists "Users can view their own profile or admin can view all" on public.profiles;
create policy "Users can view their own profile or admin can view all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.is_admin());

-- Courses
drop policy if exists "Admins can manage all courses" on public.courses;
create policy "Admins can manage all courses"
  on public.courses for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Students can view assigned courses" on public.courses;
create policy "Students can view assigned courses"
  on public.courses for select
  using (
    exists (
      select 1 from public.course_assignments
      where course_assignments.course_id = courses.id
        and course_assignments.student_id = auth.uid()
    )
  );

-- Chapters
drop policy if exists "Admins can manage all chapters" on public.course_chapters;
create policy "Admins can manage all chapters"
  on public.course_chapters for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Students can view chapters of assigned courses" on public.course_chapters;
create policy "Students can view chapters of assigned courses"
  on public.course_chapters for select
  using (
    exists (
      select 1 from public.course_assignments
      where course_assignments.course_id = course_chapters.course_id
        and course_assignments.student_id = auth.uid()
    )
  );

-- Assignments
drop policy if exists "Admins can manage all assignments" on public.course_assignments;
create policy "Admins can manage all assignments"
  on public.course_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Students can view their own assignments" on public.course_assignments;
create policy "Students can view their own assignments"
  on public.course_assignments for select
  using (student_id = auth.uid());

drop policy if exists "Students can update progress on their assignments" on public.course_assignments;
create policy "Students can update progress on their assignments"
  on public.course_assignments for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Games
drop policy if exists "Admins can manage all games" on public.games;
create policy "Admins can manage all games"
  on public.games for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Students can view their own games" on public.games;
create policy "Students can view their own games"
  on public.games for select
  using (student_id = auth.uid());

drop policy if exists "Students can insert their own games" on public.games;
create policy "Students can insert their own games"
  on public.games for insert
  with check (student_id = auth.uid());

drop policy if exists "Students can update their own games" on public.games;
create policy "Students can update their own games"
  on public.games for update
  using (student_id = auth.uid());

drop policy if exists "Students can delete their own games" on public.games;
create policy "Students can delete their own games"
  on public.games for delete
  using (student_id = auth.uid());

-- Reviews
drop policy if exists "Admins can manage all reviews" on public.game_reviews;
create policy "Admins can manage all reviews"
  on public.game_reviews for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Students can view reviews of their games" on public.game_reviews;
create policy "Students can view reviews of their games"
  on public.game_reviews for select
  using (
    exists (
      select 1 from public.games
      where games.id = game_reviews.game_id
        and games.student_id = auth.uid()
    )
  );

drop policy if exists "Students can insert reviews for their games" on public.game_reviews;
create policy "Students can insert reviews for their games"
  on public.game_reviews for insert
  with check (
    exists (
      select 1 from public.games
      where games.id = game_reviews.game_id
        and games.student_id = auth.uid()
    )
  );

drop policy if exists "Students can update reviews for their games" on public.game_reviews;
create policy "Students can update reviews for their games"
  on public.game_reviews for update
  using (
    exists (
      select 1 from public.games
      where games.id = game_reviews.game_id
        and games.student_id = auth.uid()
    )
  );

-- Coach Credentials
drop policy if exists "Admins can manage all credentials" on public.coach_credentials;
create policy "Admins can manage all credentials"
  on public.coach_credentials for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Coaches can view and submit their own credentials" on public.coach_credentials;
create policy "Coaches can view and submit their own credentials"
  on public.coach_credentials for select
  using (coach_id = auth.uid());

drop policy if exists "Coaches can insert their own credentials" on public.coach_credentials;
create policy "Coaches can insert their own credentials"
  on public.coach_credentials for insert
  with check (coach_id = auth.uid());

-- Student Requirements
drop policy if exists "Admins can manage all student requirements" on public.student_requirements;
create policy "Admins can manage all student requirements"
  on public.student_requirements for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Students can view and submit their own requirements" on public.student_requirements;
create policy "Students can view and submit their own requirements"
  on public.student_requirements for select
  using (student_id = auth.uid());

drop policy if exists "Students can insert their own requirements" on public.student_requirements;
create policy "Students can insert their own requirements"
  on public.student_requirements for insert
  with check (student_id = auth.uid());

-- Student Coach Enrollments
drop policy if exists "Admins can manage all coach enrollments" on public.student_coach_enrollments;
create policy "Admins can manage all coach enrollments"
  on public.student_coach_enrollments for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Coaches can view enrollments submitted to them" on public.student_coach_enrollments;
create policy "Coaches can view enrollments submitted to them"
  on public.student_coach_enrollments for select
  using (coach_id = auth.uid());

drop policy if exists "Students can view and submit their own coach applications" on public.student_coach_enrollments;
create policy "Students can view and submit their own coach applications"
  on public.student_coach_enrollments for select
  using (student_id = auth.uid());

drop policy if exists "Students can apply to coaches" on public.student_coach_enrollments;
create policy "Students can apply to coaches"
  on public.student_coach_enrollments for insert
  with check (student_id = auth.uid());
