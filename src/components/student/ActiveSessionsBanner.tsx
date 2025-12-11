import { Link } from 'react-router-dom';
import { useStudentSessions } from '@/hooks/useStudentSessions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScanFace, Clock, MapPin, ArrowRight, Radio } from 'lucide-react';
import { format } from 'date-fns';

export function ActiveSessionsBanner() {
  const { sessions, isLoading, error } = useStudentSessions();

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (error || sessions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Radio className="w-5 h-5 text-green-500" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
        <span className="font-semibold text-green-700 dark:text-green-400">
          {sessions.length} Active Session{sessions.length > 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-2">
        {sessions.slice(0, 3).map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background/80 border border-border"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{session.classes?.subject}</span>
                <Badge variant="outline" className="shrink-0">
                  {session.classes?.code}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {session.classes?.room}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Started {format(new Date(`1970-01-01T${session.start_time}`), 'h:mm a')}
                </span>
              </div>
            </div>
            <Button size="sm" asChild className="shrink-0">
              <Link to="/student/check-in">
                <ScanFace className="w-4 h-4 mr-1" />
                Check In
              </Link>
            </Button>
          </div>
        ))}
        
        {sessions.length > 3 && (
          <Button variant="ghost" size="sm" asChild className="w-full">
            <Link to="/student/check-in" className="flex items-center gap-2">
              View all {sessions.length} sessions
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
