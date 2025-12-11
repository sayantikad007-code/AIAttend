import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AttendanceRecord {
  id: string;
  session_id: string;
  class_id: string;
  student_id: string;
  timestamp: string;
  method_used: string;
  status: string;
  verification_score: number | null;
  student?: {
    name: string;
    roll_number: string | null;
    photo_url: string | null;
  };
  class?: {
    subject: string;
    code: string;
  };
}

export function useAttendanceRecords(classId?: string, sessionId?: string) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRecords = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          id,
          session_id,
          class_id,
          student_id,
          timestamp,
          method_used,
          status,
          verification_score,
          classes (
            subject,
            code
          )
        `)
        .order('timestamp', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Fetch student profiles separately
      const studentIds = [...new Set((data || []).map((r: any) => r.student_id))];
      let profilesMap: Record<string, any> = {};
      
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, roll_number, photo_url')
          .in('user_id', studentIds);
        
        profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.user_id] = p;
          return acc;
        }, {});
      }

      const formattedRecords = (data || []).map((record: any) => ({
        ...record,
        student: profilesMap[record.student_id] || null,
        class: record.classes,
      }));

      setRecords(formattedRecords);
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      setError('Failed to fetch attendance records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [user, classId, sessionId]);

  // Real-time subscription for new records
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('attendance-records-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records',
        },
        async (payload) => {
          // Fetch the complete record
          const { data: record } = await supabase
            .from('attendance_records')
            .select(`
              id,
              session_id,
              class_id,
              student_id,
              timestamp,
              method_used,
              status,
              verification_score,
              classes (
                subject,
                code
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (record) {
            // Fetch student profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, name, roll_number, photo_url')
              .eq('user_id', record.student_id)
              .single();

            const newRecord = {
              ...record,
              student: profile || null,
              class: (record as any).classes,
            };

            // Only add if matches current filter
            if ((!classId || newRecord.class_id === classId) &&
                (!sessionId || newRecord.session_id === sessionId)) {
              setRecords((prev) => [newRecord as AttendanceRecord, ...prev]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, classId, sessionId]);

  return {
    records,
    isLoading,
    error,
    refreshRecords: fetchRecords,
  };
}
