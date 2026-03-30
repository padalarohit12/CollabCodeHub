-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, friend_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- 1. VIEW: Users can view their own friendships
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
CREATE POLICY "Users can view own friendships" ON friendships FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- 2. INSERT: Users can send requests (user_id must be themselves)
DROP POLICY IF EXISTS "Users can insert friendship" ON friendships;
CREATE POLICY "Users can insert friendship" ON friendships FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- 3. UPDATE: Users can accept requests (they must be the friend_id)
DROP POLICY IF EXISTS "Users can update received friendships" ON friendships;
CREATE POLICY "Users can update received friendships" ON friendships FOR UPDATE USING (
  auth.uid() = friend_id
);

-- 4. DELETE: Users can remove friends or cancel requests
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;
CREATE POLICY "Users can delete own friendships" ON friendships FOR DELETE USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);
