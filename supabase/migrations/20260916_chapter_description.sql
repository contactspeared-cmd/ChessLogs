-- Optional dedicated column for chapter learning objectives.
-- Until applied, description is also stored inside annotations jsonb as:
--   { "description": "...", "moments": [ { ply, keyMove, comment }, ... ] }
-- Legacy rows keep annotations as a bare array of moments.

alter table public.course_chapters
  add column if not exists description text;

comment on column public.course_chapters.description is
  'Optional chapter learning objective shown in the Study view info panel';
