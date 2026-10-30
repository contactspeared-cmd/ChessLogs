-- Migration: Add composite name fields and date of birth to profiles
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists middle_initial text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists suffix text;
alter table public.profiles add column if not exists date_of_birth date;

-- Update trigger function to map user metadata to composite name & DOB
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
