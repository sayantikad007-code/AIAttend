import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ScanFace, Mail, Lock, User, Building2, ArrowLeft, Loader2, Hash } from 'lucide-react';
import { registerSchema } from '@/lib/validations/auth';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'professor',
    department: '',
    rollNumber: '',
    employeeId: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with Zod schema
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: "Validation error",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await register(
        result.data.email, 
        result.data.password, 
        result.data.name, 
        result.data.role,
        {
          department: result.data.department || '',
          rollNumber: result.data.rollNumber || '',
          employeeId: result.data.employeeId || '',
        }
      );

      if (error) {
        let errorMessage = "Please try again or contact support.";
        
        if (error.message.includes('User already registered')) {
          errorMessage = "An account with this email already exists. Please sign in.";
        } else if (error.message.includes('Password')) {
          errorMessage = error.message;
        } else if (error.message.includes('Email')) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Registration failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account created!",
          description: "Welcome to AttendEase. Your account has been created successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const departments = [
    'Computer Science',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Business Administration',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Economics',
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 gradient-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-primary-foreground">
          <div className="max-w-md text-center space-y-8">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 animate-float">
              <ScanFace className="w-14 h-14" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold">Join AttendEase</h1>
              <p className="text-xl text-white/80">
                Start your journey with AI-powered attendance tracking
              </p>
            </div>
            <div className="space-y-4 text-left pt-8">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ScanFace className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">Face Recognition</div>
                  <div className="text-sm text-white/70">Quick & secure check-in</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">QR Backup</div>
                  <div className="text-sm text-white/70">Alternative check-in method</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">Multi-Department</div>
                  <div className="text-sm text-white/70">Works across all faculties</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-6 animate-fade-in py-8">
          <div className="lg:hidden flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-glow">
              <ScanFace className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Create an account</h2>
            <p className="text-muted-foreground">
              Fill in your details to get started
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="name"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@university.edu"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                  maxLength={255}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Select value={formData.department} onValueChange={(v) => handleChange('department', v)}>
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.role === 'student' && (
              <div className="space-y-2">
                <Label htmlFor="rollNumber">Roll Number</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="rollNumber"
                    placeholder="CS2024001"
                    value={formData.rollNumber}
                    onChange={(e) => handleChange('rollNumber', e.target.value)}
                    className="pl-10"
                    maxLength={50}
                  />
                </div>
              </div>
            )}

            {formData.role === 'professor' && (
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="employeeId"
                    placeholder="EMP001"
                    value={formData.employeeId}
                    onChange={(e) => handleChange('employeeId', e.target.value)}
                    className="pl-10"
                    maxLength={50}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="new-password"
                    maxLength={128}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="new-password"
                    maxLength={128}
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="gradient" 
              size="lg" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
