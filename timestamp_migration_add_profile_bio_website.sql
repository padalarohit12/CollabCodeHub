-- Migration: Add bio and website columns to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;
