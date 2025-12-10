import { useStudentSessions } from '@/hooks/useStudentSessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Radio, Clock, MapPin, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActiveSessionsCardProps {
  onSelectSession?: (sessionId: string, classInfo: { subject: string; code: string; room: string }) => void;
  className?: string;
}

export function ActiveSessionsCard({ onSelectSession, className }: ActiveSessionsCardProps) {
  const { sessions, isLoading, error } = useStudentSessions();

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading Sessions...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive/50", className)}>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className={cn("border-muted", className)}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-muted-foreground mb-2">No Active Sessions</h3>
            <p className="text-sm text-muted-foreground">
              Check back when your professor starts an attendance session
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </span>
          Active Attendance Sessions
          <Badge variant="secondary" className="ml-auto">
            {sessions.length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">
                  {session.classes?.subject || 'Unknown Class'}
                </h4>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3" />
                    {session.classes?.code || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {session.classes?.room || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {session.start_time?.slice(0, 5)}
                  </span>
                </div>
              </div>
              {onSelectSession && (
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => onSelectSession(session.id, {
                    subject: session.classes?.subject || 'Unknown',
                    code: session.classes?.code || '',
                    room: session.classes?.room || '',
                  })}
                >
                  <QrCode className="w-4 h-4 mr-1" />
                  Check In
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
