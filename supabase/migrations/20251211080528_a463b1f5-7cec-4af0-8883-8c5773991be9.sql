-- Create a separate table for session secrets that only professors can access
CREATE TABLE public.session_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  qr_secret text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_secrets ENABLE ROW LEVEL SECURITY;

-- Only professors who own the class can access session secrets
CREATE POLICY "Professors can manage secrets for their class sessions"
ON public.session_secrets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.attendance_sessions s
    JOIN public.classes c ON s.class_id = c.id
    WHERE s.id = session_secrets.session_id
    AND c.professor_id = auth.uid()
  )
);

-- Admins can manage all secrets
CREATE POLICY "Admins can manage all session secrets"
ON public.session_secrets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing qr_secret data to new table
INSERT INTO public.session_secrets (session_id, qr_secret)
SELECT id, qr_secret FROM public.attendance_sessions WHERE qr_secret IS NOT NULL;

-- Remove qr_secret column from attendance_sessions
ALTER TABLE public.attendance_sessions DROP COLUMN qr_secret;