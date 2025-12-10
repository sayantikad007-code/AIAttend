-- Fix the broken "Students can view enrolled classes" policy
-- The bug: ce.class_id = ce.id (comparing to itself instead of classes.id)

DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;

CREATE POLICY "Students can view enrolled classes" 
ON public.classes 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM class_enrollments ce
    WHERE ce.class_id = classes.id AND ce.student_id = auth.uid()
  )
);