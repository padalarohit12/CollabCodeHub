-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the handle_new_user trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, username)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.email, -- Capture email from auth.users
    new.raw_user_meta_data->>'username' -- Ensure username is captured if available
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill email (Best Effort - cannot access auth.users directly easily from here without pg_net or admin privileges in some setups, but strict RLS might block. 
-- However, since we are using the service role or superuser often in these setups, we might be able to. 
-- For now, we rely on new users or manual updates, or the user can update their own profile).

-- Allow users to read profiles (needed for search)
-- Existing policy is likely: CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING ( true );
-- Verify policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

-- Ensure users can update their own profile to add email if missing
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
