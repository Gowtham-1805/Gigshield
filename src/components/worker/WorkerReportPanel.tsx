import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CloudRain, Flame, Wind, Ban, CloudLightning, Send, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendMockWhatsAppClaimCreated } from '@/lib/whatsapp-mock';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@/integrations/supabase/types';

interface WorkerReportPanelProps {
  recentIncidents: Tables<'incidents'>[];
  hasActivePolicy: boolean;
  onClaimCreated: () => void;
}

export default function WorkerReportPanel({ recentIncidents, hasActivePolicy, onClaimCreated }: WorkerReportPanelProps) {
  const { t } = useTranslation();
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; status: string } | null>(null);

  const triggerOptions = [
    { id: 'RAIN_HEAVY', label: t('workerReport.heavyRain'), icon: CloudRain, emoji: '🌧️', color: 'text-blue-400' },
    { id: 'RAIN_EXTREME', label: t('workerReport.flooding'), icon: CloudRain, emoji: '🌊', color: 'text-blue-500' },
    { id: 'HEAT_EXTREME', label: t('workerReport.extremeHeat'), icon: Flame, emoji: '🔥', color: 'text-orange-400' },
    { id: 'AQI_SEVERE', label: t('workerReport.severeAqi'), icon: Wind, emoji: '😷', color: 'text-yellow-500' },
    { id: 'CURFEW_LOCAL', label: t('workerReport.curfew'), icon: Ban, emoji: '🚫', color: 'text-red-400' },
    { id: 'STORM_CYCLONE', label: t('workerReport.cyclone'), icon: CloudLightning, emoji: '🌀', color: 'text-purple-400' },
  ];

  const reportDisruption = async () => {
    if (!selectedTrigger) return;
    setSubmitting(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('worker-report', { body: { action: 'report_disruption', trigger_type: selectedTrigger } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Report failed');
      setResult({ message: data.message, status: data.claim?.status || 'processing' });
      toast.success(data.message);
      sendMockWhatsAppClaimCreated(data.claim?.amount || 450, selectedTrigger);
      setSelectedTrigger(''); onClaimCreated();
    } catch (e: any) { toast.error(e.message || 'Failed to report disruption'); }
    setSubmitting(false);
  };

  const fileClaim = async (incidentId: string) => {
    setSubmitting(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('worker-report', { body: { action: 'file_claim', incident_id: incidentId } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Claim failed');
      setResult({ message: data.message, status: data.claim?.status || 'approved' });
      toast.success(data.message);
      sendMockWhatsAppClaimCreated(data.claim?.amount || 450, data.claim?.trigger_type || 'RAIN_HEAVY');
      onClaimCreated();
    } catch (e: any) { toast.error(e.message || 'Failed to file claim'); }
    setSubmitting(false);
  };

  if (!hasActivePolicy) return null;

  return (
    <div className="space-y-4">
      <Card className="shadow-card border-accent/20 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center"><AlertTriangle className="w-3.5 h-3.5 text-accent" /></div>
            {t('workerReport.reportDisruption')}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t('workerReport.reportDesc')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {triggerOptions.map((tr) => (
              <button key={tr.id} onClick={() => setSelectedTrigger(tr.id)} disabled={submitting} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${selectedTrigger === tr.id ? 'border-accent bg-accent/10 shadow-sm' : 'border-border/50 bg-muted/30 hover:bg-muted/50'}`}>
                <span className="text-xl">{tr.emoji}</span>
                <span className="text-[10px] font-medium leading-tight">{tr.label}</span>
              </button>
            ))}
          </div>
          <Button onClick={reportDisruption} disabled={!selectedTrigger || submitting} className="w-full h-11 gradient-danger text-primary-foreground border-0 font-semibold">
            {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('workerReport.submitting')}</>) : (<><Send className="w-4 h-4 mr-2" /> {t('workerReport.reportAndClaim')}</>)}
          </Button>
        </CardContent>
      </Card>

      {recentIncidents.length > 0 && (
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-primary" /></div>
              {t('workerReport.activeIncidents')}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t('workerReport.activeIncidentsDesc')}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentIncidents.slice(0, 5).map((inc) => {
              const trigger = triggerOptions.find(tr => tr.id === inc.trigger_type);
              return (
                <button key={inc.id} onClick={() => fileClaim(inc.id)} disabled={submitting} className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center text-base shadow-sm">{trigger?.emoji || '⚡'}</div>
                    <div><p className="text-sm font-medium">{trigger?.label || inc.trigger_type}</p><p className="text-[10px] text-muted-foreground">{new Date(inc.created_at).toLocaleString()} · Severity: {inc.severity}%</p></div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary group-hover:bg-primary/10 transition-colors">{t('workerReport.fileClaim')}</Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className={`shadow-card border-0 ${result.status === 'approved' ? 'bg-secondary/10 border-secondary/20' : result.status === 'flagged' ? 'bg-destructive/10 border-destructive/20' : 'bg-accent/10 border-accent/20'}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className={`w-5 h-5 shrink-0 ${result.status === 'approved' ? 'text-secondary' : result.status === 'flagged' ? 'text-destructive' : 'text-accent'}`} />
                <p className="text-sm font-medium">{result.message}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
