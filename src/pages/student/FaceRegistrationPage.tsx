import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FaceRegistration } from '@/components/attendance/FaceRegistration';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, ScanFace, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FaceRegistrationPage() {
  const { user } = useAuth();
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);

  useEffect(() => {
    checkFaceRegistration();
  }, []);

  const checkFaceRegistration = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('face_embedding, face_registered_at')
      .eq('user_id', authUser.id)
      .single();

    if (!error && data) {
      setIsRegistered(!!data.face_embedding);
      setRegisteredAt(data.face_registered_at);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/student">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Face Registration</h1>
            <p className="text-muted-foreground">Set up face recognition for quick check-ins</p>
          </div>
        </div>

        {/* Status Card */}
        {isRegistered !== null && (
          <Card className={isRegistered ? 'border-green-500/50 bg-green-500/5' : 'border-orange-500/50 bg-orange-500/5'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isRegistered ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                  {isRegistered ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-orange-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {isRegistered ? 'Face Registered' : 'Face Not Registered'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isRegistered 
                      ? `Registered on ${new Date(registeredAt!).toLocaleDateString()}`
                      : 'Register your face to enable quick check-ins'
                    }
                  </p>
                </div>
                {isRegistered && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                    Active
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanFace className="w-5 h-5" />
              How it works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">1</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Take a clear photo of your face in good lighting
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes your facial features securely
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Use face recognition for instant attendance check-ins
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Registration Component */}
        <FaceRegistration 
          onSuccess={() => {
            setIsRegistered(true);
            setRegisteredAt(new Date().toISOString());
          }}
        />

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tips for best results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Ensure your face is well-lit and clearly visible</li>
              <li>• Remove sunglasses or hats that cover your face</li>
              <li>• Look directly at the camera</li>
              <li>• Keep a neutral expression</li>
              <li>• Avoid blurry or dark photos</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
