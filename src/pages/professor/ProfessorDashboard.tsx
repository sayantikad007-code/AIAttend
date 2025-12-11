import { useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/common/StatsCard';
import { LiveAttendanceCard } from '@/components/common/LiveAttendanceCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClasses } from '@/hooks/useClasses';
import { useAttendanceRecords } from '@/hooks/useAttendanceRecords';
import { useAttendanceSessions } from '@/hooks/useAttendanceSessions';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Clock,
  Play,
  Download,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function ProfessorDashboard() {
  const { classes, isLoading } = useClasses();
  const { records } = useAttendanceRecords();
  const { sessions } = useAttendanceSessions();
  const firstClass = classes[0];

  // Transform records to LiveAttendanceCard format
  const liveRecords = useMemo(() => {
    return records.slice(0, 20).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.student?.name,
      studentRollNumber: r.student?.roll_number || undefined,
      studentPhotoUrl: r.student?.photo_url || undefined,
      timestamp: new Date(r.timestamp),
      methodUsed: r.method_used as 'face' | 'qr' | 'proximity' | 'manual',
      status: r.status as 'present' | 'absent' | 'late',
    }));
  }, [records]);

  // Calculate method distribution from real data
  const methodData = useMemo(() => {
    const total = records.length || 1;
    const face = records.filter((r) => r.method_used === 'face').length;
    const qr = records.filter((r) => r.method_used === 'qr').length;
    const proximity = records.filter((r) => r.method_used === 'proximity').length;
    const manual = records.filter((r) => r.method_used === 'manual').length;

    return [
      { method: 'Face Recognition', value: Math.round((face / total) * 100) || 0, fill: 'hsl(var(--primary))' },
      { method: 'QR Code', value: Math.round((qr / total) * 100) || 0, fill: 'hsl(var(--accent))' },
      { method: 'Proximity', value: Math.round((proximity / total) * 100) || 0, fill: 'hsl(var(--success))' },
      { method: 'Manual', value: Math.round((manual / total) * 100) || 0, fill: 'hsl(var(--muted-foreground))' },
    ];
  }, [records]);

  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const avgPercentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, avgPercentage };
  }, [records]);

  const activeSessions = sessions.filter((s) => s.is_active).length;

  // Weekly attendance chart data (placeholder - would need real date-based queries)
  const attendanceChartData = [
    { day: 'Mon', present: 0, late: 0, absent: 0 },
    { day: 'Tue', present: 0, late: 0, absent: 0 },
    { day: 'Wed', present: 0, late: 0, absent: 0 },
    { day: 'Thu', present: 0, late: 0, absent: 0 },
    { day: 'Fri', present: 0, late: 0, absent: 0 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Active Session Banner */}
        <div className="rounded-2xl gradient-bg p-6 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Play className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{firstClass?.subject || 'No Active Session'}</h2>
                  {firstClass && <Badge className="bg-white/20 border-white/30">Ready</Badge>}
                </div>
                <p className="text-sm text-white/80">
                  {firstClass ? `${firstClass.code} • Room ${firstClass.room}` : 'Create a class to get started'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-3xl font-bold">{classes.length}</p>
                <p className="text-sm text-white/80">Classes</p>
              </div>
              <Button variant="glass" asChild className="bg-white/10 hover:bg-white/20 border-white/20">
                <Link to="/professor/qr-sessions">
                  Start Session
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Records"
            value={attendanceStats.total.toString()}
            subtitle="Attendance entries"
            icon={Users}
            variant="primary"
          />
          <StatsCard
            title="Active Classes"
            value={isLoading ? '...' : classes.length.toString()}
            subtitle="This semester"
            icon={BookOpen}
            variant="default"
          />
          <StatsCard
            title="Avg. Attendance"
            value={`${attendanceStats.avgPercentage}%`}
            subtitle="Present rate"
            icon={TrendingUp}
            variant="success"
          />
          <StatsCard
            title="Active Sessions"
            value={activeSessions.toString()}
            subtitle={activeSessions > 0 ? 'In progress' : 'Start a session'}
            icon={Clock}
            variant="accent"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Live Attendance Feed */}
          <div className="lg:col-span-2">
            <LiveAttendanceCard records={liveRecords} />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Check-in Methods */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold text-lg mb-4">Check-in Methods</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {methodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {methodData.map((item) => (
                  <div key={item.method} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-muted-foreground">{item.method}</span>
                    <span className="font-medium ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/professor/qr-sessions">
                    <Calendar className="w-4 h-4 mr-2" />
                    Generate Session QR
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/professor/reports">
                    <Download className="w-4 h-4 mr-2" />
                    Export Today's Report
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/professor/classes">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Manage Classes
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Chart */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg">Weekly Attendance Overview</h3>
              <p className="text-sm text-muted-foreground">Attendance breakdown by status</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/professor/reports">View Full Report</Link>
            </Button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="present" name="Present" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" name="Late" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Classes List */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg">Your Classes</h3>
              <p className="text-sm text-muted-foreground">Manage and monitor your courses</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/professor/classes">View All</Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {isLoading ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">Loading classes...</div>
            ) : classes.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <p>No classes yet.</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/professor/classes">Create Your First Class</Link>
                </Button>
              </div>
            ) : (
              classes.slice(0, 4).map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all duration-300 bg-secondary/30"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge variant="outline" className="mb-2">{cls.code}</Badge>
                      <h4 className="font-medium">{cls.subject}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">--</p>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{cls.room}</span>
                    <span>•</span>
                    <span>{cls.semester}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}