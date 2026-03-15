import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export default function AdminZoneMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [dbZones, setDbZones] = useState<Tables<'zones'>[]>([]);

  useEffect(() => {
    supabase.from('zones').select('*').then(({ data }) => setDbZones(data || []));
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || dbZones.length === 0) return;

    const loadMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      const map = L.map(mapRef.current!, { scrollWheelZoom: true }).setView([20.5937, 78.9629], 5);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      dbZones.forEach((zone) => {
        const color = zone.risk_score > 0.7 ? '#ef4444' : zone.risk_score > 0.4 ? '#f59e0b' : '#10b981';
        const circle = L.circleMarker([zone.lat, zone.lng], {
          radius: 10 + zone.risk_score * 15,
          color,
          fillColor: color,
          fillOpacity: 0.35,
          weight: 2,
        }).addTo(map);

        circle.bindPopup(`
          <div style="font-family: 'Space Grotesk', sans-serif;">
            <strong>${zone.name}</strong><br/>
            Risk Score: <strong style="color:${color}">${(zone.risk_score * 100).toFixed(0)}%</strong><br/>
            City: ${zone.city}
          </div>
        `);
      });
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [dbZones]);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Zone Risk Map</CardTitle>
        <CardDescription>Interactive map with color-coded risk zones ({dbZones.length} zones from database)</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={mapRef} className="w-full h-[500px] rounded-lg overflow-hidden" />
        <div className="flex gap-6 mt-4 justify-center text-sm">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-destructive" /> High Risk (&gt;70%)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-accent" /> Medium (40-70%)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-secondary" /> Low (&lt;40%)</div>
        </div>
      </CardContent>
    </Card>
  );
}
