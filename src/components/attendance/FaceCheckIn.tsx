import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, XCircle, Loader2, Scan, AlertCircle, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FaceCheckInProps {
  sessionId: string;
  className?: string;
  onSuccess?: () => void;
}

type StatusType = 'idle' | 'success' | 'already_checked_in' | 'error';


export function FaceCheckIn({ sessionId, className, onSuccess }: FaceCheckInProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<StatusType>('idle');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper to get current GPS position (used to sync proximity with face recognition)
  const getCurrentPosition = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          let errorMessage = 'Unable to retrieve your location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable GPS for face check-in.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const ensureLocationPermission = async () => {
    try {
      const position = await getCurrentPosition();
      return position;
    } catch (error: any) {
      const message = error?.message || 'Location permission is required for face check-in.';
      toast.error(message);
      throw error;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setCameraReady(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    setIsCapturing(true);
    setStatus('idle');
    setMatchScore(null);
    setStatusMessage('');

    try {
      // Prompt for GPS as soon as face check-in starts (does not block camera)
      ensureLocationPermission().catch(() => {
        // User may decline; verification step will enforce GPS again with a clear error
      });

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.oncanplay = async () => {
          try {
            await videoRef.current?.play();
            setCameraReady(true);
          } catch (playError) {
            console.error('Play error:', playError);
            setCameraError('Could not start video playback');
          }
        };
        
        videoRef.current.load();
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      let errorMessage = 'Could not access camera.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another application.';
      }
      
      setCameraError(errorMessage);
      toast.error(errorMessage);
      setIsCapturing(false);
    }
  }, []);

  const captureAndVerify = useCallback(async () => {
    // Ensure we have GPS before proceeding with face verification
    let position: GeolocationPosition;
    try {
      position = await ensureLocationPermission();
    } catch {
      setStatus('error');
      setStatusMessage('Location permission is required for face check-in.');
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera not ready yet. Please wait.');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Mirror the image
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    // Store in localStorage for viewing in profile
    localStorage.setItem('lastVerificationImage', imageData);
    localStorage.setItem('lastVerificationTime', new Date().toISOString());
    console.log('Captured image for verification, length:', imageData.length);
    setIsVerifying(true);
    setStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('verify-face', {
        body: {
          imageBase64: imageData,
          sessionId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
      });

      console.log('Verify response:', data, error);

      if (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setStatusMessage('Failed to verify face. Please try again.');
        toast.error('Failed to verify face. Please try again.');
        setIsVerifying(false);
        return;
      }

      if (data.success) {
        setStatus('success');
        setMatchScore(data.matchScore);
        setStatusMessage('Attendance marked successfully!');
        toast.success('Attendance marked successfully!');
        stopCamera();
        onSuccess?.();
      } else {
        // Check if it's a duplicate attendance
        const errorMsg = data.error || 'Verification failed';
        if (errorMsg.toLowerCase().includes('already marked') || errorMsg.toLowerCase().includes('already checked')) {
          setStatus('already_checked_in');
          setStatusMessage('You have already checked in for this session.');
          toast.info('You have already checked in for this session.');
          stopCamera();
          onSuccess?.();
        } else {
          const proximityDetails =
            typeof data.distance === 'number' && typeof data.allowedRadius === 'number'
              ? ` (Distance: ${data.distance}m, Allowed: ${data.allowedRadius}m${data.room ? `, Room: ${data.room}` : ''})`
              : '';

          setStatus('error');
          setMatchScore(data.matchScore || null);
          setStatusMessage(`${errorMsg}${proximityDetails}`);
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setStatusMessage('Failed to verify face. Please try again.');
      toast.error('Failed to verify face. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [sessionId, stopCamera, onSuccess]);

  const reset = () => {
    setStatus('idle');
    setMatchScore(null);
    setCameraError(null);
    setStatusMessage('');
    setCapturedImage(null);
    if (!isCapturing) {
      startCamera();
    }
  };

  const isSuccessState = status === 'success' || status === 'already_checked_in';

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
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Starting camera...</p>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-2 p-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="text-sm text-center text-destructive">{cameraError}</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <Camera className="h-12 w-12 opacity-50" />
              <p className="text-sm">Click "Start Camera" to begin</p>
            </div>
          )}
          
          {isVerifying && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
              <span className="text-sm">Verifying face...</span>
            </div>
          )}
          
          {status === 'success' && (
            <div className="absolute inset-0 bg-green-500/20 flex flex-col items-center justify-center p-4">
              <PartyPopper className="h-16 w-16 text-green-500 mb-2" />
              <span className="text-green-700 font-bold text-lg">Check-in Successful!</span>
              <span className="text-green-600 text-center mt-1">
                Your attendance has been recorded.
              </span>
              {matchScore && (
                <span className="text-sm text-green-600 mt-2">
                  Face Match: {(matchScore * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}

          {status === 'already_checked_in' && (
            <div className="absolute inset-0 bg-blue-500/20 flex flex-col items-center justify-center p-4">
              <CheckCircle className="h-16 w-16 text-blue-500 mb-2" />
              <span className="text-blue-700 font-bold text-lg">Already Checked In</span>
              <span className="text-blue-600 text-center mt-1">
                Your attendance was already recorded for this session.
              </span>
            </div>
          )}
          
          {status === 'error' && !isCapturing && (
            <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center p-4">
              <XCircle className="h-16 w-16 text-red-500 mb-2" />
              <span className="text-red-700 font-medium">Verification Failed</span>
              <span className="text-sm text-red-600 text-center mt-1">
                {statusMessage || 'Please try again'}
              </span>
              {matchScore !== null && (
                <span className="text-sm text-red-600 mt-1">
                  Match: {(matchScore * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}
          
          {/* Face guide overlay */}
          {isCapturing && cameraReady && !isVerifying && status === 'idle' && (
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

        {/* Captured Image Preview */}
        {capturedImage && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Captured Verification Image:</p>
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
              <img 
                src={capturedImage} 
                alt="Captured face for verification" 
                className="w-full h-full object-cover"
              />
              {status === 'success' && (
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                  Verified
                </div>
              )}
              {status === 'error' && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                  Failed
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isCapturing && status === 'idle' && (
            <Button onClick={startCamera} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          )}
          
          {isCapturing && !isVerifying && !cameraError && (
            <>
              <Button onClick={captureAndVerify} className="flex-1" disabled={!cameraReady}>
                <Scan className="h-4 w-4 mr-2" />
                {cameraReady ? 'Verify & Check In' : 'Loading...'}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </>
          )}
          
          {isCapturing && cameraError && (
            <Button onClick={reset} className="w-full">
              Try Again
            </Button>
          )}
          
          {isSuccessState && !isCapturing && (
            <Button onClick={reset} className="w-full" variant="outline">
              Done
            </Button>
          )}

          {status === 'error' && !isCapturing && (
            <Button onClick={reset} className="w-full">
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
