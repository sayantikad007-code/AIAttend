import { useState, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { QRScanner } from '@/components/attendance/QRScanner';
import { ActiveSessionsCard } from '@/components/student/ActiveSessionsCard';
import { 
  ScanFace, 
  Camera, 
  QrCode, 
  Wifi, 
  CheckCircle2, 
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CheckInMethod = 'face' | 'qr' | 'proximity';
type CheckInStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

interface SelectedClass {
  subject: string;
  code: string;
  room: string;
}

export default function CheckInPage() {
  const [selectedMethod, setSelectedMethod] = useState<CheckInMethod>('qr');
  const [status, setStatus] = useState<CheckInStatus>('idle');
  const [verificationScore, setVerificationScore] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<SelectedClass | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const handleSelectSession = (sessionId: string, classInfo: SelectedClass) => {
    setSelectedClass(classInfo);
    setSelectedMethod('qr');
    setStatus('idle');
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus('scanning');
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to use face recognition.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleFaceVerification = async () => {
    setStatus('processing');
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const score = 0.85 + Math.random() * 0.14; // 85-99% similarity
    setVerificationScore(score);
    
    if (score >= 0.85) {
      setStatus('success');
      stopCamera();
      toast({
        title: "Check-in successful!",
        description: `Verified with ${(score * 100).toFixed(1)}% confidence.`,
      });
    } else {
      setStatus('error');
      toast({
        title: "Verification failed",
        description: "Face not recognized. Please try again or use QR code.",
        variant: "destructive",
      });
    }
  };

  const handleQRCheckIn = async () => {
    setStatus('processing');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setStatus('success');
    toast({
      title: "Check-in successful!",
      description: "QR code verified successfully.",
    });
  };

  const handleProximityCheckIn = async () => {
    setStatus('processing');
    await new Promise(resolve => setTimeout(resolve, 2000));
    setStatus('success');
    toast({
      title: "Check-in successful!",
      description: "Proximity verified. You're in range of the classroom.",
    });
  };

  const resetCheckIn = () => {
    setStatus('idle');
    setVerificationScore(null);
    stopCamera();
  };

  const methods = [
    { 
      id: 'face' as CheckInMethod, 
      icon: ScanFace, 
      label: 'Face Recognition',
      description: 'Recommended - Quick & secure',
      color: 'primary',
    },
    { 
      id: 'qr' as CheckInMethod, 
      icon: QrCode, 
      label: 'QR Code',
      description: 'Backup method',
      color: 'accent',
    },
    { 
      id: 'proximity' as CheckInMethod, 
      icon: Wifi, 
      label: 'Proximity',
      description: 'Bluetooth/WiFi detection',
      color: 'success',
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Verification
          </div>
          <h1 className="text-3xl font-bold mb-2">Quick Check-in</h1>
          <p className="text-muted-foreground">Choose your preferred method to mark attendance</p>
        </div>

        {/* Active Sessions - Real-time */}
        <ActiveSessionsCard onSelectSession={handleSelectSession} />

        {/* Selected Class Info */}
        {selectedClass && (
          <div className="rounded-2xl gradient-bg p-6 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Selected Class</p>
                <h2 className="text-xl font-bold">{selectedClass.subject}</h2>
                <p className="text-sm text-white/80">{selectedClass.code} • {selectedClass.room}</p>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">
                Ready to Check In
              </Badge>
            </div>
          </div>
        )}

        {/* Method Selection */}
        <div className="grid grid-cols-3 gap-4">
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => {
                setSelectedMethod(method.id);
                resetCheckIn();
              }}
              disabled={status === 'processing'}
              className={cn(
                "p-6 rounded-2xl border-2 transition-all duration-300 text-left",
                selectedMethod === method.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                selectedMethod === method.id ? "gradient-bg" : "bg-secondary"
              )}>
                <method.icon className={cn(
                  "w-6 h-6",
                  selectedMethod === method.id ? "text-primary-foreground" : "text-muted-foreground"
                )} />
              </div>
              <h3 className="font-semibold mb-1">{method.label}</h3>
              <p className="text-sm text-muted-foreground">{method.description}</p>
            </button>
          ))}
        </div>

        {/* Check-in Area */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Face Recognition */}
          {selectedMethod === 'face' && (
            <div className="p-8">
              <div className="relative aspect-video max-w-lg mx-auto rounded-2xl overflow-hidden bg-secondary">
                {status === 'idle' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Camera preview will appear here</p>
                    <Button variant="gradient" onClick={startCamera}>
                      <Camera className="w-4 h-4 mr-2" />
                      Start Camera
                    </Button>
                  </div>
                )}

                {(status === 'scanning' || status === 'processing') && (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Face detection overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={cn(
                        "w-48 h-48 border-4 rounded-full transition-all duration-500",
                        status === 'processing' 
                          ? "border-primary animate-pulse" 
                          : "border-white/50"
                      )}>
                        <div className={cn(
                          "w-full h-full rounded-full border-4 border-dashed",
                          status === 'processing' 
                            ? "border-primary animate-spin" 
                            : "border-white/30"
                        )} style={{ animationDuration: '3s' }} />
                      </div>
                    </div>
                    {status === 'processing' && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary/90 text-primary-foreground text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying face...
                      </div>
                    )}
                  </>
                )}

                {status === 'success' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-success/10">
                    <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mb-4 animate-scale-in">
                      <CheckCircle2 className="w-12 h-12 text-success" />
                    </div>
                    <h3 className="text-xl font-bold text-success mb-2">Check-in Successful!</h3>
                    {verificationScore && (
                      <p className="text-muted-foreground">
                        Confidence: {(verificationScore * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                )}

                {status === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10">
                    <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center mb-4 animate-scale-in">
                      <AlertCircle className="w-12 h-12 text-destructive" />
                    </div>
                    <h3 className="text-xl font-bold text-destructive mb-2">Verification Failed</h3>
                    <p className="text-muted-foreground mb-4">Face not recognized</p>
                    <Button variant="outline" onClick={resetCheckIn}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                )}
              </div>

              {status === 'scanning' && (
                <div className="flex justify-center mt-6">
                  <Button variant="gradient" size="lg" onClick={handleFaceVerification}>
                    <ScanFace className="w-5 h-5 mr-2" />
                    Verify & Check In
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* QR Code */}
          {selectedMethod === 'qr' && (
            <div className="p-8">
              <QRScanner
                onSuccess={(result) => {
                  setStatus('success');
                  toast({
                    title: 'Check-in successful!',
                    description: `Marked ${result.status} for ${result.className}`,
                  });
                }}
              />
            </div>
          )}

          {/* Proximity */}
          {selectedMethod === 'proximity' && (
            <div className="p-8 text-center">
              {status === 'idle' && (
                <>
                  <div className="w-48 h-48 mx-auto relative mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-4 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                    <div className="absolute inset-8 rounded-full border-4 border-primary/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center">
                        <Wifi className="w-10 h-10 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">Detecting classroom proximity...</p>
                  <Button variant="gradient" size="lg" onClick={handleProximityCheckIn}>
                    <Wifi className="w-5 h-5 mr-2" />
                    Verify Proximity
                  </Button>
                </>
              )}

              {status === 'processing' && (
                <div className="py-12">
                  <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Scanning for classroom signal...</p>
                </div>
              )}

              {status === 'success' && (
                <div className="py-12">
                  <div className="w-24 h-24 mx-auto rounded-full bg-success/20 flex items-center justify-center mb-4 animate-scale-in">
                    <CheckCircle2 className="w-12 h-12 text-success" />
                  </div>
                  <h3 className="text-xl font-bold text-success mb-2">Check-in Successful!</h3>
                  <p className="text-muted-foreground">Proximity verified - You're in Room 301</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reset Button */}
        {status === 'success' && (
          <div className="text-center">
            <Button variant="outline" onClick={resetCheckIn}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Check in to another class
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
