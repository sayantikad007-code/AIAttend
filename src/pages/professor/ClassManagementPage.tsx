import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useClasses, Class } from '@/hooks/useClasses';
import { useEnrollments } from '@/hooks/useEnrollments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Plus,
  Users,
  BookOpen,
  UserPlus,
  Trash2,
  Loader2,
  GraduationCap,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function ClassManagementPage() {
  const { classes, isLoading: classesLoading, createClass, refreshClasses } = useClasses();
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const { enrollments, isLoading: enrollmentsLoading, enrollStudent, removeEnrollment } = useEnrollments(selectedClass?.id);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newClass, setNewClass] = useState({
    subject: '',
    code: '',
    department: '',
    semester: '',
    room: '',
  });
  
  const [studentEmail, setStudentEmail] = useState('');

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.subject || !newClass.code || !newClass.department || !newClass.semester || !newClass.room) {
      toast.error('Please fill all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await createClass(newClass);
      toast.success('Class created successfully');
      setIsCreateDialogOpen(false);
      setNewClass({ subject: '', code: '', department: '', semester: '', room: '' });
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error('Failed to create class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.trim()) {
      toast.error('Please enter a student email');
      return;
    }

    setIsSubmitting(true);
    try {
      await enrollStudent(studentEmail.trim());
      toast.success('Student enrolled successfully');
      setStudentEmail('');
      setIsEnrollDialogOpen(false);
    } catch (error: any) {
      console.error('Error enrolling student:', error);
      toast.error(error.message || 'Failed to enroll student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string, studentName?: string) => {
    try {
      await removeEnrollment(enrollmentId);
      toast.success(`${studentName || 'Student'} removed from class`);
    } catch (error) {
      console.error('Error removing enrollment:', error);
      toast.error('Failed to remove student');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Class Management</h1>
            <p className="text-muted-foreground">Create classes and manage enrolled students</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg">
                <Plus className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Add a new class to your teaching schedule
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Name</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Data Structures"
                    value={newClass.subject}
                    onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Course Code</Label>
                    <Input
                      id="code"
                      placeholder="e.g., CS201"
                      value={newClass.code}
                      onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Room</Label>
                    <Input
                      id="room"
                      placeholder="e.g., B-204"
                      value={newClass.room}
                      onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="e.g., Computer Science"
                      value={newClass.department}
                      onChange={(e) => setNewClass({ ...newClass, department: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="semester">Semester</Label>
                    <Input
                      id="semester"
                      placeholder="e.g., Fall 2024"
                      value={newClass.semester}
                      onChange={(e) => setNewClass({ ...newClass, semester: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Class
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Classes List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Your Classes
            </h2>
            
            {classesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : classes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No classes yet</p>
                  <p className="text-sm text-muted-foreground">Create your first class to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {classes.map((cls) => (
                  <Card
                    key={cls.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedClass?.id === cls.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedClass(cls)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-2">{cls.code}</Badge>
                          <h3 className="font-medium">{cls.subject}</h3>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {cls.room}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {cls.semester}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Enrolled Students */}
          <div className="lg:col-span-2">
            {selectedClass ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Enrolled Students
                      </CardTitle>
                      <CardDescription>
                        {selectedClass.subject} ({selectedClass.code})
                      </CardDescription>
                    </div>
                    <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Student
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Enroll Student</DialogTitle>
                          <DialogDescription>
                            Add a student to {selectedClass.subject}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEnrollStudent} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="studentEmail">Student Email</Label>
                            <Input
                              id="studentEmail"
                              type="email"
                              placeholder="student@university.edu"
                              value={studentEmail}
                              onChange={(e) => setStudentEmail(e.target.value)}
                            />
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Enroll Student
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {enrollmentsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : enrollments.length === 0 ? (
                    <div className="text-center py-12">
                      <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No students enrolled</p>
                      <p className="text-sm text-muted-foreground">Add students to this class</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Roll Number</TableHead>
                          <TableHead>Enrolled</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrollments.map((enrollment) => (
                          <TableRow key={enrollment.id}>
                            <TableCell className="font-medium">
                              {enrollment.student?.name || 'Unknown'}
                            </TableCell>
                            <TableCell>{enrollment.student?.email || '-'}</TableCell>
                            <TableCell>{enrollment.student?.roll_number || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(enrollment.enrolled_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemoveEnrollment(enrollment.id, enrollment.student?.name)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full min-h-[400px] flex items-center justify-center">
                <CardContent className="text-center">
                  <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">Select a Class</h3>
                  <p className="text-muted-foreground">
                    Choose a class from the list to view and manage enrolled students
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
