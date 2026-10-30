-- Migration: 20261030_chess_lms_3tier_redesign.sql
-- Aligns ChessLogs with the 3-Tier Chess LMS Schema (Admin, Coach, Student)

-- 1. Extend profiles for Coach & Student tier properties
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'coach', 'student'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS elo_rating INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS min_student_elo INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coaching_standards TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_elo INT NOT NULL DEFAULT 1200;

-- 2. Coach Credentials table
CREATE TABLE IF NOT EXISTS public.coach_credentials (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verified_by_admin_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  credential_type       TEXT NOT NULL,
  issuer                TEXT,
  document_url          TEXT,
  verification_status   TEXT NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  rejection_reason      TEXT,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_coach_credentials_coach ON public.coach_credentials(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_credentials_status ON public.coach_credentials(verification_status);

-- 3. Student Requirements table
CREATE TABLE IF NOT EXISTS public.student_requirements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_by_admin_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requirement_type      TEXT NOT NULL,
  document_url          TEXT,
  review_status         TEXT NOT NULL DEFAULT 'pending'
                        CHECK (review_status IN ('pending', 'approved', 'rejected')),
  review_notes          TEXT,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_requirements_student ON public.student_requirements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_requirements_status ON public.student_requirements(review_status);

-- 4. Student Coach Enrollments table
CREATE TABLE IF NOT EXISTS public.student_coach_enrollments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_by_admin_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  applied_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_status         TEXT NOT NULL DEFAULT 'pending'
                        CHECK (review_status IN ('pending', 'approved', 'rejected')),
  review_notes          TEXT,
  reviewed_at           TIMESTAMPTZ,
  CONSTRAINT student_coach_enrollments_unique UNIQUE (student_id, coach_id)
);

CREATE INDEX IF NOT EXISTS idx_student_coach_enrollments_lookup ON public.student_coach_enrollments(student_id, coach_id);
CREATE INDEX IF NOT EXISTS idx_student_coach_enrollments_status ON public.student_coach_enrollments(review_status);

-- 5. Extend Courses with Elo rating bands and publish flag
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS min_elo INT NOT NULL DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS max_elo INT NOT NULL DEFAULT 3000;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_elo_band_check'
  ) THEN
    ALTER TABLE public.courses ADD CONSTRAINT courses_elo_band_check CHECK (max_elo >= min_elo AND min_elo >= 0);
  END IF;
END $$;

-- 6. Extend Course Assignments with enrollment status and progress percentage
ALTER TABLE public.course_assignments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.course_assignments ADD COLUMN IF NOT EXISTS progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE public.course_assignments ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_assignments_status_check'
  ) THEN
    ALTER TABLE public.course_assignments ADD CONSTRAINT course_assignments_status_check
      CHECK (status IN ('active', 'paused', 'completed', 'dropped'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_assignments_progress_check'
  ) THEN
    ALTER TABLE public.course_assignments ADD CONSTRAINT course_assignments_progress_check
      CHECK (progress_pct BETWEEN 0 AND 100);
  END IF;
END $$;

-- 7. Helper functions & RLS Security Policies
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT coalesce(
    (SELECT role IN ('coach', 'admin') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

ALTER TABLE public.coach_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_coach_enrollments ENABLE ROW LEVEL SECURITY;

-- Coach Credentials policies
DROP POLICY IF EXISTS "Admins can manage all credentials" ON public.coach_credentials;
CREATE POLICY "Admins can manage all credentials"
  ON public.coach_credentials FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Coaches can view and submit their own credentials" ON public.coach_credentials;
CREATE POLICY "Coaches can view and submit their own credentials"
  ON public.coach_credentials FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches can insert their own credentials"
  ON public.coach_credentials FOR INSERT
  WITH CHECK (coach_id = auth.uid());

-- Student Requirements policies
DROP POLICY IF EXISTS "Admins can manage all student requirements" ON public.student_requirements;
CREATE POLICY "Admins can manage all student requirements"
  ON public.student_requirements FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Students can view and submit their own requirements" ON public.student_requirements;
CREATE POLICY "Students can view their own requirements"
  ON public.student_requirements FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own requirements"
  ON public.student_requirements FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Student Coach Enrollments policies
DROP POLICY IF EXISTS "Admins can manage all coach enrollments" ON public.student_coach_enrollments;
CREATE POLICY "Admins can manage all coach enrollments"
  ON public.student_coach_enrollments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Coaches can view enrollments submitted to them" ON public.student_coach_enrollments;
CREATE POLICY "Coaches can view enrollments submitted to them"
  ON public.student_coach_enrollments FOR SELECT
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Students can view and submit their own coach applications" ON public.student_coach_enrollments;
CREATE POLICY "Students can view their own coach applications"
  ON public.student_coach_enrollments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can apply to coaches"
  ON public.student_coach_enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());
