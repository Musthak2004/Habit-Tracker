// ─────────────────────────────────────────────────────────────
//  Supabase Schema — Run this SQL in the Supabase SQL Editor
// ─────────────────────────────────────────────────────────────
//  Copy the SQL below (the template string) and execute it in
//  your Supabase project's SQL Editor (Dashboard → SQL Editor).
//
//  Step-by-step:
//    1. Go to https://supabase.com → your project
//    2. Click "SQL Editor" in the left sidebar
//    3. Click "New Query"
//    4. Paste everything inside the SQL_SCRIPT template string below
//    5. Click "Run" (or Ctrl+Enter)
// ─────────────────────────────────────────────────────────────

export const SQL_SCRIPT = `
-- ── Habits table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('boolean', 'volume')),
  target_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  completions JSONB NOT NULL DEFAULT '{}'::jsonb,
  archived BOOLEAN NOT NULL DEFAULT false,
  notification_time TEXT
);

-- Index for fast user-specific queries
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);

-- ── Challenges table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_days INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  required_daily INTEGER NOT NULL DEFAULT 1,
  reward TEXT NOT NULL,
  reward_emoji TEXT NOT NULL DEFAULT '🏆',
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TEXT,
  is_onboarding BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON public.challenges(user_id);

-- ── Coaching Nudges table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coaching_nudges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('motivational', 'suggestion', 'insight')),
  context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL,
  seen BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_coaching_nudges_user_id ON public.coaching_nudges(user_id);

-- ── Reflection Reports table ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.reflection_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  summary_text TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reflection_reports_user_id ON public.reflection_reports(user_id);

-- ── Settings table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_time TEXT NOT NULL DEFAULT '09:00',
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  haptics_enabled BOOLEAN NOT NULL DEFAULT true
);

-- ── Row Level Security ────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ── Habits policies ───────────────────────────────────────
CREATE POLICY "Users can view their own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- ── Challenges policies ───────────────────────────────────
CREATE POLICY "Users can view their own challenges"
  ON public.challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
  ON public.challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenges"
  ON public.challenges FOR DELETE
  USING (auth.uid() = user_id);

-- ── Settings policies ─────────────────────────────────────
CREATE POLICY "Users can view their own settings"
  ON public.settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
  ON public.settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON public.settings FOR DELETE
  USING (auth.uid() = user_id);

-- ── Coaching Nudges policies ─────────────────────────────
CREATE POLICY "Users can view their own nudges"
  ON public.coaching_nudges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nudges"
  ON public.coaching_nudges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nudges"
  ON public.coaching_nudges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nudges"
  ON public.coaching_nudges FOR DELETE
  USING (auth.uid() = user_id);

-- ── Reflection Reports policies ─────────────────────────
CREATE POLICY "Users can view their own reports"
  ON public.reflection_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
  ON public.reflection_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON public.reflection_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON public.reflection_reports FOR DELETE
  USING (auth.uid() = user_id);
`;
