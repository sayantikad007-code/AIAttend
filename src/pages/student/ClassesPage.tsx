import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { BookOpen, MapPin, Users, Loader2 } from 'lucide-react';

interface EnrolledClass {
  id: string;
  enrolled_at: string;
  classes: {
    subject: string;
    code: string;
    room: string;
    department: string;
    semester: string;
  } | null;
}

export default function ClassesPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('class_enrollments')
          .select(`
            id,
            enrolled_at,
            classes (
              subject,
              code,
              room,
              department,
              semester
            )
          `)
          .eq('student_id', user.id)
          .order('enrolled_at', { ascending: false });

        if (error) throw error;
        setEnrollments(data || []);
      } catch (error) {
        console.error('Error fetching enrollments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrollments();
  }, [user?.id]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Classes</h1>
          <p className="text-muted-foreground">View all your enrolled courses</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : enrollments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Classes Yet</h3>
              <p className="text-muted-foreground text-center">
                You haven't enrolled in any classes yet. Use a join code to enroll in a class.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => (
              <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{enrollment.classes?.subject}</CardTitle>
                      <CardDescription>{enrollment.classes?.code}</CardDescription>
                    </div>
                    <Badge variant="secondary">{enrollment.classes?.semester}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{enrollment.classes?.room}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{enrollment.classes?.department}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Enrolled on {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
