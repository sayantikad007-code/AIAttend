import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/common/StatsCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ScanFace, 
  Calendar, 
  CheckCircle2, 
  BookOpen,
  TrendingUp,
  ArrowRight,
  Camera,
  AlertCircle,
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
import { useStudentStats } from '@/hooks/useStudentStats';
import { ActiveSessionsBanner } from '@/components/student/ActiveSessionsBanner';
import { JoinClassCard } from '@/components/student/JoinClassCard';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { courses, stats, weeklyData, isLoading, faceRegistered, refreshStats } = useStudentStats();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Active Sessions Banner */}
        <ActiveSessionsBanner />
        {/* Face Registration Status Banner */}
        {faceRegistered === false && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10">
            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-orange-600 dark:text-orange-400">Face not registered</p>
              <p className="text-sm text-muted-foreground">Register your face to enable quick check-in for attendance.</p>
            </div>
            <Button size="sm" asChild>
              <Link to="/student/face-registration">
                <Camera className="w-4 h-4 mr-2" />
                Register Now
              </Link>
            </Button>
          </div>
        )}

        {/* Welcome Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-4 border-primary/20 shadow-glow-sm">
                <AvatarImage src={user?.photoURL} alt={user?.name} />
                <AvatarFallback className="gradient-bg text-primary-foreground text-xl">
                  {user?.name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>
              {faceRegistered !== null && (
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${faceRegistered ? 'bg-green-500' : 'bg-orange-500'}`}>
                  {faceRegistered ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-white" />
                  )}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Good morning, {user?.name?.split(' ')[0]}!</h1>
                {faceRegistered && (
                  <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Face Verified
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {stats.overallAttendance >= 75 
                  ? "Your attendance is looking great!" 
                  : stats.overallAttendance > 0 
                    ? "Keep up with your attendance!" 
                    : "Ready for today's classes?"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {!faceRegistered && (
              <Button variant="outline" asChild>
                <Link to="/student/face-registration">
                  <Camera className="w-4 h-4 mr-2" />
                  Register Face
                </Link>
              </Button>
            )}
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
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </>
          ) : (
            <>
              <StatsCard
                title="Overall Attendance"
                value={`${stats.overallAttendance}%`}
                subtitle="This semester"
                icon={TrendingUp}
                variant="primary"
              />
              <StatsCard
                title="Classes Today"
                value={stats.todayClasses.toString()}
                subtitle="Scheduled"
                icon={Calendar}
                variant="default"
              />
              <StatsCard
                title="Present Days"
                value={stats.totalPresent.toString()}
                subtitle={`of ${stats.totalSessions} sessions`}
                icon={CheckCircle2}
                variant="success"
              />
              <StatsCard
                title="Enrolled Courses"
                value={stats.enrolledCourses.toString()}
                subtitle="Active courses"
                icon={BookOpen}
                variant="accent"
              />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Enrolled Courses & Attendance Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enrolled Courses */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-lg">Enrolled Courses</h3>
                  <p className="text-sm text-muted-foreground">Your course attendance breakdown</p>
                </div>
                <JoinClassCard onJoined={refreshStats} />
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                </div>
              ) : courses.length > 0 ? (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <div key={course.id} className="p-4 rounded-xl border border-border bg-background/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{course.subject}</h4>
                          <p className="text-sm text-muted-foreground">{course.code} • {course.room}</p>
                        </div>
                        <Badge 
                          variant={course.attendancePercentage >= 75 ? "default" : "destructive"}
                          className={course.attendancePercentage >= 75 ? "bg-green-500/10 text-green-600 border-green-500/30" : ""}
                        >
                          {course.attendancePercentage}%
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{course.attendedSessions} of {course.totalSessions} sessions attended</span>
                          <span>{course.attendancePercentage >= 75 ? "Good standing" : "Needs attention"}</span>
                        </div>
                        <Progress 
                          value={course.attendancePercentage} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>You're not enrolled in any courses yet</p>
                  <p className="text-sm mt-1">Contact your professor to get enrolled</p>
                </div>
              )}
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
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Attendance']}
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
            {/* Quick Stats */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold text-lg mb-4">Attendance Summary</h3>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-12 rounded-lg" />
                </div>
              ) : stats.totalSessions > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Present</span>
                    </div>
                    <span className="font-semibold text-green-600">{stats.totalPresent}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm">Absent</span>
                    </div>
                    <span className="font-semibold text-red-600">{stats.totalSessions - stats.totalPresent}</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Sessions</span>
                      <span className="font-medium">{stats.totalSessions}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No attendance data yet</p>
                </div>
              )}
            </div>

            {/* Course Status */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold text-lg mb-4">Course Status</h3>
              {isLoading ? (
                <Skeleton className="h-24 rounded-lg" />
              ) : courses.length > 0 ? (
                <div className="space-y-3">
                  {courses.slice(0, 3).map((course) => (
                    <div key={course.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${course.attendancePercentage >= 75 ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm truncate max-w-[120px]">{course.code}</span>
                      </div>
                      <span className={`text-sm font-medium ${course.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                        {course.attendancePercentage}%
                      </span>
                    </div>
                  ))}
                  {courses.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{courses.length - 3} more courses
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No courses enrolled</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
