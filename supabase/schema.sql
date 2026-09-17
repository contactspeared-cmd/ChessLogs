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
  role text not null default 'student' check (role in ('admin', 'student')),
  display_name text,
  avatar_url text,
  chesscom_username text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_chesscom on public.profiles(chesscom_username);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('video', 'walkthrough')),
  created_by uuid references public.profiles(id) on delete set null,
  orientation text default 'white',
  trained_side text default 'white',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Public signup is always student. Promote admins via scripts/seed_admin.js only.
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'student'
  )
  on conflict (id) do nothing;
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
