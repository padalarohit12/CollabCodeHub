-- Add missing template column to rooms table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'blank';

-- Ensure rooms policies are correct
DROP POLICY IF EXISTS "Rooms Insert" ON rooms;
CREATE POLICY "Rooms Insert" ON rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Ensure is_room_member is defined (redundant but safe)
CREATE OR REPLACE FUNCTION public.is_room_member(r_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = r_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;
