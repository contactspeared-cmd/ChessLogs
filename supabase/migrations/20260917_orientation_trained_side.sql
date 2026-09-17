-- Migration: Add study orientation and trained_side to courses and course_chapters (B.7.1 & B.3.1)

alter table public.courses
  add column if not exists orientation text default 'white',
  add column if not exists trained_side text default 'white';

alter table public.course_chapters
  add column if not exists orientation text default 'white',
  add column if not exists trained_side text default 'white';

comment on column public.courses.orientation is 'Default board orientation for this course (white or black)';
comment on column public.courses.trained_side is 'Default trained side for this course (white, black, or both)';

comment on column public.course_chapters.orientation is 'Board orientation for this chapter (white or black)';
comment on column public.course_chapters.trained_side is 'Configured side being trained for this chapter (white, black, or both)';
