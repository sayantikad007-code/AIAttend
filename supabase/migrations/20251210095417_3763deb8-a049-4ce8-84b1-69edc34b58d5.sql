-- Add face embedding column to profiles table for storing face data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS face_embedding text,
ADD COLUMN IF NOT EXISTS face_registered_at timestamp with time zone;