-- Create a security definer function to look up student user_id by email
-- This allows professors to find students for enrollment without direct profile access
CREATE OR REPLACE FUNCTION public.get_student_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE p.email = _email
    AND ur.role = 'student'::app_role
  LIMIT 1
$$;