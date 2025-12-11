import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ScanFace,
  GraduationCap,
  UserCog,
  BarChart3,
  PlayCircle,
  History,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Student: 4 items - Dashboard, Check In, My Classes, Attendance
const studentNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/student' },
  { icon: ScanFace, label: 'Check In', path: '/student/check-in' },
  { icon: BookOpen, label: 'My Classes', path: '/student/classes' },
  { icon: History, label: 'Attendance', path: '/student/attendance' },
];

// Professor: 4 items - Dashboard, Sessions, Classes, Reports
const professorNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/professor' },
  { icon: PlayCircle, label: 'Sessions', path: '/professor/sessions' },
  { icon: BookOpen, label: 'Classes', path: '/professor/classes' },
  { icon: BarChart3, label: 'Reports', path: '/professor/reports' },
];

// Admin: 5 items - Dashboard, Students, Faculty, Classes, Analytics
const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: GraduationCap, label: 'Students', path: '/admin/students' },
  { icon: UserCog, label: 'Faculty', path: '/admin/faculty' },
  { icon: BookOpen, label: 'Classes', path: '/admin/classes' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = user?.role === 'student' 
    ? studentNavItems 
    : user?.role === 'professor' 
    ? professorNavItems 
    : adminNavItems;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabel = user?.role === 'student' 
    ? 'Student' 
    : user?.role === 'professor' 
    ? 'Professor' 
    : 'Administrator';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-card-solid h-16 flex items-center justify-between px-4">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <ScanFace className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">AttendEase</span>
        </Link>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 glass-card-solid transform transition-transform duration-300 lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-glow-sm">
              <ScanFace className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">AttendEase</h1>
              <p className="text-xs text-muted-foreground">{roleLabel} Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "gradient-bg text-primary-foreground shadow-md"
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    !isActive && "group-hover:scale-110"
                  )} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 items-center justify-between px-8 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <div>
            <h2 className="font-semibold text-lg">
              {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary transition-colors">
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarImage src={user?.photoURL} alt={user?.name} />
                    <AvatarFallback className="gradient-bg text-primary-foreground text-sm">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-medium text-sm">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/${user?.role}/profile`)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
