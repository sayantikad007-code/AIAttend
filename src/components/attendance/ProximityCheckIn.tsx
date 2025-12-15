import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Wifi, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Navigation,
  AlertTriangle,
  RefreshCw,
  PartyPopper,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProximityCheckInProps {
  sessionId: string;
  classId: string;
  classRoom: string;
  onSuccess?: () => void;
}

interface LocationState {
  status: 'idle' | 'requesting' | 'acquired' | 'error';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  error?: string;
}

export function ProximityCheckIn({ sessionId, classId, classRoom, onSuccess }: ProximityCheckInProps) {
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'already_checked_in' | 'failed'>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [allowedRadius, setAllowedRadius] = useState<number>(50);
  const { user } = useAuth();
  const { toast } = useToast();

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocation({
        status: 'error',
        error: 'Geolocation is not supported by your browser',
      });
      return;
    }

    setLocation({ status: 'requesting' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          status: 'acquired',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocation({ status: 'error', error: errorMessage });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const verifyProximity = async () => {
    if (!location.latitude || !location.longitude || !user) return;

    setVerificationStatus('verifying');

    try {
      // Call the verify-proximity edge function for server-side validation
      const { data, error } = await supabase.functions.invoke('verify-proximity', {
        body: {
          sessionId,
          classId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        },
      });

      // Handle edge function errors - treat expected 400s as normal UX failures (no throw)
      if (error) {
        const status = (error as unknown as { status?: number }).status;

        const handleFailure = (message: string) => {
          setVerificationStatus('failed');
          toast({
            title: "Check-in Failed",
            description: message,
            variant: "destructive",
          });
        };

        // Try to parse structured error response from Response context (preferred)
        const errorContext = (error as unknown as { context?: Response }).context;
        if (errorContext) {
          try {
            const errorBody = await errorContext.clone().json();
            if (errorBody?.distance !== undefined && errorBody?.allowedRadius !== undefined) {
              setDistance(errorBody.distance);
              setAllowedRadius(errorBody.allowedRadius);
              setVerificationStatus('failed');
              toast({
                title: "Too far from classroom",
                description: `You are ${errorBody.distance}m away. Must be within ${errorBody.allowedRadius}m of ${errorBody.room || classRoom}.`,
                variant: "destructive",
              });
              return;
            }
            if (errorBody?.error === 'You are not enrolled in this class') {
              handleFailure("You are not enrolled in this class.");
              return;
            }
            if (errorBody?.error) {
              handleFailure(errorBody.error);
              return;
            }
          } catch {
            // Fall back below
          }
        }

        // Fallback: extract JSON from error.message like: "Edge function returned 400: Error, { ... }"
        if (status === 400 && typeof error.message === 'string') {
          const match = error.message.match(/\{[\s\S]*\}$/);
          if (match?.[0]) {
            try {
              const parsed = JSON.parse(match[0]);
              if (parsed?.distance !== undefined && parsed?.allowedRadius !== undefined) {
                setDistance(parsed.distance);
                setAllowedRadius(parsed.allowedRadius);
                setVerificationStatus('failed');
                toast({
                  title: "Too far from classroom",
                  description: `You are ${parsed.distance}m away. Must be within ${parsed.allowedRadius}m of ${parsed.room || classRoom}.`,
                  variant: "destructive",
                });
                return;
              }
              if (parsed?.error) {
                handleFailure(parsed.error);
                return;
              }
            } catch {
              // ignore
            }
          }

          // Expected client-visible failure; don't throw.
          handleFailure("You're outside the allowed radius. Please move closer and try again.");
          return;
        }

        throw new Error(error.message || 'Verification failed');
      }

      // Handle successful response with error field
      if (data?.error) {
        if (data.distance !== undefined && data.allowedRadius !== undefined) {
          setDistance(data.distance);
          setAllowedRadius(data.allowedRadius);
          setVerificationStatus('failed');
          toast({
            title: "Too far from classroom",
            description: `You are ${data.distance}m away. Must be within ${data.allowedRadius}m of ${data.room || classRoom}.`,
            variant: "destructive",
          });
        } else if (data.error === 'You are not enrolled in this class') {
          setVerificationStatus('failed');
          toast({
            title: "Not Enrolled",
            description: "You are not enrolled in this class.",
            variant: "destructive",
          });
        } else {
          setVerificationStatus('failed');
          toast({
            title: "Check-in Failed",
            description: data.error,
            variant: "destructive",
          });
        }
        return;
      }

      // Success or already checked in
      if (data?.alreadyCheckedIn) {
        setVerificationStatus('already_checked_in');
        toast({
          title: "Already Checked In",
          description: "Your attendance was already recorded for this session.",
        });
      } else {
        if (data?.distance !== null && data?.distance !== undefined) {
          setDistance(data.distance);
        }
        setVerificationStatus('success');
        toast({
          title: "Check-in Successful!",
          description: data?.message || "Your attendance has been recorded.",
        });
      }
      onSuccess?.();

    } catch (error) {
      console.error('Proximity verification error:', error);
      setVerificationStatus('failed');
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Unable to verify your proximity. Please try again.",
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setLocation({ status: 'idle' });
    setVerificationStatus('idle');
    setDistance(null);
  };

  return (
    <div className="text-center space-y-6">
      {/* Location Status Display */}
      <div className="w-48 h-48 mx-auto relative">
        {/* Animated rings */}
        {(location.status === 'requesting' || verificationStatus === 'verifying') && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-4 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            <div className="absolute inset-8 rounded-full border-4 border-primary/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
          </>
        )}
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
            verificationStatus === 'success' && "bg-green-500",
            verificationStatus === 'already_checked_in' && "bg-blue-500",
            verificationStatus === 'failed' && "bg-destructive",
            verificationStatus === 'idle' && location.status === 'acquired' && "bg-primary",
            (location.status === 'idle' || location.status === 'requesting') && verificationStatus === 'idle' && "gradient-bg",
            location.status === 'error' && "bg-destructive"
          )}>
            {location.status === 'requesting' && (
              <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
            )}
            {location.status === 'idle' && verificationStatus === 'idle' && (
              <MapPin className="w-10 h-10 text-primary-foreground" />
            )}
            {location.status === 'acquired' && verificationStatus === 'idle' && (
              <Navigation className="w-10 h-10 text-primary-foreground" />
            )}
            {verificationStatus === 'verifying' && (
              <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
            )}
            {verificationStatus === 'success' && (
              <PartyPopper className="w-10 h-10 text-primary-foreground" />
            )}
            {verificationStatus === 'already_checked_in' && (
              <Info className="w-10 h-10 text-primary-foreground" />
            )}
            {verificationStatus === 'failed' && (
              <XCircle className="w-10 h-10 text-primary-foreground" />
            )}
            {location.status === 'error' && (
              <AlertTriangle className="w-10 h-10 text-primary-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <div className="space-y-2">
        {location.status === 'idle' && verificationStatus === 'idle' && (
          <>
            <h3 className="text-lg font-semibold">Enable Location Access</h3>
            <p className="text-muted-foreground text-sm">
              Allow location access to verify you're in the classroom
            </p>
          </>
        )}

        {location.status === 'requesting' && (
          <>
            <h3 className="text-lg font-semibold">Acquiring Location...</h3>
            <p className="text-muted-foreground text-sm">
              Please wait while we get your GPS coordinates
            </p>
          </>
        )}

        {location.status === 'error' && (
          <>
            <h3 className="text-lg font-semibold text-destructive">Location Error</h3>
            <p className="text-muted-foreground text-sm">{location.error}</p>
          </>
        )}

        {location.status === 'acquired' && verificationStatus === 'idle' && (
          <>
            <h3 className="text-lg font-semibold text-primary">Location Acquired</h3>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Accuracy: ±{Math.round(location.accuracy || 0)}m</span>
            </div>
            <Badge variant="secondary" className="mt-2">
              Ready to verify proximity
            </Badge>
          </>
        )}

        {verificationStatus === 'verifying' && (
          <>
            <h3 className="text-lg font-semibold">Verifying Proximity...</h3>
            <p className="text-muted-foreground text-sm">
              Checking distance to {classRoom}
            </p>
          </>
        )}

        {verificationStatus === 'success' && (
          <>
            <h3 className="text-xl font-bold text-green-600">Check-in Successful!</h3>
            <p className="text-green-600">Your attendance has been recorded.</p>
            <p className="text-muted-foreground text-sm">
              {distance !== null 
                ? `You are ${Math.round(distance)}m from ${classRoom}` 
                : `Proximity verified at ${classRoom}`
              }
            </p>
          </>
        )}

        {verificationStatus === 'already_checked_in' && (
          <>
            <h3 className="text-xl font-bold text-blue-600">Already Checked In</h3>
            <p className="text-blue-600">Your attendance was already recorded for this session.</p>
          </>
        )}

        {verificationStatus === 'failed' && distance !== null && (
          <>
            <h3 className="text-lg font-semibold text-destructive">Too Far Away</h3>
            <p className="text-muted-foreground text-sm">
              You are {Math.round(distance)}m from the classroom.
              <br />
              Must be within {allowedRadius}m to check in.
            </p>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {location.status === 'idle' && (
          <Button variant="gradient" size="lg" onClick={requestLocation}>
            <MapPin className="w-5 h-5 mr-2" />
            Enable Location
          </Button>
        )}

        {location.status === 'error' && (
          <Button variant="outline" size="lg" onClick={requestLocation}>
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
        )}

        {location.status === 'acquired' && verificationStatus === 'idle' && (
          <Button variant="gradient" size="lg" onClick={verifyProximity}>
            <Wifi className="w-5 h-5 mr-2" />
            Verify Proximity
          </Button>
        )}

        {(verificationStatus === 'success' || verificationStatus === 'already_checked_in' || verificationStatus === 'failed') && (
          <Button variant="outline" size="lg" onClick={reset}>
            <RefreshCw className="w-5 h-5 mr-2" />
            {verificationStatus === 'failed' ? 'Try Again' : 'Done'}
          </Button>
        )}
      </div>

      {/* Info Note */}
      {location.status === 'idle' && (
        <p className="text-xs text-muted-foreground">
          Your location is only used to verify classroom presence and is not stored.
        </p>
      )}
    </div>
  );
}
