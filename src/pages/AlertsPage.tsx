import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Cloud, Brain, FileCheck, Banknote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { triggerTypes } from '@/lib/mock-data';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@/integrations/supabase/types';

interface AlertItem {
  id: string;
  type: 'weather' | 'prediction' | 'claim';
  title: string;
  description: string;
  icon: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'danger';
}

export default function AlertsPage() {
  const { t } = useTranslation();
  const { worker } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!worker) return;
    fetchAlerts();
  }, [worker]);

  const fetchAlerts = async () => {
    if (!worker?.zone_id) { setLoading(false); return; }
    setLoading(true);
    const allAlerts: AlertItem[] = [];

    const { data: readings } = await supabase.from('weather_readings').select('*').eq('zone_id', worker.zone_id).order('recorded_at', { ascending: false }).limit(20);
    if (readings) {
      for (const r of readings) {
        const warnings: string[] = [];
        if (r.rainfall && r.rainfall > 30) warnings.push(`Rainfall: ${r.rainfall}mm/hr`);
        if (r.temperature && r.temperature > 42) warnings.push(`Temperature: ${r.temperature}°C`);
        if (r.aqi && r.aqi > 300) warnings.push(`AQI: ${r.aqi}`);
        if (r.wind_speed && r.wind_speed > 20) warnings.push(`Wind: ${r.wind_speed}m/s`);
        if (warnings.length > 0) {
          const severity: AlertItem['severity'] = (r.aqi && r.aqi > 400) || (r.rainfall && r.rainfall > 80) || (r.temperature && r.temperature > 45) ? 'danger' : 'warning';
          allAlerts.push({ id: `weather-${r.id}`, type: 'weather', title: severity === 'danger' ? t('alerts.severeWeather') : t('alerts.weatherWarning'), description: warnings.join(' • '), icon: r.rainfall && r.rainfall > 30 ? '🌧️' : r.temperature && r.temperature > 42 ? '🔥' : r.aqi && r.aqi > 300 ? '😷' : '💨', timestamp: r.recorded_at, severity });
        }
      }
    }

    const { data: incidents } = await supabase.from('incidents').select('*').eq('zone_id', worker.zone_id).order('created_at', { ascending: false }).limit(20);
    if (incidents) {
      for (const inc of incidents) {
        const trigger = triggerTypes.find(t => t.id === inc.trigger_type);
        allAlerts.push({ id: `incident-${inc.id}`, type: 'prediction', title: `${trigger?.icon || '⚡'} ${trigger?.label || inc.trigger_type} Detected`, description: `Severity: ${inc.severity}/100${inc.is_simulated ? ' (Simulated)' : ''} — ${trigger?.threshold || 'Threshold exceeded'}`, icon: trigger?.icon || '⚡', timestamp: inc.created_at, severity: inc.severity >= 80 ? 'danger' : inc.severity >= 50 ? 'warning' : 'info' });
      }
    }

    const { data: policies } = await supabase.from('policies').select('id').eq('worker_id', worker.id);
    if (policies && policies.length > 0) {
      const policyIds = policies.map(p => p.id);
      const { data: claims } = await supabase.from('claims').select('*').in('policy_id', policyIds).order('created_at', { ascending: false }).limit(20);
      if (claims) {
        for (const claim of claims) {
          const trigger = triggerTypes.find(t => t.id === claim.trigger_type);
          const statusMap: Record<string, { label: string; severity: AlertItem['severity'] }> = {
            approved: { label: t('alerts.claimApproved'), severity: 'info' },
            processing: { label: t('alerts.claimProcessing'), severity: 'warning' },
            flagged: { label: t('alerts.claimFlagged'), severity: 'danger' },
            rejected: { label: t('alerts.claimRejected'), severity: 'danger' },
          };
          const status = statusMap[claim.status] || { label: claim.status, severity: 'info' as const };
          allAlerts.push({ id: `claim-${claim.id}`, type: 'claim', title: `Claim ${status.label}`, description: `₹${claim.amount} — ${trigger?.label || claim.trigger_type} • Fraud Score: ${(claim.fraud_score * 100).toFixed(0)}%`, icon: claim.status === 'approved' ? '✅' : claim.status === 'flagged' ? '🚩' : claim.status === 'rejected' ? '❌' : '🔄', timestamp: claim.updated_at, severity: status.severity });
        }
      }
    }

    const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', worker.user_id).order('created_at', { ascending: false }).limit(30);
    if (notifs) {
      for (const n of notifs) {
        const typeMap: Record<string, AlertItem['type']> = { weather: 'weather', claim: 'claim', payout: 'claim' };
        const severityMap: Record<string, AlertItem['severity']> = { weather: 'warning', claim: 'info', payout: 'info' };
        const iconMap: Record<string, string> = { weather: '🌧️', claim: '📋', payout: '💰' };
        const nType = (n as any).type as string;
        allAlerts.push({ id: `notif-${n.id}`, type: typeMap[nType] || 'claim', title: n.title, description: n.message, icon: iconMap[nType] || '🔔', timestamp: n.created_at, severity: severityMap[nType] || 'info' });
      }
    }

    const seen = new Set<string>();
    const deduped: AlertItem[] = [];
    for (const a of allAlerts) { if (!seen.has(a.id)) { seen.add(a.id); deduped.push(a); } }
    deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setAlerts(deduped);
    setLoading(false);
  };

  const filteredAlerts = activeTab === 'all' ? alerts : alerts.filter(a => a.type === activeTab);
  const severityStyles: Record<AlertItem['severity'], string> = { info: 'border-secondary/20 bg-secondary/5', warning: 'border-accent/20 bg-accent/5', danger: 'border-destructive/20 bg-destructive/5' };
  const severityBadge: Record<AlertItem['severity'], string> = { info: 'bg-secondary/10 text-secondary border-secondary/20', warning: 'bg-accent/10 text-accent border-accent/20', danger: 'bg-destructive/10 text-destructive border-destructive/20' };
  const typeLabels: Record<string, { label: string; icon: React.ReactNode }> = { weather: { label: t('alerts.weather'), icon: <Cloud className="w-3 h-3" /> }, prediction: { label: t('alerts.incidents'), icon: <Brain className="w-3 h-3" /> }, claim: { label: t('claims.claimHistory'), icon: <FileCheck className="w-3 h-3" /> } };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return t('alerts.justNow');
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="flex items-center gap-3 h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate('/worker')} className="shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-shield flex items-center justify-center shadow-glow-blue"><Bell className="w-4 h-4 text-primary-foreground" /></div>
            <div>
              <h1 className="font-display font-bold text-base tracking-tight">{t('alerts.title')}</h1>
              <p className="text-[10px] text-muted-foreground">{t('alerts.notifications', { count: alerts.length })}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full bg-muted/50">
            <TabsTrigger value="all" className="text-xs">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="weather" className="text-xs">{t('alerts.weather')}</TabsTrigger>
            <TabsTrigger value="prediction" className="text-xs">{t('alerts.incidents')}</TabsTrigger>
            <TabsTrigger value="claim" className="text-xs">{t('claims.claimHistory')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filteredAlerts.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4"><Bell className="w-8 h-8 text-muted-foreground/50" /></div>
            <p className="font-display font-semibold text-foreground">{t('alerts.noAlerts')}</p>
            <p className="text-sm text-muted-foreground mt-1">{activeTab === 'all' ? t('alerts.allClear') : t('alerts.noTypeAlerts', { type: activeTab })}</p>
          </motion.div>
        )}

        <div className="space-y-3">
          {filteredAlerts.map((alert, i) => (
            <motion.div key={alert.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}>
              <Card className={`shadow-card overflow-hidden ${severityStyles[alert.severity]}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${alert.severity === 'danger' ? 'bg-destructive/10' : alert.severity === 'warning' ? 'bg-accent/10' : 'bg-secondary/10'}`}>{alert.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display font-semibold text-sm leading-tight">{alert.title}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{formatTime(alert.timestamp)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${severityBadge[alert.severity]}`}>
                          {typeLabels[alert.type]?.icon}
                          {typeLabels[alert.type]?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
