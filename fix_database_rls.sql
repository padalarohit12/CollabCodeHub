-- ============================================================
-- COMPLETE FIX: Run this in Supabase SQL Editor
-- This fixes RLS so Tasks and Chat work properly
-- ============================================================

-- 1. Re-create the is_room_member helper function (CRITICAL)
CREATE OR REPLACE FUNCTION public.is_room_member(r_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = r_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Add missing columns to profiles (if not already added)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Drop and re-create all policies cleanly

-- ROOMS
DROP POLICY IF EXISTS "Rooms Insert" ON rooms;
DROP POLICY IF EXISTS "Rooms Select" ON rooms;
DROP POLICY IF EXISTS "Rooms Update" ON rooms;
DROP POLICY IF EXISTS "Rooms Delete" ON rooms;
CREATE POLICY "Rooms Insert" ON rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Rooms Select" ON rooms FOR SELECT USING (created_by = auth.uid() OR is_room_member(id));
CREATE POLICY "Rooms Update" ON rooms FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Rooms Delete" ON rooms FOR DELETE USING (created_by = auth.uid());

-- ROOM MEMBERS
DROP POLICY IF EXISTS "Members Select" ON room_members;
DROP POLICY IF EXISTS "Members Insert" ON room_members;
DROP POLICY IF EXISTS "Members Delete" ON room_members;
DROP POLICY IF EXISTS "Members Update" ON room_members;
CREATE POLICY "Members Select" ON room_members FOR SELECT USING (user_id = auth.uid() OR is_room_member(room_id));
CREATE POLICY "Members Insert" ON room_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Members Update" ON room_members FOR UPDATE USING (is_room_member(room_id));
CREATE POLICY "Members Delete" ON room_members FOR DELETE USING (is_room_member(room_id));

-- MESSAGES
DROP POLICY IF EXISTS "Messages Select" ON messages;
DROP POLICY IF EXISTS "Messages Insert" ON messages;
CREATE POLICY "Messages Select" ON messages FOR SELECT USING (is_room_member(room_id));
CREATE POLICY "Messages Insert" ON messages FOR INSERT WITH CHECK (is_room_member(room_id) AND auth.uid() = user_id);

-- TASKS
DROP POLICY IF EXISTS "Tasks All" ON tasks;
DROP POLICY IF EXISTS "Tasks Select" ON tasks;
DROP POLICY IF EXISTS "Tasks Insert" ON tasks;
DROP POLICY IF EXISTS "Tasks Update" ON tasks;
DROP POLICY IF EXISTS "Tasks Delete" ON tasks;
CREATE POLICY "Tasks All" ON tasks FOR ALL USING (is_room_member(room_id)) WITH CHECK (is_room_member(room_id));

-- PROFILES
DROP POLICY IF EXISTS "Profiles Select" ON profiles;
DROP POLICY IF EXISTS "Profiles Update" ON profiles;
DROP POLICY IF EXISTS "Profiles Insert" ON profiles;
CREATE POLICY "Profiles Select" ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles Insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles Update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Trigger for auto-creating profile on signup (re-apply)
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
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and re-create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Friendships table (if not exists)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, friend_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Friendships Select" ON friendships;
DROP POLICY IF EXISTS "Friendships Insert" ON friendships;
DROP POLICY IF EXISTS "Friendships Update" ON friendships;
DROP POLICY IF EXISTS "Friendships Delete" ON friendships;
CREATE POLICY "Friendships Select" ON friendships FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "Friendships Insert" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Friendships Update" ON friendships FOR UPDATE USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "Friendships Delete" ON friendships FOR DELETE USING (user_id = auth.uid() OR friend_id = auth.uid());

-- 6. Enable Realtime for messages and tasks (if not already)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE messages, tasks, room_members;
COMMIT;

-- DONE! Everything should now work.
