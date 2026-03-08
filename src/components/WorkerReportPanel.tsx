import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CloudRain, Flame, Wind, Ban, CloudLightning, Send, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendMockWhatsAppClaimCreated } from '@/lib/whatsapp-mock';
import type { Tables } from '@/integrations/supabase/types';

const triggerOptions = [
  { id: 'RAIN_HEAVY', label: 'Heavy Rain', icon: CloudRain, emoji: '🌧️', color: 'text-blue-400' },
  { id: 'RAIN_EXTREME', label: 'Flooding', icon: CloudRain, emoji: '🌊', color: 'text-blue-500' },
  { id: 'HEAT_EXTREME', label: 'Extreme Heat', icon: Flame, emoji: '🔥', color: 'text-orange-400' },
  { id: 'AQI_SEVERE', label: 'Severe AQI', icon: Wind, emoji: '😷', color: 'text-yellow-500' },
  { id: 'CURFEW_LOCAL', label: 'Curfew/Bandh', icon: Ban, emoji: '🚫', color: 'text-red-400' },
  { id: 'STORM_CYCLONE', label: 'Cyclone', icon: CloudLightning, emoji: '🌀', color: 'text-purple-400' },
] as const;

interface WorkerReportPanelProps {
  recentIncidents: Tables<'incidents'>[];
  hasActivePolicy: boolean;
  onClaimCreated: () => void;
}

export default function WorkerReportPanel({ recentIncidents, hasActivePolicy, onClaimCreated }: WorkerReportPanelProps) {
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; status: string } | null>(null);

  const reportDisruption = async () => {
    if (!selectedTrigger) return;
    setSubmitting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('worker-report', {
        body: { action: 'report_disruption', trigger_type: selectedTrigger },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Report failed');
      setResult({ message: data.message, status: data.claim?.status || 'processing' });
      toast.success(data.message);
      setSelectedTrigger('');
      onClaimCreated();
    } catch (e: any) {
      toast.error(e.message || 'Failed to report disruption');
    }
    setSubmitting(false);
  };

  const fileClaim = async (incidentId: string) => {
    setSubmitting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('worker-report', {
        body: { action: 'file_claim', incident_id: incidentId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Claim failed');
      setResult({ message: data.message, status: data.claim?.status || 'approved' });
      toast.success(data.message);
      onClaimCreated();
    } catch (e: any) {
      toast.error(e.message || 'Failed to file claim');
    }
    setSubmitting(false);
  };

  if (!hasActivePolicy) return null;

  return (
    <div className="space-y-4">
      {/* Report New Disruption */}
      <Card className="shadow-card border-accent/20 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-accent" />
            </div>
            Report a Disruption
          </CardTitle>
          <p className="text-xs text-muted-foreground">Experiencing bad weather? Report it to initiate a claim.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {triggerOptions.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTrigger(t.id)}
                disabled={submitting}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                  selectedTrigger === t.id
                    ? 'border-accent bg-accent/10 shadow-sm'
                    : 'border-border/50 bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="text-[10px] font-medium leading-tight">{t.label}</span>
              </button>
            ))}
          </div>

          <Button
            onClick={reportDisruption}
            disabled={!selectedTrigger || submitting}
            className="w-full h-11 gradient-danger text-primary-foreground border-0 font-semibold"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Report & Claim</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* File Claim on Existing Incident */}
      {recentIncidents.length > 0 && (
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-primary" />
              </div>
              Active Incidents in Your Zone
            </CardTitle>
            <p className="text-xs text-muted-foreground">Tap to file a claim against a detected incident.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentIncidents.slice(0, 5).map((inc) => {
              const trigger = triggerOptions.find(t => t.id === inc.trigger_type);
              return (
                <button
                  key={inc.id}
                  onClick={() => fileClaim(inc.id)}
                  disabled={submitting}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center text-base shadow-sm">
                      {trigger?.emoji || '⚡'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{trigger?.label || inc.trigger_type}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(inc.created_at).toLocaleString()} · Severity: {inc.severity}%
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary group-hover:bg-primary/10 transition-colors">
                    File Claim →
                  </Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Result Banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className={`shadow-card border-0 ${
              result.status === 'approved' ? 'bg-secondary/10 border-secondary/20' :
              result.status === 'flagged' ? 'bg-destructive/10 border-destructive/20' :
              'bg-accent/10 border-accent/20'
            }`}>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className={`w-5 h-5 shrink-0 ${
                  result.status === 'approved' ? 'text-secondary' :
                  result.status === 'flagged' ? 'text-destructive' : 'text-accent'
                }`} />
                <p className="text-sm font-medium">{result.message}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
