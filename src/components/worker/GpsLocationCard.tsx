import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Loader2, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GpsLocationCardProps {
  workerId: string;
  workerZoneName?: string;
  lastLat?: number | null;
  lastLng?: number | null;
  lastLocationAt?: string | null;
  onLocationUpdated?: () => void;
}

export default function GpsLocationCard({
  workerId,
  workerZoneName,
  lastLat,
  lastLng,
  lastLocationAt,
  onLocationUpdated,
}: GpsLocationCardProps) {
  const [sharing, setSharing] = useState(false);
  const [nearestZone, setNearestZone] = useState<{ name: string; city: string; distance: number } | null>(null);

  const isRecent = lastLocationAt && (Date.now() - new Date(lastLocationAt).getTime()) < 3600000;

  useEffect(() => {
    if (lastLat && lastLng) {
      findNearestZone(lastLat, lastLng);
    }
  }, [lastLat, lastLng]);

  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const findNearestZone = async (lat: number, lng: number) => {
    const { data: zones } = await supabase.from('zones').select('name, city, lat, lng');
    if (!zones) return;
    let nearest = null;
    let nearestDist = Infinity;
    for (const z of zones) {
      const d = haversineKm(lat, lng, z.lat, z.lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = z;
      }
    }
    if (nearest) {
      setNearestZone({ name: nearest.name, city: nearest.city, distance: nearestDist });
    }
  };

  const shareLocation = async () => {
    setSharing(true);
    try {
      // Use browser Geolocation API (simulated fallback if unavailable)
      let lat: number, lng: number;

      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Simulate GPS — pick a random offset near an Indian city
          const bases = [
            { lat: 19.076, lng: 72.877 }, // Mumbai
            { lat: 28.644, lng: 77.216 }, // Delhi
            { lat: 13.083, lng: 80.27 },  // Chennai
            { lat: 12.971, lng: 77.594 }, // Bangalore
            { lat: 11.016, lng: 76.955 }, // Coimbatore
          ];
          const base = bases[Math.floor(Math.random() * bases.length)];
          lat = base.lat + (Math.random() - 0.5) * 0.05;
          lng = base.lng + (Math.random() - 0.5) * 0.05;
          toast.info('📍 Using simulated GPS location (demo mode)');
        }
      } else {
        // Simulate
        lat = 19.076 + (Math.random() - 0.5) * 0.05;
        lng = 72.877 + (Math.random() - 0.5) * 0.05;
        toast.info('📍 Using simulated GPS location (demo mode)');
      }

      const { error } = await supabase
        .from('workers')
        .update({
          last_lat: lat,
          last_lng: lng,
          last_location_at: new Date().toISOString(),
        })
        .eq('id', workerId);

      if (error) throw error;

      await findNearestZone(lat, lng);
      toast.success('📍 Location shared! Cross-zone claims are now enabled.');
      onLocationUpdated?.();
    } catch (e: any) {
      toast.error(e.message || 'Failed to share location');
    }
    setSharing(false);
  };

  return (
    <Card className="shadow-card border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Navigation className="w-3.5 h-3.5 text-primary" />
          </div>
          Live Location
          {isRecent && (
            <Badge className="bg-secondary/10 text-secondary border-0 text-[10px] ml-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary mr-1 animate-pulse" />
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Share your GPS to claim in <strong>any zone</strong> you're delivering in — not just your registered zone.
        </p>

        {/* Current location info */}
        {lastLat && lastLng && isRecent ? (
          <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/20 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> GPS Location
              </span>
              <span className="font-mono text-xs text-foreground/70">
                {lastLat.toFixed(4)}, {lastLng.toFixed(4)}
              </span>
            </div>
            {nearestZone && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Nearest Zone</span>
                <span className="font-medium text-xs">
                  {nearestZone.name} ({nearestZone.distance.toFixed(1)}km)
                </span>
              </div>
            )}
            {workerZoneName && nearestZone && nearestZone.name !== workerZoneName && (
              <p className="text-[10px] text-primary font-medium">
                ✨ Cross-zone eligible — you can claim in {nearestZone.name} too!
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
            <p className="text-xs text-muted-foreground">
              {lastLat ? '⏰ Location expired (>1hr ago)' : '📍 No location shared yet'}
            </p>
          </div>
        )}

        <Button
          onClick={shareLocation}
          disabled={sharing}
          variant={isRecent ? "outline" : "default"}
          className={`w-full h-10 ${!isRecent ? 'gradient-shield text-primary-foreground border-0' : ''}`}
        >
          {sharing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Getting location...</>
          ) : isRecent ? (
            <><RefreshCw className="w-4 h-4 mr-2" /> Update Location</>
          ) : (
            <><Navigation className="w-4 h-4 mr-2" /> Share My Location</>
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Coverage radius: 10km from zone center • Updates expire after 1 hour
        </p>
      </CardContent>
    </Card>
  );
}
