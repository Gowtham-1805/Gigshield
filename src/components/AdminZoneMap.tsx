import { useEffect, useRef } from 'react';
import { zones } from '@/lib/mock-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function AdminZoneMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const loadMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      const map = L.map(mapRef.current!, { scrollWheelZoom: true }).setView([20.5937, 78.9629], 5);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      zones.forEach((zone) => {
        const color = zone.riskScore > 0.7 ? '#ef4444' : zone.riskScore > 0.4 ? '#f59e0b' : '#10b981';
        const circle = L.circleMarker([zone.lat, zone.lng], {
          radius: 10 + zone.riskScore * 15,
          color,
          fillColor: color,
          fillOpacity: 0.35,
          weight: 2,
        }).addTo(map);

        circle.bindPopup(`
          <div style="font-family: 'Space Grotesk', sans-serif;">
            <strong>${zone.name}</strong><br/>
            Risk Score: <strong style="color:${color}">${(zone.riskScore * 100).toFixed(0)}%</strong><br/>
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
  }, []);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Zone Risk Map</CardTitle>
        <CardDescription>Interactive map with color-coded risk zones</CardDescription>
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
