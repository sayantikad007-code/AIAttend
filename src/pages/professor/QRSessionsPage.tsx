import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { QRCodeDisplay } from '@/components/attendance/QRCodeDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClasses } from '@/hooks/useClasses';
import { useAttendanceSessions } from '@/hooks/useAttendanceSessions';
import { useToast } from '@/hooks/use-toast';
import { 
  QrCode, 
  Play, 
  StopCircle, 
  Users,
  Clock,
  Loader2,
  MapPin,
} from 'lucide-react';

export default function QRSessionsPage() {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const { classes, isLoading: classesLoading, updateClass } = useClasses();
  const { sessions, createSession, endSession, refreshSessions } = useAttendanceSessions();
  const { toast } = useToast();

  const activeSession = sessions.find(s => s.is_active && s.class_id === selectedClassId);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  const captureLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast({ 
          title: 'Location not supported', 
          description: 'Your browser does not support geolocation. Proximity check-in will use existing class location.',
          variant: 'destructive' 
        });
        resolve(null);
        return;
      }

      setLocationStatus('Capturing location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationStatus('');
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setLocationStatus('');
          console.error('Geolocation error:', error);
          toast({ 
            title: 'Location access denied', 
            description: 'Could not get your location. Proximity check-in will use existing class location.',
          });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleStartSession = async () => {
    if (!selectedClassId) {
      toast({ title: 'Error', description: 'Please select a class first', variant: 'destructive' });
      return;
    }

    setIsStarting(true);
    try {
      // Capture professor's current location for proximity verification
      const location = await captureLocation();
      
      if (location) {
        // Update class location with professor's current position
        await updateClass(selectedClassId, {
          latitude: location.latitude,
          longitude: location.longitude,
        });
        toast({ 
          title: 'Location captured', 
          description: 'Classroom location updated for proximity check-in',
        });
      }

      await createSession(selectedClassId);
      toast({ title: 'Session started', description: 'QR code is now active for students' });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({ title: 'Error', description: 'Failed to start session', variant: 'destructive' });
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    try {
      await endSession(activeSession.id);
      toast({ title: 'Session ended', description: 'Attendance session has been closed' });
    } catch (error) {
      console.error('Error ending session:', error);
      toast({ title: 'Error', description: 'Failed to end session', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <QrCode className="w-4 h-4" />
            QR Attendance
          </div>
          <h1 className="text-3xl font-bold mb-2">Generate QR Code</h1>
          <p className="text-muted-foreground">Create a QR code for students to check in</p>
        </div>

        {/* Class Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Class
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={classesLoading ? 'Loading classes...' : 'Select a class'} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.subject} ({cls.code}) - Room {cls.room}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {classes.length === 0 && !classesLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No classes found. Create a class first to generate QR codes.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Session Control */}
        {selectedClassId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Session Control
                </span>
                {activeSession && (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                    Active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeSession ? (
                <div className="space-y-3">
                  {locationStatus && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 animate-pulse" />
                      {locationStatus}
                    </div>
                  )}
                  <Button 
                    onClick={handleStartSession} 
                    disabled={isStarting}
                    className="w-full"
                    size="lg"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {locationStatus || 'Starting...'}
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Attendance Session
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Your location will be captured for proximity check-in
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-600 font-medium">
                      Session is active. Students can now scan the QR code below.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started at {activeSession.start_time}
                    </p>
                  </div>
                  <Button 
                    onClick={handleEndSession} 
                    variant="destructive"
                    className="w-full"
                    size="lg"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* QR Code Display */}
        {activeSession && selectedClass && (
          <QRCodeDisplay 
            sessionId={activeSession.id} 
            className={`${selectedClass.subject} (${selectedClass.code})`}
          />
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Select a class from the dropdown above</li>
              <li>Click "Start Attendance Session" to generate a QR code</li>
              <li>Display the QR code on your screen for students to scan</li>
              <li>The QR code auto-refreshes every 30 seconds for security</li>
              <li>Students scan with their phone camera to check in</li>
              <li>Click "End Session" when done taking attendance</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
