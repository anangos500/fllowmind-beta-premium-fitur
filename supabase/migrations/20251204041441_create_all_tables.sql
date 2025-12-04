/*
  # Create FlowMind Application Database Schema

  ## Overview
  Complete database schema for FlowMind productivity application including:
  - User profiles with gamification
  - Task management
  - Journal system
  - Finance tracking
  - Canvas notes
  - Goals system
  - Social media management

  ## New Tables

  ### 1. profiles
  - `id` (uuid, primary key, references auth.users)
  - `updated_at` (timestamptz)
  - `username` (text)
  - `has_completed_onboarding` (boolean)
  - `play_focus_end_sound` (boolean)
  - `play_break_end_sound` (boolean)
  - `focus_end_sound` (text)
  - `break_end_sound` (text)
  - `savings_goal` (numeric)
  - `coins` (integer)
  - `inventory` (text[])
  - `equipped` (jsonb)
  - `last_fate_date` (text)
  - `active_fate_card` (jsonb)

  ### 2. tasks
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `title` (text)
  - `start_time` (timestamptz)
  - `end_time` (timestamptz)
  - `status` (text)
  - `checklist` (jsonb)
  - `notes` (text)
  - `is_important` (boolean)
  - `recurrence` (text)
  - `recurring_template_id` (uuid)
  - `tags` (text[])
  - `created_at` (timestamptz)

  ### 3. journals
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `journal_date` (text)
  - `title` (text)
  - `notes` (text)
  - `completed_tasks` (jsonb)
  - `pdf_path` (text)
  - `created_at` (timestamptz)

  ### 4. expenses
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `title` (text)
  - `amount` (numeric)
  - `category` (text)
  - `date` (timestamptz)
  - `receipt_url` (text)
  - `notes` (text)
  - `type` (text - 'income' or 'expense')
  - `is_recurring` (boolean)
  - `recurrence_interval` (text)
  - `next_due_date` (timestamptz)
  - `created_at` (timestamptz)

  ### 5. budgets
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `category` (text)
  - `amount` (numeric)
  - `created_at` (timestamptz)

  ### 6. canvas_notes
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `title` (text)
  - `content` (text)
  - `x` (numeric)
  - `y` (numeric)
  - `width` (numeric)
  - `height` (numeric)
  - `color` (text)
  - `is_pinned` (boolean)
  - `created_at` (timestamptz)

  ### 7. goals
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `title` (text)
  - `type` (text - 'finance', 'task', or 'manual')
  - `target_value` (numeric)
  - `current_value` (numeric)
  - `deadline` (timestamptz)
  - `linked_tag` (text)
  - `created_at` (timestamptz)

  ### 8. social_accounts
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `platform` (text - 'tiktok', 'instagram', 'youtube', 'facebook', 'x')
  - `username` (text)
  - `access_token` (text, encrypted)
  - `refresh_token` (text, encrypted)
  - `token_expires_at` (timestamptz)
  - `avatar_url` (text)
  - `platform_user_id` (text)
  - `connected` (boolean)
  - `created_at` (timestamptz)

  ### 9. social_posts
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `caption` (text)
  - `media_url` (text)
  - `platforms` (text[])
  - `scheduled_time` (timestamptz)
  - `status` (text - 'scheduled', 'posting', 'posted', 'failed')
  - `error_message` (text)
  - `platform_post_ids` (jsonb)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Authenticated users only
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now(),
  username text,
  has_completed_onboarding boolean DEFAULT false,
  play_focus_end_sound boolean DEFAULT true,
  play_break_end_sound boolean DEFAULT true,
  focus_end_sound text DEFAULT 'bell',
  break_end_sound text DEFAULT 'chime',
  savings_goal numeric DEFAULT 0,
  coins integer DEFAULT 0,
  inventory text[] DEFAULT '{}',
  equipped jsonb DEFAULT '{}',
  last_fate_date text,
  active_fate_card jsonb
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'To Do',
  checklist jsonb DEFAULT '[]',
  notes text DEFAULT '',
  is_important boolean DEFAULT false,
  recurrence text DEFAULT 'none',
  recurring_template_id uuid,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create journals table
CREATE TABLE IF NOT EXISTS journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journal_date text NOT NULL,
  title text NOT NULL,
  notes text DEFAULT '',
  completed_tasks jsonb DEFAULT '[]',
  pdf_path text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journals"
  ON journals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journals"
  ON journals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journals"
  ON journals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journals"
  ON journals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  receipt_url text,
  notes text,
  type text DEFAULT 'expense',
  is_recurring boolean DEFAULT false,
  recurrence_interval text,
  next_due_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create canvas_notes table
CREATE TABLE IF NOT EXISTS canvas_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text DEFAULT '',
  x numeric DEFAULT 0,
  y numeric DEFAULT 0,
  width numeric DEFAULT 200,
  height numeric DEFAULT 150,
  color text DEFAULT 'yellow',
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE canvas_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own canvas notes"
  ON canvas_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own canvas notes"
  ON canvas_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canvas notes"
  ON canvas_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own canvas notes"
  ON canvas_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  deadline timestamptz,
  linked_tag text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create social_accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  username text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  avatar_url text,
  platform_user_id text,
  connected boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social accounts"
  ON social_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social accounts"
  ON social_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social accounts"
  ON social_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own social accounts"
  ON social_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create social_posts table
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caption text DEFAULT '',
  media_url text,
  platforms text[] NOT NULL,
  scheduled_time timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  error_message text,
  platform_post_ids jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social posts"
  ON social_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social posts"
  ON social_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social posts"
  ON social_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own social posts"
  ON social_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts
CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can view receipts"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'receipts');
