import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/common/StatsCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ScanFace, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  BookOpen,
  TrendingUp,
  ArrowRight,
  MapPin,
  Camera,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const attendanceData = [
  { week: 'W1', attendance: 95 },
  { week: 'W2', attendance: 88 },
  { week: 'W3', attendance: 92 },
  { week: 'W4', attendance: 100 },
  { week: 'W5', attendance: 85 },
  { week: 'W6', attendance: 90 },
];

const upcomingClasses = [
  {
    id: '1',
    subject: 'No upcoming classes',
    code: '--',
    time: '--',
    room: '--',
    status: 'upcoming',
  },
];

const recentAttendance = [
  { subject: 'No recent attendance', date: '--', status: 'present', method: 'face' },
];

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-4 border-primary/20 shadow-glow-sm">
              <AvatarImage src={user?.photoURL} alt={user?.name} />
              <AvatarFallback className="gradient-bg text-primary-foreground text-xl">
                {user?.name?.charAt(0) || 'S'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Good morning, {user?.name?.split(' ')[0]}!</h1>
              <p className="text-muted-foreground">Ready for today's classes? Your attendance is looking great!</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/student/face-registration">
                <Camera className="w-4 h-4 mr-2" />
                Register Face
              </Link>
            </Button>
            <Button variant="gradient" size="lg" asChild className="group">
              <Link to="/student/check-in">
                <ScanFace className="w-5 h-5" />
                Quick Check-in
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Overall Attendance"
            value="--%"
            subtitle="This semester"
            icon={TrendingUp}
            variant="primary"
          />
          <StatsCard
            title="Classes Today"
            value="--"
            subtitle="Check schedule"
            icon={Calendar}
            variant="default"
          />
          <StatsCard
            title="Present Days"
            value="--"
            subtitle="This semester"
            icon={CheckCircle2}
            variant="success"
          />
          <StatsCard
            title="Enrolled Courses"
            value="--"
            subtitle="Active courses"
            icon={BookOpen}
            variant="accent"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Classes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-lg">Today's Schedule</h3>
                  <p className="text-sm text-muted-foreground">Your upcoming classes</p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/student/schedule">View all</Link>
                </Button>
              </div>

              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No classes scheduled for today</p>
                </div>
              </div>
            </div>

            {/* Attendance Chart */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-lg">Attendance Trend</h3>
                  <p className="text-sm text-muted-foreground">Weekly attendance percentage</p>
                </div>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceData}>
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[70, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="attendance" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#attendanceGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Course Progress */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold text-lg mb-4">Course Progress</h3>
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Enroll in courses to see progress</p>
              </div>
            </div>

            {/* Recent Attendance */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Recent Activity</h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/student/history">View all</Link>
                </Button>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No recent attendance records</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}