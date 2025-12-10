import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, ScanFace, QrCode, Wifi } from 'lucide-react';

interface AttendanceRecordWithStudent {
  id: string;
  studentId: string;
  studentName?: string;
  studentRollNumber?: string;
  studentPhotoUrl?: string;
  timestamp: Date;
  methodUsed: 'face' | 'qr' | 'proximity' | 'manual';
  status: 'present' | 'absent' | 'late';
}

interface LiveAttendanceCardProps {
  records: AttendanceRecordWithStudent[];
  className?: string;
}

const methodIcons = {
  face: ScanFace,
  qr: QrCode,
  proximity: Wifi,
  manual: CheckCircle2,
};

const statusColors = {
  present: 'bg-success/10 text-success border-success/20',
  late: 'bg-warning/10 text-warning border-warning/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function LiveAttendanceCard({ records, className }: LiveAttendanceCardProps) {
  const [animatedRecords, setAnimatedRecords] = useState<AttendanceRecordWithStudent[]>([]);

  useEffect(() => {
    // Animate records appearing one by one
    records.forEach((record, index) => {
      setTimeout(() => {
        setAnimatedRecords(prev => {
          if (prev.find(r => r.id === record.id)) return prev;
          return [...prev, record];
        });
      }, index * 200);
    });
  }, [records]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-lg">Live Check-ins</h3>
          <p className="text-sm text-muted-foreground">Real-time attendance feed</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </span>
          <span className="text-sm font-medium text-success">Live</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {animatedRecords.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Waiting for check-ins...</p>
          </div>
        ) : (
          animatedRecords.map((record, index) => {
            const MethodIcon = methodIcons[record.methodUsed];
            
            return (
              <div
                key={record.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Avatar className="h-10 w-10 border-2 border-background">
                  <AvatarImage src={record.studentPhotoUrl} alt={record.studentName} />
                  <AvatarFallback className="gradient-bg text-primary-foreground text-sm">
                    {record.studentName?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{record.studentName || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{record.studentRollNumber}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MethodIcon className="w-3.5 h-3.5" />
                    <span className="capitalize">{record.methodUsed}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs capitalize", statusColors[record.status])}
                  >
                    {record.status}
                  </Badge>
                </div>

                <span className="text-xs text-muted-foreground">
                  {formatTime(record.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}