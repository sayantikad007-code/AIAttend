import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClasses } from '@/hooks/useClasses';
import { useAttendanceRecords } from '@/hooks/useAttendanceRecords';
import { Download, FileText, Calendar, Users, ScanFace, QrCode, Wifi, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const methodIcons: Record<string, any> = {
  face: ScanFace,
  qr: QrCode,
  proximity: Wifi,
  manual: CheckCircle2,
};

const statusColors: Record<string, string> = {
  present: 'bg-success/10 text-success border-success/20',
  late: 'bg-warning/10 text-warning border-warning/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function AttendanceReportsPage() {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const { classes, isLoading: classesLoading } = useClasses();
  const { records, isLoading: recordsLoading } = useAttendanceRecords(selectedClassId === 'all' ? undefined : selectedClassId);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const stats = {
    total: records.length,
    present: records.filter((r) => r.status === 'present').length,
    late: records.filter((r) => r.status === 'late').length,
    absent: records.filter((r) => r.status === 'absent').length,
  };

  const methodStats = {
    face: records.filter((r) => r.method_used === 'face').length,
    qr: records.filter((r) => r.method_used === 'qr').length,
    proximity: records.filter((r) => r.method_used === 'proximity').length,
    manual: records.filter((r) => r.method_used === 'manual').length,
  };

  const downloadCSV = () => {
    if (records.length === 0) return;

    const headers = ['Student Name', 'Roll Number', 'Date', 'Time', 'Method', 'Status'];
    const rows = records.map((r) => [
      r.student?.name || 'Unknown',
      r.student?.roll_number || '-',
      format(new Date(r.timestamp), 'yyyy-MM-dd'),
      format(new Date(r.timestamp), 'HH:mm:ss'),
      r.method_used,
      r.status,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedClass?.code || 'all-classes'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Attendance Reports</h1>
            <p className="text-muted-foreground">View and export attendance records</p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.code} - {cls.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={downloadCSV} disabled={records.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.present}</p>
                  <p className="text-sm text-muted-foreground">Present</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.late}</p>
                  <p className="text-sm text-muted-foreground">Late</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <FileText className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.absent}</p>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Method Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Check-in Methods Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(methodStats).map(([method, count]) => {
                const Icon = methodIcons[method];
                return (
                  <div key={method} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{count}</p>
                      <p className="text-sm text-muted-foreground capitalize">{method}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {recordsLoading || classesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading records...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No attendance records found</p>
                <p className="text-sm">Records will appear here once students check in</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => {
                      const Icon = methodIcons[record.method_used] || CheckCircle2;
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.student?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>{record.student?.roll_number || '-'}</TableCell>
                          <TableCell>{record.class?.code || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(record.timestamp), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-4 h-4" />
                              <span className="capitalize">{record.method_used}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColors[record.status] || ''}
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
