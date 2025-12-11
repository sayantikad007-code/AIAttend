-- Add join_code column to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Create function to generate unique join codes
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6-character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.classes c WHERE c.join_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Generate codes for existing classes
UPDATE public.classes SET join_code = public.generate_join_code() WHERE join_code IS NULL;

-- Make join_code NOT NULL after populating existing records
ALTER TABLE public.classes ALTER COLUMN join_code SET NOT NULL;

-- Create trigger function to auto-generate join_code on class creation
CREATE OR REPLACE FUNCTION public.set_class_join_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := public.generate_join_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS set_class_join_code_trigger ON public.classes;
CREATE TRIGGER set_class_join_code_trigger
BEFORE INSERT ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.set_class_join_code();

-- Create function for students to join class by code
CREATE OR REPLACE FUNCTION public.join_class_by_code(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _class_id UUID;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  
  -- Verify user is a student
  IF NOT public.is_student(_user_id) THEN
    RAISE EXCEPTION 'Only students can join classes';
  END IF;
  
  -- Find class by code
  SELECT c.id INTO _class_id FROM public.classes c WHERE c.join_code = upper(_code);
  
  IF _class_id IS NULL THEN
    RAISE EXCEPTION 'Invalid class code';
  END IF;
  
  -- Check if already enrolled
  IF EXISTS(SELECT 1 FROM public.class_enrollments WHERE class_id = _class_id AND student_id = _user_id) THEN
    RAISE EXCEPTION 'Already enrolled in this class';
  END IF;
  
  -- Enroll student
  INSERT INTO public.class_enrollments (class_id, student_id)
  VALUES (_class_id, _user_id);
  
  RETURN _class_id;
END;
$$;