import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Tables } from '@/integrations/supabase/types';

interface ZoneStepProps {
  zones: Tables<'zones'>[];
  zoneId: string;
  setZoneId: (v: string) => void;
  onNext: () => void;
}

export function ZoneStep({ zones, zoneId, setZoneId, onNext }: ZoneStepProps) {
  const selectedZone = zones.find(z => z.id === zoneId);

  return (
    <div className="space-y-4">
      <Select value={zoneId} onValueChange={setZoneId}>
        <SelectTrigger><SelectValue placeholder="Select your zone" /></SelectTrigger>
        <SelectContent>
          {zones.map(z => (
            <SelectItem key={z.id} value={z.id}>{z.name} ({z.city})</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Zone risk preview */}
      {selectedZone && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Zone Risk Level</span>
            <span className={`font-semibold ${
              selectedZone.risk_score > 0.7 ? 'text-destructive' :
              selectedZone.risk_score > 0.4 ? 'text-accent' : 'text-secondary'
            }`}>
              {selectedZone.risk_score > 0.7 ? '🔴 High' :
               selectedZone.risk_score > 0.4 ? '🟡 Medium' : '🟢 Low'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Higher risk zones may have higher premiums but more frequent payouts during weather events.
          </p>
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={!zoneId}
        className="w-full gradient-shield text-primary-foreground border-0 h-11"
      >
        Continue <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
