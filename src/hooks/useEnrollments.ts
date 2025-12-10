import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Enrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  student?: {
    id: string;
    name: string;
    email: string;
    roll_number: string | null;
  };
}

export function useEnrollments(classId?: string) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = async () => {
    if (!classId) {
      setEnrollments([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('class_enrollments')
        .select(`
          id,
          class_id,
          student_id,
          enrolled_at
        `)
        .eq('class_id', classId)
        .order('enrolled_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch student profiles separately
      if (data && data.length > 0) {
        const studentIds = data.map(e => e.student_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, email, roll_number')
          .in('user_id', studentIds);

        if (profilesError) throw profilesError;

        const enrollmentsWithStudents = data.map(enrollment => ({
          ...enrollment,
          student: profiles?.find(p => p.user_id === enrollment.student_id) 
            ? {
                id: enrollment.student_id,
                name: profiles.find(p => p.user_id === enrollment.student_id)!.name,
                email: profiles.find(p => p.user_id === enrollment.student_id)!.email,
                roll_number: profiles.find(p => p.user_id === enrollment.student_id)!.roll_number,
              }
            : undefined,
        }));
        setEnrollments(enrollmentsWithStudents);
      } else {
        setEnrollments([]);
      }
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      setError('Failed to fetch enrollments');
    } finally {
      setIsLoading(false);
    }
  };

  const enrollStudent = async (studentEmail: string) => {
    if (!classId) throw new Error('No class selected');

    // First find the student by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', studentEmail)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new Error('Student not found with this email');

    // Check if student has student role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (roleError) throw roleError;
    if (!roleData || roleData.role !== 'student') {
      throw new Error('This email does not belong to a student account');
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('class_id', classId)
      .eq('student_id', profile.user_id)
      .maybeSingle();

    if (existing) throw new Error('Student is already enrolled in this class');

    // Create enrollment
    const { data, error: enrollError } = await supabase
      .from('class_enrollments')
      .insert({
        class_id: classId,
        student_id: profile.user_id,
      })
      .select()
      .single();

    if (enrollError) throw enrollError;

    await fetchEnrollments();
    return data;
  };

  const removeEnrollment = async (enrollmentId: string) => {
    const { error: deleteError } = await supabase
      .from('class_enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (deleteError) throw deleteError;

    setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
  };

  useEffect(() => {
    fetchEnrollments();
  }, [classId]);

  return {
    enrollments,
    isLoading,
    error,
    enrollStudent,
    removeEnrollment,
    refreshEnrollments: fetchEnrollments,
  };
}
