import { motion } from 'framer-motion';
import { Shield, Home, FileText, User, Bell, LogOut, Menu, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldScoreGauge } from '@/components/ShieldScoreGauge';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { triggerTypes } from '@/lib/mock-data';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

const statusColors = {
  approved: 'bg-secondary/10 text-secondary border-secondary/20',
  processing: 'bg-accent/10 text-accent border-accent/20',
  flagged: 'bg-destructive/10 text-destructive border-destructive/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};
const statusIcons: Record<string, string> = { approved: '✅', processing: '🔄', flagged: '🚩', rejected: '❌' };

export default function WorkerDashboard() {
  const { t } = useLanguage();
  const { worker, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [policy, setPolicy] = useState<Tables<'policies'> | null>(null);
  const [claims, setClaims] = useState<Tables<'claims'>[]>([]);
  const [zone, setZone] = useState<Tables<'zones'> | null>(null);
  const [claimedThisWeek, setClaimedThisWeek] = useState(0);
  const [weatherAlert, setWeatherAlert] = useState<{ text: string; icon: string } | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Tables<'incidents'>[]>([]);
  const [proactiveAlert, setProactiveAlert] = useState<string | null>(null);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    if (!worker) return;

    const fetchData = async () => {
      // Fetch active policy
      const { data: pol } = await supabase
        .from('policies')
        .select('*')
        .eq('worker_id', worker.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPolicy(pol);

      // Fetch claims through policies
      if (pol) {
        const { data: claimsData } = await supabase
          .from('claims')
          .select('*')
          .eq('policy_id', pol.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setClaims(claimsData || []);

        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const weekClaims = (claimsData || []).filter(c => c.created_at > weekAgo && c.status === 'approved');
        setClaimedThisWeek(weekClaims.reduce((s, c) => s + Number(c.amount), 0));
      }

      // Fetch zone
      if (worker.zone_id) {
        const { data: z } = await supabase.from('zones').select('*').eq('id', worker.zone_id).maybeSingle();
        setZone(z);

        // Fetch recent weather reading for alert
        const { data: reading } = await supabase
          .from('weather_readings')
          .select('*')
          .eq('zone_id', worker.zone_id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

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

        // Fetch recent incidents for this zone
        const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
        const { data: incidents } = await supabase
          .from('incidents')
          .select('*')
          .eq('zone_id', worker.zone_id)
          .gte('created_at', dayAgo)
          .order('created_at', { ascending: false });
        setRecentIncidents(incidents || []);

        // Fetch proactive prediction alert
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

    fetchData();

    // Realtime for claims
    const channel = supabase
      .channel('worker-claims')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [worker]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleRenew = async () => {
    if (!policy) return;
    setRenewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('renew-policy', {
        body: { policy_id: policy.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('🛡️ Policy renewed for another week!');
      // Refresh data
      const { data: newPol } = await supabase
        .from('policies')
        .select('*')
        .eq('worker_id', worker!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPolicy(newPol);
    } catch (e: any) {
      toast.error(e.message || 'Renewal failed');
    }
    setRenewing(false);
  };

  const navItems = [
    { icon: Home, label: t('home'), active: true, path: '/worker' },
    { icon: FileText, label: t('claims'), path: '/claims' },
    { icon: Bell, label: t('alerts'), path: '/worker' },
    { icon: User, label: t('profile'), path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-shield flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">GigShield</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNav(!mobileNav)}>
              {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted-foreground text-sm">{t('welcomeBack')},</p>
          <h1 className="font-display text-2xl font-bold">{worker?.name || 'Worker'} 👋</h1>
        </motion.div>

        {/* Active Plan Card */}
        {policy ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="gradient-shield text-primary-foreground overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary-foreground/5 -translate-y-8 translate-x-8" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs opacity-80">{t('activePlan')}</p>
                    <p className="font-display font-bold text-lg">{policy.tier}</p>
                  </div>
                  <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                    {t('coverageActive')} ✅
                  </Badge>
                </div>
                <p className="text-xs opacity-70">
                  {t('validUntil')}: {policy.start_date} → {policy.end_date}
                </p>
                <div className="flex gap-4 mt-4">
                  <div className="bg-primary-foreground/10 rounded-lg p-3 flex-1 text-center">
                    <p className="font-display font-bold text-xl">₹{claimedThisWeek.toLocaleString()}</p>
                    <p className="text-[10px] opacity-70">{t('claimedThisWeek')}</p>
                  </div>
                  <div className="bg-primary-foreground/10 rounded-lg p-3 flex-1 text-center">
                    <p className="font-display font-bold text-xl">₹{Number(policy.max_payout).toLocaleString()}</p>
                    <p className="text-[10px] opacity-70">{t('maxCoverage')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-card border-accent/30">
              <CardContent className="p-5 text-center">
                <p className="text-muted-foreground mb-3">No active plan yet</p>
                <Button className="gradient-shield text-primary-foreground border-0">Get Protected Now</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Shield Score */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">{t('shieldScore')}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <ShieldScoreGauge score={worker?.shield_score || 50} />
              <div className="text-right text-sm text-muted-foreground space-y-1">
                <p>Zone: {zone?.name || worker?.city || 'N/A'}</p>
                <p>Platform: {worker?.platform || 'N/A'}</p>
                <p>Avg ₹{Number(worker?.weekly_earnings || 0).toLocaleString()}/week</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weather Alert */}
        {weatherAlert && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className={`shadow-card ${weatherAlert.icon === '⚠️' ? 'border-accent/30 bg-accent/5' : 'border-secondary/30 bg-secondary/5'}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-xl">
                  {weatherAlert.icon}
                </div>
                <div>
                  <p className="font-display font-semibold text-sm">{t('weatherAlert')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{weatherAlert.text}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Incidents */}
        {recentIncidents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="shadow-card border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display text-destructive">🚨 Recent Incidents in Your Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentIncidents.slice(0, 3).map((inc) => {
                  const trigger = triggerTypes.find(t => t.id === inc.trigger_type);
                  return (
                    <div key={inc.id} className="flex items-center justify-between py-1.5 text-sm">
                      <span>{trigger?.icon} {trigger?.label} — Severity {inc.severity}%</span>
                      <span className="text-xs text-muted-foreground">{new Date(inc.created_at).toLocaleTimeString()}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">{t('recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {claims.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No claims yet. Stay protected! 🛡️</p>
              )}
              {claims.slice(0, 4).map((claim) => {
                const trigger = triggerTypes.find(tt => tt.id === claim.trigger_type);
                return (
                  <div key={claim.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{statusIcons[claim.status] || '🔄'}</span>
                      <div>
                        <p className="text-sm font-medium">₹{Number(claim.amount)} {trigger?.icon} {trigger?.label}</p>
                        <p className="text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${statusColors[claim.status] || ''}`}>
                      {claim.status}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="gradient-shield text-primary-foreground border-0 h-12">
            {t('renewPlan')} {policy ? `— ₹${Number(policy.premium)}/wk` : ''}
          </Button>
          <Link to="/claims">
            <Button variant="outline" className="h-12 w-full">
              {t('claimHistory')}
            </Button>
          </Link>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs ${item.active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
