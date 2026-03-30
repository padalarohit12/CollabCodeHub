-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Create room_members table
CREATE TABLE IF NOT EXISTS room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(room_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done', 'archived')),
  assigned_to UUID REFERENCES auth.users ON DELETE SET NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 1. SECURITY DEFINER HELPER (Breaks Recursion)
CREATE OR REPLACE FUNCTION public.is_room_member(r_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = r_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. ROOMS POLICIES
DROP POLICY IF EXISTS "Rooms Insert" ON rooms;
DROP POLICY IF EXISTS "Rooms Select" ON rooms;
CREATE POLICY "Rooms Insert" ON rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Rooms Select" ON rooms FOR SELECT USING (
  created_by = auth.uid() OR is_room_member(id)
);

-- 3. ROOM MEMBERS POLICIES
DROP POLICY IF EXISTS "Members Select" ON room_members;
DROP POLICY IF EXISTS "Members Insert" ON room_members;
CREATE POLICY "Members Select" ON room_members FOR SELECT USING (
  user_id = auth.uid() OR is_room_member(room_id)
);
CREATE POLICY "Members Insert" ON room_members FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- 4. MESSAGES POLICIES
DROP POLICY IF EXISTS "Messages Select" ON messages;
DROP POLICY IF EXISTS "Messages Insert" ON messages;
CREATE POLICY "Messages Select" ON messages FOR SELECT USING (is_room_member(room_id));
CREATE POLICY "Messages Insert" ON messages FOR INSERT WITH CHECK (is_room_member(room_id));

-- 5. TASKS POLICIES
DROP POLICY IF EXISTS "Tasks All" ON tasks;
CREATE POLICY "Tasks All" ON tasks FOR ALL USING (is_room_member(room_id));

-- Trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Global Publication
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table messages, tasks;
commit;
