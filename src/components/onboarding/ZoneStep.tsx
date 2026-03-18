import { useState, useMemo } from 'react';
import { ChevronRight, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@/integrations/supabase/types';

interface ZoneStepProps {
  zones: Tables<'zones'>[];
  zoneId: string;
  setZoneId: (v: string) => void;
  onNext: () => void;
}

export function ZoneStep({ zones, zoneId, setZoneId, onNext }: ZoneStepProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const cities = useMemo(() => {
    const map = new Map<string, Tables<'zones'>[]>();
    zones.forEach(z => { const list = map.get(z.city) || []; list.push(z); map.set(z.city, list); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [zones]);

  const filtered = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.toLowerCase();
    return cities.map(([city, zs]) => {
      if (city.toLowerCase().includes(q)) return [city, zs] as [string, Tables<'zones'>[]];
      const matchedZones = zs.filter(z => z.name.toLowerCase().includes(q));
      if (matchedZones.length > 0) return [city, matchedZones] as [string, Tables<'zones'>[]];
      return null;
    }).filter(Boolean) as [string, Tables<'zones'>[]][];
  }, [cities, search]);

  const selectedZone = zones.find(z => z.id === zoneId);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder={t('zone.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <ScrollArea className="h-[240px] rounded-lg border border-border">
        <div className="p-2 space-y-3">
          {filtered.length === 0 && (<p className="text-sm text-muted-foreground text-center py-6">{t('zone.noZonesFound', { search })}</p>)}
          {filtered.map(([city, cityZones]) => (
            <div key={city}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">{city}</p>
              <div className="space-y-1">
                {cityZones.map(z => {
                  const isSelected = zoneId === z.id;
                  const riskColor = z.risk_score > 0.7 ? 'text-destructive' : z.risk_score > 0.4 ? 'text-accent' : 'text-secondary';
                  const riskLabel = z.risk_score > 0.7 ? t('zone.riskHigh') : z.risk_score > 0.4 ? t('zone.riskMed') : t('zone.riskLow');
                  return (
                    <button key={z.id} onClick={() => setZoneId(z.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-colors text-sm ${isSelected ? 'bg-primary/10 border border-primary/30 text-foreground' : 'hover:bg-muted/60 text-foreground/80'}`}>
                      <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />{z.name.replace(`${z.city} - `, '')}</span>
                      <span className={`text-xs font-medium ${riskColor}`}>{riskLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      {selectedZone && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('zone.selected')}</span><span className="font-semibold text-foreground">{selectedZone.name}</span></div>
          <p className="text-xs text-muted-foreground mt-1">{t('zone.riskNote')}</p>
        </div>
      )}
      <Button onClick={onNext} disabled={!zoneId} className="w-full gradient-shield text-primary-foreground border-0 h-11">{t('common.continue')} <ChevronRight className="w-4 h-4" /></Button>
    </div>
  );
}
