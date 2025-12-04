
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://auaypyfcjamvgalttknz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1YXlweWZjamFtdmdhbHR0a256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODEyMjMsImV4cCI6MjA3NDU1NzIyM30.yElhFyiUeFvACH48b0ZjUr_HlbgVrOnqw5o03ReeB_E'

// Ditambahkan opsi auth untuk memastikan persistensi sesi yang andal
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});


/* 
================================================================================
================================================================================

    --->   KODE SQL UNTUK MIGRASI DATABASE ANDA   <---

  JALANKAN KODE SQL BERIKUT DI EDITOR SQL SUPABASE ANDA (TABEL SQL EDITOR).
  
================================================================================
================================================================================

-- 1. Tambahkan kolom target tabungan ke tabel profiles (WAJIB)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS savings_goal numeric DEFAULT 0;

-- 2. (Opsional) Pastikan tabel expenses sudah ada jika belum
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    amount numeric NOT NULL,
    category text,
    date timestamp with time zone DEFAULT now() NOT NULL,
    receipt_url text,
    notes text,
    type text DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
    is_recurring boolean DEFAULT false,
    recurrence_interval text CHECK (recurrence_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
    next_due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Aktifkan keamanan (RLS) untuk expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 4. Kebijakan agar user hanya bisa akses data sendiri
DROP POLICY IF EXISTS "Users can manage their own expenses" ON public.expenses;
CREATE POLICY "Users can manage their own expenses"
ON public.expenses FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Tabel Budgets (BARU - Untuk Fitur Budgeting)
CREATE TABLE IF NOT EXISTS public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category text NOT NULL,
    amount numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, category)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own budgets" ON public.budgets;
CREATE POLICY "Users can manage their own budgets"
ON public.budgets FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. GAMIFIKASI (BARU) - Jalankan ini untuk fitur Robot & Koin
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS coins integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS inventory jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS equipped jsonb DEFAULT '{"head": null, "face": null, "skin": "default", "theme": "default"}'::jsonb,
ADD COLUMN IF NOT EXISTS last_fate_date text,
ADD COLUMN IF NOT EXISTS active_fate_card jsonb;

-- 7. CANVAS NOTES (BARU) - Jalankan ini untuk fitur Canvas
CREATE TABLE IF NOT EXISTS public.canvas_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text,
    content text,
    x numeric DEFAULT 50,
    y numeric DEFAULT 50,
    width numeric DEFAULT 280,
    height numeric DEFAULT 280,
    color text DEFAULT 'yellow',
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.canvas_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own canvas notes" ON public.canvas_notes;
CREATE POLICY "Users can manage their own canvas notes"
ON public.canvas_notes FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. GOALS (BARU) - Jalankan ini untuk fitur Life Goals
CREATE TABLE IF NOT EXISTS public.goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    type text NOT NULL CHECK (type IN ('finance', 'task', 'manual')),
    target_value numeric NOT NULL DEFAULT 0,
    current_value numeric NOT NULL DEFAULT 0,
    deadline timestamp with time zone,
    linked_tag text, -- Opsional, untuk tipe 'task'
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
CREATE POLICY "Users can manage their own goals"
ON public.goals FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 9. SOCIAL MEDIA HUB (BARU) - Premium Feature
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform text NOT NULL, -- 'tiktok', 'instagram', 'youtube', 'facebook', 'x'
    username text NOT NULL,
    avatar_url text,
    connected boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, platform)
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own social accounts" ON public.social_accounts;
CREATE POLICY "Users can manage their own social accounts"
ON public.social_accounts FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.social_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    caption text,
    media_url text,
    platforms text[] NOT NULL, -- Array of platform strings
    scheduled_time timestamp with time zone NOT NULL,
    status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'posting', 'posted', 'failed')),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own social posts" ON public.social_posts;
CREATE POLICY "Users can manage their own social posts"
ON public.social_posts FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

*/