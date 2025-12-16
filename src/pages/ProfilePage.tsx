import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User, Mail, Building, Hash, Camera, ScanFace, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastVerificationImage, setLastVerificationImage] = useState<string | null>(null);
  const [lastVerificationTime, setLastVerificationTime] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    roll_number: '',
    employee_id: '',
    photo_url: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        roll_number: user.rollNumber || '',
        employee_id: user.employeeId || '',
        photo_url: user.photoURL || '',
      });
    }
  }, [user]);

  useEffect(() => {
    // Load last verification image from localStorage
    const storedImage = localStorage.getItem('lastVerificationImage');
    const storedTime = localStorage.getItem('lastVerificationTime');
    if (storedImage) {
      setLastVerificationImage(storedImage);
      setLastVerificationTime(storedTime);
    }
  }, []);

  const clearVerificationImage = () => {
    localStorage.removeItem('lastVerificationImage');
    localStorage.removeItem('lastVerificationTime');
    setLastVerificationImage(null);
    setLastVerificationTime(null);
    toast({
      title: 'Cleared',
      description: 'Verification image has been removed.',
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Update via auth context (handles both DB and local state)
      await updateUser({
        name: formData.name,
        department: formData.department || undefined,
        rollNumber: formData.roll_number || undefined,
        employeeId: formData.employee_id || undefined,
        photoURL: formData.photo_url || undefined,
      });

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabel = user?.role === 'student' 
    ? 'Student' 
    : user?.role === 'professor' 
    ? 'Professor' 
    : 'Administrator';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-primary/20">
                <AvatarImage src={formData.photo_url} alt={formData.name} />
                <AvatarFallback className="gradient-bg text-primary-foreground text-2xl">
                  {formData.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{formData.name || 'Your Name'}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {roleLabel}
                  </span>
                  <span>{formData.email}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Last Face Verification Image */}
        {lastVerificationImage && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanFace className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Last Face Verification</CardTitle>
                    {lastVerificationTime && (
                      <CardDescription>
                        Captured: {format(new Date(lastVerificationTime), 'PPpp')}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearVerificationImage}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                <img 
                  src={lastVerificationImage} 
                  alt="Last face verification" 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This is the image used for your last face verification check-in
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    Department
                  </Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    placeholder="e.g., Computer Science"
                  />
                </div>

                {user?.role === 'student' && (
                  <div className="space-y-2">
                    <Label htmlFor="roll_number" className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      Roll Number
                    </Label>
                    <Input
                      id="roll_number"
                      value={formData.roll_number}
                      onChange={(e) => handleChange('roll_number', e.target.value)}
                      placeholder="e.g., CS2024001"
                    />
                  </div>
                )}

                {(user?.role === 'professor' || user?.role === 'admin') && (
                  <div className="space-y-2">
                    <Label htmlFor="employee_id" className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      Employee ID
                    </Label>
                    <Input
                      id="employee_id"
                      value={formData.employee_id}
                      onChange={(e) => handleChange('employee_id', e.target.value)}
                      placeholder="e.g., EMP001"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="photo_url" className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    Photo URL
                  </Label>
                  <Input
                    id="photo_url"
                    value={formData.photo_url}
                    onChange={(e) => handleChange('photo_url', e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                  />
                  <p className="text-xs text-muted-foreground">Enter a URL to your profile photo</p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
