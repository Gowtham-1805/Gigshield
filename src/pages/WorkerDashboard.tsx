import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Home, FileText, User, Bell, LogOut, Loader2, Banknote, Brain, TrendingUp, CheckCircle2, ArrowRight, IndianRupee, Smartphone } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldScoreGauge } from '@/components/worker/ShieldScoreGauge';
import WorkerReportPanel from '@/components/worker/WorkerReportPanel';
import { PayoutSimulator } from '@/components/worker/PayoutSimulator';
import { useAuth } from '@/lib/auth-context';
import { triggerTypes } from '@/lib/mock-data';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/shared/NotificationBell';
import GpsLocationCard from '@/components/worker/GpsLocationCard';
import { toast } from 'sonner';
import { sendMockWhatsAppPremiumPaid } from '@/lib/whatsapp-mock';
import type { Tables } from '@/integrations/supabase/types';
import { useTranslation } from 'react-i18next';

const statusColors = {
  approved: 'bg-secondary/10 text-secondary border-secondary/20',
  processing: 'bg-accent/10 text-accent border-accent/20',
  flagged: 'bg-destructive/10 text-destructive border-destructive/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};
const statusIcons: Record<string, string> = { approved: '✅', processing: '🔄', flagged: '🚩', rejected: '❌' };

export default function WorkerDashboard() {
  const { t } = useTranslation();
  const { worker, user, signOut, refreshWorker } = useAuth();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<Tables<'policies'> | null>(null);
  const [claims, setClaims] = useState<Tables<'claims'>[]>([]);
  const [payouts, setPayouts] = useState<Tables<'payouts'>[]>([]);
  const [zone, setZone] = useState<Tables<'zones'> | null>(null);
  const [claimedThisWeek, setClaimedThisWeek] = useState(0);
  const [weatherAlert, setWeatherAlert] = useState<{ text: string; icon: string } | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Tables<'incidents'>[]>([]);
  const [proactiveAlert, setProactiveAlert] = useState<string | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [showPayoutSimulator, setShowPayoutSimulator] = useState(false);
  const [simulatedPayout, setSimulatedPayout] = useState<{ amount: number; claimType: string } | null>(null);
  const [renewPayStage, setRenewPayStage] = useState<'idle' | 'initiating' | 'verifying' | 'processing' | 'completed'>('idle');
  const [renewTxnId, setRenewTxnId] = useState('');

  const fetchData = async () => {
    if (!worker) return;
    const { data: pol } = await supabase
      .from('policies').select('*').eq('worker_id', worker.id).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    setPolicy(pol);

    if (pol) {
      const { data: claimsData } = await supabase
        .from('claims').select('*').eq('policy_id', pol.id)
        .order('created_at', { ascending: false }).limit(10);
      setClaims(claimsData || []);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const weekClaims = (claimsData || []).filter(c => c.created_at > weekAgo && c.status === 'approved');
      setClaimedThisWeek(weekClaims.reduce((s, c) => s + Number(c.amount), 0));

      if (claimsData?.length) {
        const claimIds = claimsData.map(c => c.id);
        const { data: payoutsData } = await supabase
          .from('payouts').select('*').in('claim_id', claimIds)
          .order('created_at', { ascending: false });
        setPayouts(payoutsData || []);
      }
    }

    if (worker.zone_id) {
      const { data: z } = await supabase.from('zones').select('*').eq('id', worker.zone_id).maybeSingle();
      setZone(z);

      const { data: reading } = await supabase
        .from('weather_readings').select('*').eq('zone_id', worker.zone_id)
        .order('recorded_at', { ascending: false }).limit(1).maybeSingle();

      if (reading) {
        const alerts: string[] = [];
        if (reading.rainfall && reading.rainfall > 30) alerts.push(`🌧️ Rainfall: ${reading.rainfall}mm/hr`);
        if (reading.temperature && reading.temperature > 42) alerts.push(`🔥 Temperature: ${reading.temperature}°C`);
        if (reading.aqi && reading.aqi > 300) alerts.push(`😷 AQI: ${reading.aqi}`);
        if (reading.wind_speed && reading.wind_speed > 20) alerts.push(`💨 Wind: ${reading.wind_speed}m/s`);
        
        if (alerts.length > 0) {
          setWeatherAlert({ text: alerts.join(' • ') + ' — Your coverage will auto-apply.', icon: '⚠️' });
        } else {
          setWeatherAlert({ text: `Current: ${reading.temperature?.toFixed(1)}°C, AQI ${reading.aqi || 'N/A'} — No alerts. You're safe! ✅`, icon: '☀️' });
        }
      }

      const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      const { data: incidents } = await supabase
        .from('incidents').select('*')
        .gte('created_at', dayAgo).order('created_at', { ascending: false });
      
      if (incidents && worker) {
        let eligibleIncidents = incidents.filter(i => i.zone_id === worker.zone_id);
        
        if (worker.last_lat && worker.last_lng) {
          const { data: zones } = await supabase.from('zones').select('id, lat, lng');
          if (zones) {
            const nearbyZoneIds = zones.filter(z => {
              const R = 6371;
              const dLat = (z.lat - (worker.last_lat as number)) * Math.PI / 180;
              const dLng = (z.lng - (worker.last_lng as number)) * Math.PI / 180;
              const a = Math.sin(dLat / 2) ** 2 +
                Math.cos((worker.last_lat as number) * Math.PI / 180) * Math.cos(z.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
              const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              return dist <= 10 && z.id !== worker.zone_id;
            }).map(z => z.id);
            
            const nearbyIncidents = incidents.filter(i => nearbyZoneIds.includes(i.zone_id));
            eligibleIncidents = [...eligibleIncidents, ...nearbyIncidents];
          }
        }
        setRecentIncidents(eligibleIncidents);
      } else {
        setRecentIncidents([]);
      }

      try {
        const { data: predData } = await supabase.functions.invoke('ai-predict', {
          body: { type: 'zone_predictions' },
        });
        if (predData?.predictions) {
          const zoneCity = z?.city;
          const cityPred = predData.predictions.find((p: any) => p.city === zoneCity);
          if (cityPred && cityPred.probability > 50) {
            setProactiveAlert(`⚠️ ${cityPred.event} expected in your area (${cityPred.probability}% chance). Your coverage will auto-apply if confirmed.`);
          }
        }
      } catch (e) {
        console.error('Prediction alert error:', e);
      }
    }
  };

  useEffect(() => {
    if (!worker) return;
    fetchData();
    const channel = supabase.channel('worker-claims')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [worker]);

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  const startRenewPayment = () => {
    if (!policy) return;
    setRenewTxnId(`GS${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    setRenewPayStage('initiating');
    setTimeout(() => setRenewPayStage('verifying'), 1000);
    setTimeout(() => setRenewPayStage('processing'), 2200);
    setTimeout(() => setRenewPayStage('completed'), 3500);
  };

  const handleRenewAfterPay = async () => {
    if (!policy) return;
    setRenewPayStage('idle');
    setRenewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('renew-policy', { body: { policy_id: policy.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(t('worker.policyRenewed'));
      sendMockWhatsAppPremiumPaid(Number(policy.premium), policy.tier);
      const { data: newPol } = await supabase
        .from('policies').select('*').eq('worker_id', worker!.id).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      setPolicy(newPol);
    } catch (e: any) { toast.error(e.message || 'Renewal failed'); }
    setRenewing(false);
  };

  const renewStageConfig: Record<string, { icon: string; label: string; color: string }> = {
    idle: { icon: '', label: '', color: '' },
    initiating: { icon: '🔐', label: t('payment.initiating'), color: 'text-primary' },
    verifying: { icon: '🔍', label: t('payment.verifying'), color: 'text-accent' },
    processing: { icon: '💸', label: t('payment.processingAmount', { amount: policy ? Number(policy.premium) : 0 }), color: 'text-secondary' },
    completed: { icon: '✅', label: t('payment.success'), color: 'text-secondary' },
  };

  const navItems = [
    { icon: Home, label: t('worker.home'), active: true, path: '/worker' },
    { icon: FileText, label: t('worker.claims'), path: '/claims' },
    { icon: Brain, label: t('worker.forecast'), path: '/predictions' },
    { icon: Bell, label: t('worker.alerts'), path: '/alerts' },
    { icon: User, label: t('worker.profile'), path: '/profile' },
  ];

  const daysLeft = policy ? Math.max(0, Math.ceil((new Date(policy.end_date).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-shield flex items-center justify-center shadow-glow-blue">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm tracking-tight">GigShield</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} title={t('common.signOut')} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted-foreground text-sm">{t('worker.welcomeBack')}</p>
          <h1 className="font-display text-2xl font-bold">{worker?.name || 'Worker'} 👋</h1>
        </motion.div>

        {/* Active Plan Card */}
        {policy ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="overflow-hidden relative border-0 shadow-elevated">
              <div className="absolute inset-0 gradient-hero" />
              <div className="absolute inset-0 pattern-grid opacity-20" />
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/20 -translate-y-12 translate-x-12 blur-2xl" />
              <CardContent className="relative p-6 text-primary-foreground">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-primary-foreground/50 uppercase tracking-wider font-medium">{t('worker.activePlan')}</p>
                    <p className="font-display font-bold text-2xl mt-1">{policy.tier}</p>
                  </div>
                  <Badge className="bg-secondary/20 text-secondary-foreground border-0 backdrop-blur-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-safety-green mr-1.5 animate-pulse" />
                    {t('worker.active')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-primary-foreground/40 mb-4">
                  <span>{policy.start_date}</span>
                  <span>→</span>
                  <span>{policy.end_date}</span>
                  <Badge variant="outline" className={`ml-auto border-primary-foreground/20 text-primary-foreground/70 text-[10px] ${daysLeft <= 2 ? 'border-destructive/50 text-destructive' : ''}`}>
                    {t('worker.daysLeft', { days: daysLeft })}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-primary-foreground/10 backdrop-blur-sm p-3 text-center border border-primary-foreground/5">
                    <p className="font-display font-bold text-xl">₹{claimedThisWeek.toLocaleString()}</p>
                    <p className="text-[10px] text-primary-foreground/50 mt-0.5">{t('worker.claimedThisWeek')}</p>
                  </div>
                  <div className="rounded-xl bg-primary-foreground/10 backdrop-blur-sm p-3 text-center border border-primary-foreground/5">
                    <p className="font-display font-bold text-xl">₹{Number(policy.max_payout).toLocaleString()}</p>
                    <p className="text-[10px] text-primary-foreground/50 mt-0.5">{t('worker.maxCoverage')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-card border-accent/20 gradient-subtle">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <p className="text-muted-foreground mb-4">{t('worker.noPlan')}</p>
                <Link to="/signup">
                  <Button className="gradient-shield text-primary-foreground border-0 shadow-glow-blue">{t('worker.getProtectedNow')}</Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Shield Score */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                </div>
                {t('worker.shieldScore')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <ShieldScoreGauge score={worker?.shield_score || 50} />
              <div className="text-right text-sm space-y-2">
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground">{t('worker.zone')}</p>
                  <p className="font-medium text-xs">{zone?.name || worker?.city || 'N/A'}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground">{t('worker.platformLabel')}</p>
                  <p className="font-medium text-xs">{worker?.platform || 'N/A'}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground">{t('worker.weeklyEarnings')}</p>
                  <p className="font-medium text-xs">₹{Number(worker?.weekly_earnings || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* GPS Location Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <GpsLocationCard
            workerId={worker?.id || ''}
            workerZoneName={zone?.name}
            lastLat={(worker as any)?.last_lat}
            lastLng={(worker as any)?.last_lng}
            lastLocationAt={(worker as any)?.last_location_at}
            onLocationUpdated={async () => { await refreshWorker(); await fetchData(); }}
          />
        </motion.div>

        {/* Proactive AI Alert */}
        {proactiveAlert && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="shadow-card border-primary/20 bg-primary/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-primary/10 -translate-y-6 translate-x-6 blur-xl" />
              <CardContent className="p-4 flex items-start gap-3 relative">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                  🔮
                </div>
                <div>
                  <p className="font-display font-semibold text-sm text-primary">{t('worker.aiPrediction')}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{proactiveAlert}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Weather Alert */}
        {weatherAlert && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className={`shadow-card overflow-hidden relative ${
              weatherAlert.icon === '⚠️' ? 'border-accent/20 bg-accent/5' : 'border-secondary/20 bg-secondary/5'
            }`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                  weatherAlert.icon === '⚠️' ? 'bg-accent/10' : 'bg-secondary/10'
                }`}>
                  {weatherAlert.icon}
                </div>
                <div>
                  <p className="font-display font-semibold text-sm">{t('worker.weatherAlert')}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{weatherAlert.text}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Worker Report & Claim Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}>
          <WorkerReportPanel
            recentIncidents={recentIncidents}
            hasActivePolicy={!!policy}
            onClaimCreated={fetchData}
          />
        </motion.div>

        {/* Payout Tracking */}
        {payouts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="shadow-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-secondary/10 flex items-center justify-center">
                    💸
                  </div>
                  {t('worker.payoutStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payouts.slice(0, 3).map((payout) => {
                  const statusConfig = {
                    pending: { icon: '⏳', color: 'text-accent', bg: 'bg-accent/10', label: t('worker.processing') },
                    completed: { icon: '✅', color: 'text-secondary', bg: 'bg-secondary/10', label: t('worker.sent') },
                    failed: { icon: '❌', color: 'text-destructive', bg: 'bg-destructive/10', label: t('worker.failed') },
                  };
                  const config = statusConfig[payout.status] || statusConfig.pending;
                  return (
                    <div key={payout.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center text-base`}>
                          {config.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium">₹{Number(payout.amount).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {payout.upi_id ? `→ ${payout.upi_id}` : t('worker.upiTransfer')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={`text-[10px] ${config.color} border-current/20`}>
                          {config.label}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {payouts.length > 3 && (
                  <Link to="/claims" className="block text-center text-xs text-primary font-medium pt-2 hover:underline">
                    {t('common.viewAll')}
                  </Link>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-card border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display">{t('worker.recentActivity')}</CardTitle>
                <Link to="/claims" className="text-xs text-primary font-medium hover:underline">{t('common.viewAll')}</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {claims.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">{t('worker.noClaims')}</p>
              )}
              {claims.slice(0, 4).map((claim) => {
                const trigger = triggerTypes.find(tt => tt.id === claim.trigger_type);
                return (
                  <div key={claim.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center text-base shadow-sm">
                        {statusIcons[claim.status] || '🔄'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">₹{Number(claim.amount)} · {trigger?.label}</p>
                        <p className="text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${statusColors[claim.status] || ''}`}>
                      {claim.status}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button 
            className="gradient-shield text-primary-foreground border-0 h-12 shadow-glow-blue font-semibold"
            onClick={startRenewPayment}
            disabled={renewing || !policy || renewPayStage !== 'idle'}
          >
            {renewing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('worker.renew', { amount: policy ? Number(policy.premium) : '' })}
          </Button>
          <Button 
            variant="outline" 
            className="h-12 font-semibold border-secondary/30 text-secondary hover:bg-secondary/10"
            onClick={() => {
              setSimulatedPayout({ amount: 450, claimType: 'RAIN_HEAVY' });
              setShowPayoutSimulator(true);
            }}
          >
            <Banknote className="w-4 h-4 mr-1" />
            {t('worker.demoPay')}
          </Button>
          <Link to="/claims">
            <Button variant="outline" className="h-12 w-full font-semibold border-border/50">
              {t('worker.history')}
            </Button>
          </Link>
        </div>

        {/* Payout Simulator Modal */}
        <PayoutSimulator
          isOpen={showPayoutSimulator}
          onClose={() => setShowPayoutSimulator(false)}
          amount={simulatedPayout?.amount || 450}
          upiId={worker?.phone ? `${worker.phone}@upi` : 'worker@ybl'}
          claimType={simulatedPayout?.claimType || 'RAIN_HEAVY'}
          workerName={worker?.name || 'Worker'}
        />

        {/* Renew Demo Payment Overlay */}
        <AnimatePresence>
          {renewPayStage !== 'idle' && policy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-sm"
              >
                <Card className="border-0 shadow-elevated overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-primary/80 p-4 relative overflow-hidden">
                    <div className="absolute inset-0 pattern-grid opacity-10" />
                    <div className="relative flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <IndianRupee className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">{t('worker.policyRenewal')}</p>
                        <p className="text-white font-bold text-sm">UPI • {policy.tier} {t('common.plan')}</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                      <p className="text-muted-foreground text-sm mb-1">{t('worker.renewalPremium')}</p>
                      <span className="text-4xl font-display font-bold">₹{Number(policy.premium)}</span>
                      <p className="text-xs text-muted-foreground mt-1">{t('common.weekly')} • {policy.tier}</p>
                    </motion.div>

                    <div className="flex items-center justify-center gap-3 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-secondary" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{t('payment.yourUpi')}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center relative">
                        <div className="h-0.5 w-full bg-border absolute" />
                        <motion.div
                          initial={{ x: -30 }}
                          animate={{ x: renewPayStage === 'completed' ? 30 : [-30, 30] }}
                          transition={renewPayStage === 'completed' ? { duration: 0 } : { duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                          className="relative z-10 w-6 h-6 rounded-full bg-secondary flex items-center justify-center shadow-md"
                        >
                          {renewPayStage === 'completed' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <ArrowRight className="w-3 h-3 text-white" />}
                        </motion.div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg">🛡️</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{t('payment.gigshield')}</span>
                      </div>
                    </div>

                    <motion.div key={renewPayStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                      <div className={`flex items-center justify-center gap-2 ${renewStageConfig[renewPayStage].color}`}>
                        {renewPayStage !== 'completed' && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span className="text-lg">{renewStageConfig[renewPayStage].icon}</span>
                        <span className="font-medium text-sm">{renewStageConfig[renewPayStage].label}</span>
                      </div>
                    </motion.div>

                    <div className="flex items-center justify-center gap-2">
                      {(['initiating', 'verifying', 'processing', 'completed'] as const).map((s) => {
                        const stages = ['initiating', 'verifying', 'processing', 'completed'];
                        const isComplete = stages.indexOf(s) <= stages.indexOf(renewPayStage);
                        return <motion.div key={s} initial={{ scale: 0.5 }} animate={{ scale: isComplete ? 1 : 0.8 }} className={`w-2 h-2 rounded-full transition-colors ${isComplete ? 'bg-secondary' : 'bg-muted'}`} />;
                      })}
                    </div>

                    <AnimatePresence>
                      {renewPayStage === 'completed' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                          <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{t('common.plan')}</span>
                              <span className="font-medium">{policy.tier}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{t('common.amount')}</span>
                              <span className="font-medium">₹{Number(policy.premium)}/{t('common.weekly').toLowerCase()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{t('common.transactionId')}</span>
                              <span className="font-medium font-mono text-xs">{renewTxnId}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm pt-2 border-t border-secondary/20">
                              <span className="text-muted-foreground">{t('common.status')}</span>
                              <Badge className="bg-secondary/10 text-secondary border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> {t('common.paid')}</Badge>
                            </div>
                          </div>
                          <Button onClick={handleRenewAfterPay} className="w-full gradient-shield text-primary-foreground border-0">
                            {t('worker.activateRenewal')}
                          </Button>
                          <p className="text-center text-[10px] text-muted-foreground">{t('common.noRealCharge')}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 glass-dark border-t border-border/10 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                item.active ? 'text-primary' : 'text-primary-foreground/40 hover:text-primary-foreground/60'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
