-- Create table for storing verification images
CREATE TABLE public.verification_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_data TEXT NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id UUID REFERENCES public.attendance_sessions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification images
CREATE POLICY "Users can view their own verification images"
ON public.verification_images
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own verification images
CREATE POLICY "Users can insert their own verification images"
ON public.verification_images
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own verification images
CREATE POLICY "Users can delete their own verification images"
ON public.verification_images
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_verification_images_user_id ON public.verification_images(user_id);
CREATE INDEX idx_verification_images_captured_at ON public.verification_images(captured_at DESC);