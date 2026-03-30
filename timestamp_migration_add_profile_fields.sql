-- Add bio and website columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_link TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter_link TEXT;
