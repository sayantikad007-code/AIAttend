import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActiveSession {
  id: string;
  class_id: string;
  date: string;
  start_time: string;
  is_active: boolean;
  classes: {
    id: string;
    subject: string;
    code: string;
    room: string;
  };
}

export function useStudentSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchActiveSessions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          class_id,
          date,
          start_time,
          is_active,
          classes (
            id,
            subject,
            code,
            room
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSessions(data as ActiveSession[] || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to fetch attendance sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('student-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_sessions',
        },
        (payload) => {
          console.log('Real-time session update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new.is_active) {
            // Fetch the full session with class info
            fetchActiveSessions();
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.is_active === false) {
              // Session ended - remove from list
              setSessions((prev) => prev.filter((s) => s.id !== payload.new.id));
            } else {
              // Session updated - refresh
              fetchActiveSessions();
            }
          } else if (payload.eventType === 'DELETE') {
            setSessions((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    sessions,
    isLoading,
    error,
    refreshSessions: fetchActiveSessions,
  };
}
