import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, XCircle, Loader2, PartyPopper, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  onSuccess?: (result: { className: string; status: string }) => void;
}

export function QRScanner({ onSuccess }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    alreadyCheckedIn?: boolean;
    message: string;
    className?: string;
    status?: string;
  } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsInitializing(false);
  }, []);

  const handleScan = useCallback(async (decodedText: string) => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    await stopScanning();

    try {
      console.log('Scanned QR data:', decodedText);

      const { data, error } = await supabase.functions.invoke('verify-qr', {
        body: { 
          qrData: decodedText,
        },
      });

      console.log('Verify response:', data, error);

      if (error) {
        // Try to surface the server-provided error (common with edge function 4xx)
        const errorContext = (error as unknown as { context?: Response }).context;
        if (errorContext) {
          try {
            const parsed = await errorContext.clone().json();
            const errMsg = parsed?.error || parsed?.message || 'Verification failed';
            setScanResult({
              success: false,
              message: errMsg,
            });
            toast({
              title: 'Verification Failed',
              description: errMsg,
              variant: 'destructive',
            });
            return;
          } catch {
            // fall through
          }
        }

        const errorMessage = typeof error.message === 'string' ? error.message : 'Verification failed';
        setScanResult({
          success: false,
          message: errorMessage,
        });
        toast({
          title: 'Verification Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (data.success) {
        setScanResult({
          success: true,
          message: 'Attendance marked successfully!',
          className: data.className,
          status: data.status,
        });
        onSuccess?.({ className: data.className, status: data.status });
        toast({
          title: 'Check-in Successful!',
          description: `Your attendance for ${data.className} has been recorded.`,
        });
      } else {
        const errorMsg = data.error || 'Verification failed';

        // Check for duplicate attendance
        if (errorMsg.toLowerCase().includes('already marked') || errorMsg.toLowerCase().includes('already checked')) {
          setScanResult({
            success: true,
            alreadyCheckedIn: true,
            message: 'You have already checked in for this session.',
            className: data.className,
          });
          toast({
            title: 'Already Checked In',
            description: 'Your attendance was already recorded for this session.',
          });
          onSuccess?.({ className: data.className || '', status: 'present' });
        } else {
          setScanResult({
            success: false,
            message: errorMsg,
          });
          toast({
            title: 'Verification Failed',
            description: errorMsg,
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Error verifying QR:', error);
      const errorMessage = error?.message || 'Failed to verify QR code';
      setScanResult({
        success: false,
        message: errorMessage,
      });
      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, stopScanning, onSuccess, toast]);

  const startScanning = useCallback(async () => {
    setIsInitializing(true);
    
    try {
      // Clear any existing scanner first
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING) {
            await scannerRef.current.stop();
          }
        } catch (e) {
          console.log('Scanner cleanup:', e);
        }
        scannerRef.current = null;
      }

      // Wait a bit for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new scanner instance
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        handleScan,
        () => {} // Ignore errors during scanning
      );

      setIsScanning(true);
      setScanResult(null);
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      toast({
        title: 'Camera Error',
        description: error?.message || 'Could not access camera. Please check permissions.',
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  }, [handleScan, toast]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const resetScanner = () => {
    setScanResult(null);
    startScanning();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Camera className="h-5 w-5" />
          Scan QR Code
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Scan the QR code displayed by your professor
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {scanResult ? (
          <div className="w-full flex flex-col items-center space-y-4 py-8">
            {scanResult.success && !scanResult.alreadyCheckedIn ? (
              <>
                <PartyPopper className="h-16 w-16 text-green-500" />
                <div className="text-center">
                  <p className="font-bold text-lg text-green-700">Check-in Successful!</p>
                  <p className="text-green-600 mt-1">Your attendance has been recorded.</p>
                  {scanResult.className && (
                    <p className="text-muted-foreground mt-2">{scanResult.className}</p>
                  )}
                </div>
              </>
            ) : scanResult.alreadyCheckedIn ? (
              <>
                <Info className="h-16 w-16 text-blue-500" />
                <div className="text-center">
                  <p className="font-bold text-lg text-blue-700">Already Checked In</p>
                  <p className="text-blue-600 mt-1">Your attendance was already recorded for this session.</p>
                  {scanResult.className && (
                    <p className="text-muted-foreground mt-2">{scanResult.className}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-destructive" />
                <div className="text-center">
                  <p className="font-semibold text-lg text-destructive">Check-in Failed</p>
                  <p className="text-muted-foreground mt-1">{scanResult.message}</p>
                </div>
              </>
            )}
            <Button onClick={resetScanner} variant="outline">
              {scanResult.success || scanResult.alreadyCheckedIn ? 'Done' : 'Try Again'}
            </Button>
          </div>
        ) : isVerifying ? (
          <div className="w-64 h-64 flex flex-col items-center justify-center bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Verifying...</p>
          </div>
        ) : (
          <>
            {/* Scanner container - always in DOM */}
            <div
              id="qr-reader"
              className="w-full max-w-[300px] rounded-lg overflow-hidden bg-secondary"
              style={{ 
                minHeight: (isScanning || isInitializing) ? '300px' : '0px',
                height: (isScanning || isInitializing) ? 'auto' : '0px',
                visibility: (isScanning || isInitializing) ? 'visible' : 'hidden',
                position: (isScanning || isInitializing) ? 'relative' : 'absolute',
              }}
            />
            
            {/* Placeholder when not scanning */}
            {!isScanning && !isInitializing && (
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25">
                <CameraOff className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}

            {/* Loading state */}
            {isInitializing && !isScanning && (
              <div className="w-64 h-64 flex flex-col items-center justify-center bg-muted rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Starting camera...</p>
              </div>
            )}

            <Button
              onClick={isScanning ? stopScanning : startScanning}
              variant={isScanning ? 'destructive' : 'default'}
              disabled={isInitializing}
            >
              {isInitializing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : isScanning ? (
                <>
                  <CameraOff className="h-4 w-4 mr-2" />
                  Stop Scanning
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Scanning
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
