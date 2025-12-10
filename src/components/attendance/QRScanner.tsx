import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  onSuccess?: (result: { className: string; status: string }) => void;
}

export function QRScanner({ onSuccess }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    className?: string;
    status?: string;
  } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const startScanning = async () => {
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
    }
  };

  const stopScanning = async () => {
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
  };

  const handleScan = async (decodedText: string) => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    await stopScanning();

    try {
      console.log('Scanned QR data:', decodedText);
      
      const { data, error } = await supabase.functions.invoke('verify-qr', {
        body: { qrData: decodedText },
      });

      console.log('Verify response:', data, error);

      if (error) throw error;

      if (data.success) {
        setScanResult({
          success: true,
          message: `Attendance marked as ${data.status}!`,
          className: data.className,
          status: data.status,
        });
        onSuccess?.({ className: data.className, status: data.status });
        toast({
          title: 'Success!',
          description: `Attendance marked for ${data.className}`,
        });
      } else {
        setScanResult({
          success: false,
          message: data.error || 'Verification failed',
        });
        toast({
          title: 'Error',
          description: data.error || 'Verification failed',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error verifying QR:', error);
      const errorMessage = error?.message || 'Failed to verify QR code';
      setScanResult({
        success: false,
        message: errorMessage,
      });
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

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
            {scanResult.success ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-500" />
                <div className="text-center">
                  <p className="font-semibold text-lg">{scanResult.message}</p>
                  {scanResult.className && (
                    <p className="text-muted-foreground">{scanResult.className}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-destructive" />
                <p className="text-center text-muted-foreground">{scanResult.message}</p>
              </>
            )}
            <Button onClick={resetScanner} variant="outline">
              Scan Again
            </Button>
          </div>
        ) : isVerifying ? (
          <div className="w-64 h-64 flex flex-col items-center justify-center bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Verifying...</p>
          </div>
        ) : (
          <>
            <div
              ref={containerRef}
              id="qr-reader"
              className="w-full max-w-[300px] rounded-lg overflow-hidden bg-secondary"
              style={{ 
                minHeight: isScanning ? '300px' : '0px',
                display: isScanning ? 'block' : 'none'
              }}
            />
            
            {!isScanning && (
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25">
                <CameraOff className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}

            <Button
              onClick={isScanning ? stopScanning : startScanning}
              variant={isScanning ? 'destructive' : 'default'}
            >
              {isScanning ? (
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
