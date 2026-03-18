import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, Shield, Wallet, AlertTriangle,
  Calendar, Loader2, IndianRupee
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

const TIER_MULTIPLIER: Record<string, number> = { BASIC: 0.8, STANDARD: 1.0, PRO: 1.2 };
const HOURLY_RATE = 150;

const triggerLabels: Record<string, { label: string; icon: string }> = {
  RAIN_HEAVY: { label: 'Heavy Rain', icon: '🌧️' },
  RAIN_EXTREME: { label: 'Extreme Rain', icon: '🌊' },
  HEAT_EXTREME: { label: 'Extreme Heat', icon: '🔥' },
  AQI_SEVERE: { label: 'Severe AQI', icon: '💨' },
  CURFEW_LOCAL: { label: 'Local Curfew', icon: '🚫' },
  STORM_CYCLONE: { label: 'Cyclone/Storm', icon: '🌀' },
};

interface ClaimWithIncident extends Tables<'claims'> {
  incident?: Tables<'incidents'> | null;
}

export default function EarningsReportPage() {
  const { t } = useTranslation();
  const { worker } = useAuth();
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<Tables<'policies'> | null>(null);
  const [claims, setClaims] = useState<ClaimWithIncident[]>([]);
  const [payouts, setPayouts] = useState<Tables<'payouts'>[]>([]);
  const [allPolicies, setAllPolicies] = useState<Tables<'policies'>[]>([]);

  const fetchData = async () => {
    if (!worker) return;
    setLoading(true);
    try {
      const { data: policies } = await supabase.from('policies').select('*').eq('worker_id', worker.id).order('created_at', { ascending: false });
      setAllPolicies(policies || []);
      setPolicy(policies?.[0] || null);
      if (policies?.length) {
        const policyIds = policies.map(p => p.id);
        const { data: claimsData } = await supabase.from('claims').select('*, incidents:incident_id(*)').in('policy_id', policyIds).order('created_at', { ascending: false });
        const processedClaims = (claimsData || []).map((c: any) => ({ ...c, incident: c.incidents }));
        setClaims(processedClaims);
        const claimIds = processedClaims.map(c => c.id);
        if (claimIds.length) {
          const { data: payoutsData } = await supabase.from('payouts').select('*').in('claim_id', claimIds);
          setPayouts(payoutsData || []);
        }
      }
    } catch (e) {
      console.error('Earnings report error:', e);
      toast.error('Failed to load earnings report');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [worker]);

  const approvedClaims = claims.filter(c => c.status === 'approved');
  const totalClaimAmount = approvedClaims.reduce((s, c) => s + Number(c.amount), 0);
  const completedPayouts = payouts.filter(p => p.status === 'completed');
  const totalPaidOut = completedPayouts.reduce((s, p) => s + Number(p.amount), 0);
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const totalPending = pendingPayouts.reduce((s, p) => s + Number(p.amount), 0);
  const totalPremiumsPaid = allPolicies.reduce((s, p) => s + Number(p.premium), 0);

  const estimatedIncomeLost = approvedClaims.reduce((s, c) => {
    const severity = c.incident?.severity || 70;
    const hoursLost = Math.max(2, Math.round(severity / 15));
    const tierMult = TIER_MULTIPLIER[policy?.tier || 'STANDARD'] || 1.0;
    return s + (hoursLost * HOURLY_RATE * tierMult);
  }, 0);

  const coverageRate = estimatedIncomeLost > 0 ? Math.round((totalClaimAmount / estimatedIncomeLost) * 100) : 0;
  const netBenefit = totalClaimAmount - totalPremiumsPaid;
  const roi = totalPremiumsPaid > 0 ? Math.round((netBenefit / totalPremiumsPaid) * 100) : 0;

  const triggerBreakdown = approvedClaims.reduce<Record<string, { count: number; amount: number }>>((acc, c) => {
    const key = c.trigger_type;
    if (!acc[key]) acc[key] = { count: 0, amount: 0 };
    acc[key].count += 1;
    acc[key].amount += Number(c.amount);
    return acc;
  }, {});

  const pieData = Object.entries(triggerBreakdown).map(([key, val]) => ({ name: triggerLabels[key]?.label || key, value: val.amount, icon: triggerLabels[key]?.icon || '⚠️' }));
  const pieColors = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(210 60% 50%)', 'hsl(280 60% 50%)'];

  const weeklyData = (() => {
    const weeks: Record<string, { week: string; claimed: number; lost: number }> = {};
    approvedClaims.forEach(c => {
      const date = new Date(c.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (!weeks[key]) weeks[key] = { week: key, claimed: 0, lost: 0 };
      weeks[key].claimed += Number(c.amount);
      const severity = c.incident?.severity || 70;
      const hoursLost = Math.max(2, Math.round(severity / 15));
      weeks[key].lost += hoursLost * HOURLY_RATE;
    });
    return Object.values(weeks).slice(-6);
  })();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link to="/worker"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h1 className="font-display font-bold">{t('earnings.title')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2"><ThemeToggle /><NotificationBell /></div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('earnings.loadingReport')}</p>
          </div>
        ) : (
          <>
            {/* Hero Value Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-card overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
                <CardContent className="relative p-6">
                  <div className="text-center mb-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('earnings.protectedYou')}</p>
                    <p className="font-display text-4xl font-bold text-primary">₹{totalClaimAmount.toLocaleString('en-IN')}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('earnings.againstLoss', { amount: estimatedIncomeLost.toLocaleString('en-IN') })}</p>
                  </div>
                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{t('earnings.coverageRate')}</span>
                      <span className={cn('font-bold', coverageRate >= 60 ? 'text-secondary' : coverageRate >= 30 ? 'text-accent' : 'text-destructive')}>{coverageRate}%</span>
                    </div>
                    <Progress value={Math.min(coverageRate, 100)} className="h-3" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 text-center">
                      <Wallet className="w-4 h-4 text-secondary mx-auto mb-1" />
                      <p className="font-display font-bold text-lg text-secondary">₹{totalPaidOut.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('earnings.paidOut')}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-center">
                      <Calendar className="w-4 h-4 text-accent mx-auto mb-1" />
                      <p className="font-display font-bold text-lg text-accent">₹{totalPending.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('earnings.pending')}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                      <Shield className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="font-display font-bold text-lg text-primary">₹{totalPremiumsPaid.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('earnings.premiumsPaid')}</p>
                    </div>
                    <div className={cn('p-3 rounded-lg border text-center', netBenefit >= 0 ? 'bg-secondary/10 border-secondary/20' : 'bg-destructive/10 border-destructive/20')}>
                      <IndianRupee className={cn('w-4 h-4 mx-auto mb-1', netBenefit >= 0 ? 'text-secondary' : 'text-destructive')} />
                      <p className={cn('font-display font-bold text-lg', netBenefit >= 0 ? 'text-secondary' : 'text-destructive')}>{netBenefit >= 0 ? '+' : ''}₹{netBenefit.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('earnings.netBenefit')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ROI Insight */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className={cn('shadow-card border-l-4', roi >= 0 ? 'border-l-secondary' : 'border-l-accent')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', roi >= 0 ? 'bg-secondary/10' : 'bg-accent/10')}>
                      <TrendingUp className={cn('w-5 h-5', roi >= 0 ? 'text-secondary' : 'text-accent')} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t('earnings.roi')}</p>
                      {approvedClaims.length > 0 ? (
                        <p className="text-sm text-foreground/80">
                          {netBenefit > 0 ? t('earnings.roiPositive', { premiums: totalPremiumsPaid, claims: totalClaimAmount.toLocaleString('en-IN'), gain: netBenefit.toLocaleString('en-IN'), multiplier: (totalClaimAmount / Math.max(totalPremiumsPaid, 1)).toFixed(1) }) : t('earnings.roiNeutral')}
                        </p>
                      ) : (
                        <p className="text-sm text-foreground/80">{t('earnings.noClaims')}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Claims by Disruption Type */}
            {pieData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-display">{t('earnings.byDisruption')}</CardTitle>
                    <CardDescription className="text-xs">{t('earnings.whatAffected')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={160}>
                        <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">{pieData.map((_, i) => (<Cell key={i} fill={pieColors[i % pieColors.length]} />))}</Pie></PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 flex-1">
                        {pieData.map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pieColors[i % pieColors.length] }} /><span className="text-muted-foreground">{d.icon} {d.name}</span></div>
                            <span className="font-medium">₹{d.value.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Weekly Trend */}
            {weeklyData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-display">{t('earnings.incomeLostVsCovered')}</CardTitle>
                    <CardDescription className="text-xs">{t('earnings.weeklyComparison')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={weeklyData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 10 }} width={40} className="text-muted-foreground" />
                        <Tooltip content={({ active, payload, label }) => { if (!active || !payload?.length) return null; return (<div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs"><p className="font-medium mb-1">{label}</p><p className="text-destructive">{t('earnings.incomeLost')}: ₹{payload[0]?.value?.toLocaleString('en-IN')}</p><p className="text-secondary">{t('earnings.gigshieldCovered')}: ₹{payload[1]?.value?.toLocaleString('en-IN')}</p></div>); }} />
                        <Bar dataKey="lost" name={t('earnings.incomeLost')} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.4} />
                        <Bar dataKey="claimed" name={t('earnings.gigshieldCovered')} fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive/40" />{t('earnings.incomeLost')}</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-secondary" />{t('earnings.gigshieldCovered')}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Individual Claim Breakdown */}
            {approvedClaims.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card className="shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-display">{t('earnings.claimBreakdown')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {approvedClaims.map((claim) => {
                      const severity = claim.incident?.severity || 70;
                      const hoursLost = Math.max(2, Math.round(severity / 15));
                      const tierMult = TIER_MULTIPLIER[policy?.tier || 'STANDARD'] || 1.0;
                      const estLoss = hoursLost * HOURLY_RATE * tierMult;
                      const covered = Number(claim.amount);
                      const coverPct = Math.round((covered / estLoss) * 100);
                      const tInfo = triggerLabels[claim.trigger_type] || { label: claim.trigger_type, icon: '⚠️' };
                      return (
                        <div key={claim.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{tInfo.icon}</span>
                              <div>
                                <p className="text-xs font-medium">{tInfo.label}</p>
                                <p className="text-[10px] text-muted-foreground">{new Date(claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {hoursLost}hrs lost · Severity {severity}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-secondary">₹{covered.toLocaleString('en-IN')}</p>
                              <p className="text-[10px] text-muted-foreground">of ₹{estLoss.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2"><Progress value={Math.min(coverPct, 100)} className="h-1.5 flex-1" /><span className="text-[10px] font-medium text-muted-foreground">{coverPct}%</span></div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Empty state */}
            {claims.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="shadow-card">
                  <CardContent className="p-8 text-center">
                    <Shield className="w-12 h-12 text-primary/20 mx-auto mb-3" />
                    <p className="font-display font-bold text-lg mb-1">{t('earnings.noClaimsTitle')}</p>
                    <p className="text-sm text-muted-foreground">{t('earnings.noClaimsDesc')}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
