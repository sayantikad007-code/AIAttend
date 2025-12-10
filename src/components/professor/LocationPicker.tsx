import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  proximityRadius?: number | null;
  onLocationChange: (lat: number | null, lng: number | null, radius: number) => void;
}

export function LocationPicker({
  latitude,
  longitude,
  proximityRadius = 50,
  onLocationChange,
}: LocationPickerProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [radius, setRadius] = useState(proximityRadius || 50);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onLocationChange(lat, lng, radius);
        toast.success('Location captured successfully');
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('An error occurred while getting location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const clearLocation = () => {
    onLocationChange(null, null, radius);
    toast.success('Location cleared');
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (latitude && longitude) {
      onLocationChange(latitude, longitude, newRadius);
    }
  };

  const hasLocation = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="w-4 h-4 text-primary" />
        Classroom GPS Location (for Proximity Check-in)
      </div>

      {hasLocation ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            Location set successfully
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Latitude:</span>
              <span className="ml-2 font-mono">{latitude?.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Longitude:</span>
              <span className="ml-2 font-mono">{longitude?.toFixed(6)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="radius" className="text-sm">Proximity Radius (meters)</Label>
            <Input
              id="radius"
              type="number"
              min={10}
              max={500}
              value={radius}
              onChange={(e) => handleRadiusChange(parseInt(e.target.value) || 50)}
              className="w-32"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4 mr-2" />
              )}
              Update Location
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearLocation}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Set the classroom location to enable proximity-based attendance check-in.
          </p>
          <div className="space-y-2">
            <Label htmlFor="radius-initial" className="text-sm">Proximity Radius (meters)</Label>
            <Input
              id="radius-initial"
              type="number"
              min={10}
              max={500}
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value) || 50)}
              className="w-32"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4 mr-2" />
            )}
            Use Current Location
          </Button>
        </div>
      )}
    </div>
  );
}
