import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FaceRegistrationProps {
  onSuccess?: () => void;
}

export function FaceRegistration({ onSuccess }: FaceRegistrationProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
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
    console.log('Starting camera...');
    setCameraError(null);
    setCameraReady(false);
    setIsCapturing(true);
    setCapturedImage(null);
    setStatus('idle');

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 }
        },
        audio: false
      });

      console.log('Got stream:', stream.getVideoTracks().length, 'video tracks');
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Handle video metadata loaded
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded, dimensions:', 
            videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
        };

        // Handle video can play
        const handleCanPlay = async () => {
          console.log('Video can play');
          try {
            await videoRef.current?.play();
            console.log('Video playing');
            setCameraReady(true);
          } catch (playError) {
            console.error('Play error:', playError);
            setCameraError('Could not start video playback. Please try again.');
          }
        };

        videoRef.current.onloadedmetadata = handleLoadedMetadata;
        videoRef.current.oncanplay = handleCanPlay;
        
        // Also try to play directly after setting srcObject
        videoRef.current.load();
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      let errorMessage = 'Could not access camera.';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not meet requirements.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setCameraError(errorMessage);
      toast.error(errorMessage);
      setIsCapturing(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    console.log('Capturing photo...');
    
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available');
      toast.error('Camera not ready. Please try again.');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    console.log('Video state:', {
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      paused: video.paused
    });
    
    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera not ready yet. Please wait a moment.');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw the video frame (mirrored for selfie view)
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      console.log('Captured image, data length:', imageData.length);
      setCapturedImage(imageData);
      stopCamera();
    } else {
      toast.error('Could not capture image');
    }
  }, [stopCamera]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
      setStatus('idle');
    };
    reader.readAsDataURL(file);
  };

  const registerFace = async () => {
    if (!capturedImage) {
      toast.error('Please capture or upload a photo first');
      return;
    }

    setIsProcessing(true);
    setStatus('idle');

    try {
      console.log('Sending image for registration...');
      const { data, error } = await supabase.functions.invoke('register-face', {
        body: { imageBase64: capturedImage }
      });

      console.log('Registration response:', data, error);

      if (error) throw error;

      if (data.success) {
        setStatus('success');
        toast.success(data.message);
        onSuccess?.();
      } else {
        setStatus('error');
        toast.error(data.error || 'Failed to register face');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setStatus('error');
      toast.error('Failed to register face. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setStatus('idle');
    setCameraError(null);
    stopCamera();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Face Registration
        </CardTitle>
        <CardDescription>
          Register your face for quick attendance check-in
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
                  <Button size="sm" variant="outline" onClick={reset}>
                    Try Again
                  </Button>
                </div>
              )}
            </>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <Camera className="h-12 w-12 opacity-50" />
              <p className="text-sm">Click "Open Camera" to start</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
          )}
          
          {status === 'error' && (
            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex flex-wrap gap-2">
          {!isCapturing && !capturedImage && (
            <>
              <Button onClick={startCamera} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Open Camera
              </Button>
              <label className="flex-1">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </>
          )}
          
          {isCapturing && !cameraError && (
            <>
              <Button onClick={capturePhoto} className="flex-1" disabled={!cameraReady}>
                {cameraReady ? 'Capture Photo' : 'Loading...'}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </>
          )}
          
          {capturedImage && !isProcessing && status === 'idle' && (
            <>
              <Button onClick={registerFace} className="flex-1">
                Register Face
              </Button>
              <Button variant="outline" onClick={reset}>
                Retake
              </Button>
            </>
          )}
          
          {isProcessing && (
            <Button disabled className="flex-1">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}
          
          {status === 'success' && (
            <Button variant="outline" onClick={reset} className="w-full">
              Register New Photo
            </Button>
          )}
          
          {status === 'error' && (
            <Button onClick={reset} className="w-full">
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
