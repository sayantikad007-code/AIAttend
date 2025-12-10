import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, XCircle, Loader2, Scan } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FaceCheckInProps {
  sessionId: string;
  className?: string;
  onSuccess?: () => void;
}

export function FaceCheckIn({ sessionId, className, onSuccess }: FaceCheckInProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
      setStatus('idle');
      setMatchScore(null);
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Could not access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const captureAndVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    setIsVerifying(true);
    setStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('verify-face', {
        body: { imageBase64: imageData, sessionId }
      });

      if (error) throw error;

      if (data.success) {
        setStatus('success');
        setMatchScore(data.matchScore);
        toast.success(data.message);
        stopCamera();
        onSuccess?.();
      } else {
        setStatus('error');
        setMatchScore(data.matchScore || null);
        toast.error(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      toast.error('Failed to verify face. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [sessionId, stopCamera, onSuccess]);

  const reset = () => {
    setStatus('idle');
    setMatchScore(null);
    if (!isCapturing) {
      startCamera();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Face Check-In
        </CardTitle>
        <CardDescription>
          Look at the camera to verify your identity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {isCapturing ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Camera className="h-12 w-12 opacity-50" />
            </div>
          )}
          
          {isVerifying && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
              <span className="text-sm">Verifying face...</span>
            </div>
          )}
          
          {status === 'success' && (
            <div className="absolute inset-0 bg-green-500/20 flex flex-col items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-2" />
              <span className="text-green-700 font-medium">Verified!</span>
              {matchScore && (
                <span className="text-sm text-green-600">
                  Match: {(matchScore * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}
          
          {status === 'error' && (
            <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center">
              <XCircle className="h-16 w-16 text-red-500 mb-2" />
              <span className="text-red-700 font-medium">Verification Failed</span>
              {matchScore !== null && (
                <span className="text-sm text-red-600">
                  Match: {(matchScore * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}
          
          {/* Face guide overlay */}
          {isCapturing && !isVerifying && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-60 border-2 border-dashed border-primary/50 rounded-full" />
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-muted-foreground bg-background/70 py-1">
                Position your face within the oval
              </div>
            </div>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-2">
          {!isCapturing && status === 'idle' && (
            <Button onClick={startCamera} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          )}
          
          {isCapturing && !isVerifying && (
            <>
              <Button onClick={captureAndVerify} className="flex-1">
                <Scan className="h-4 w-4 mr-2" />
                Verify & Check In
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </>
          )}
          
          {(status === 'success' || status === 'error') && !isCapturing && (
            <Button onClick={reset} className="w-full" variant={status === 'success' ? 'outline' : 'default'}>
              {status === 'success' ? 'Done' : 'Try Again'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
