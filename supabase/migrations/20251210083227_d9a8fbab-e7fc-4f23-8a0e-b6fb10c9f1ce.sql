-- Drop ALL existing policies on classes and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;
DROP POLICY IF EXISTS "Professors can manage their own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;

-- Create PERMISSIVE policies (default behavior, uses OR logic)
CREATE POLICY "Admins can manage all classes" 
ON public.classes 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can manage their own classes" 
ON public.classes 
FOR ALL 
TO authenticated
USING (professor_id = auth.uid())
WITH CHECK (professor_id = auth.uid());

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