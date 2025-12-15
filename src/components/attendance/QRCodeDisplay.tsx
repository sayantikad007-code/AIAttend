import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDisplayProps {
  sessionId: string;
  className: string;
}

export function QRCodeDisplay({ sessionId, className }: QRCodeDisplayProps) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(30);
  const { toast } = useToast();

  const generateQR = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({ title: 'Error', description: 'Please log in again', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('generate-qr', {
        body: { sessionId },
      });

      if (error) {
        throw error;
      }
      
      if (data?.qrData) {
        setQrData(data.qrData);
        setExpiresIn(30);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to generate QR code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, toast]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  useEffect(() => {
    if (!qrData) return;

    const interval = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          generateQR();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrData, generateQR]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <QrCode className="h-5 w-5" />
          Attendance QR Code
        </CardTitle>
        <p className="text-sm text-muted-foreground">{className}</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {isLoading ? (
          <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : qrData ? (
          <div className="p-4 bg-white rounded-lg shadow-inner">
            <QRCodeSVG value={qrData} size={240} level="H" />
          </div>
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Failed to generate QR</p>
          </div>
        )}
        
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Auto-refreshes in <span className="font-semibold text-foreground">{expiresIn}s</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={generateQR}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
