-- Drop existing restrictive policies on classes
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;
DROP POLICY IF EXISTS "Professors can manage their own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view classes they're enrolled in" ON public.classes;

-- Create PERMISSIVE policies (default) - these use OR logic so any matching policy grants access
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
    WHERE ce.class_id = id AND ce.student_id = auth.uid()
  )
);

-- Also fix class_enrollments policies to avoid recursion
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "Professors can manage enrollments for their classes" ON public.class_enrollments;
DROP POLICY IF EXISTS "Students can view their enrollments" ON public.class_enrollments;

CREATE POLICY "Admins can manage all enrollments" 
ON public.class_enrollments 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can manage enrollments for their classes" 
ON public.class_enrollments 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = class_id AND c.professor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = class_id AND c.professor_id = auth.uid()
  )
);

CREATE POLICY "Students can view their enrollments" 
ON public.class_enrollments 
FOR SELECT 
TO authenticated
USING (student_id = auth.uid());