-- ============================================================
-- FINAL FIX - Run this in Supabase SQL Editor
-- Fixes: Tasks failing + Invite by email failing
-- ============================================================

-- 1. Add priority column to tasks (THIS is why tasks fail)
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- 2. Add labels/tags column to tasks (used by TaskBoard)
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';

-- 3. Add email column to profiles (if not already)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email TEXT;

-- 4. Backfill emails for ALL existing users from auth.users
-- This fixes "User not found" when inviting by email
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- 5. Update profile trigger to always save email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, email)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url',
        new.email
    )
    ON CONFLICT (id) DO UPDATE SET
        email       = EXCLUDED.email,
        full_name   = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url  = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Re-apply tasks RLS to be sure
DROP POLICY IF EXISTS "Tasks All" ON tasks;
CREATE POLICY "Tasks All" ON tasks
    FOR ALL
    USING   (is_room_member(room_id))
    WITH CHECK (is_room_member(room_id));

-- Done! Tasks should now insert correctly and email invite should work.
