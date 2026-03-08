import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, CreditCard, MapPin, Smartphone, Save, Loader2, TrendingUp, ChevronRight, CheckCircle2, ArrowRight, IndianRupee, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendMockWhatsAppPremiumPaid, sendMockWhatsAppPlanChanged } from '@/lib/whatsapp-mock';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type PlanTier = { tier: string; premium: number; payout: number; desc: string };

const PLANS: PlanTier[] = [
  { tier: 'BASIC', premium: 39, payout: 1500, desc: 'Weather only' },
  { tier: 'STANDARD', premium: 64, payout: 2500, desc: 'Weather + AQI' },
  { tier: 'PRO', premium: 99, payout: 4000, desc: 'Full coverage' },
];

type PayStage = 'idle' | 'initiating' | 'verifying' | 'processing' | 'completed';

export default function ProfilePage() {
  const { worker, user } = useAuth();
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [policy, setPolicy] = useState<Tables<'policies'> | null>(null);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [payStage, setPayStage] = useState<PayStage>('idle');
  const [txnId, setTxnId] = useState('');
  const [changingPlan, setChangingPlan] = useState(false);

  useEffect(() => {
    if (!worker) return;
    setPhone(worker.phone || '');
    
    supabase.from('policies')
      .select('*')
      .eq('worker_id', worker.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPolicy(data));
  }, [worker]);

  const handleSave = async () => {
    if (!worker) return;
    setSaving(true);
    const { error } = await supabase.from('workers').update({ phone }).eq('id', worker.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Profile updated!');
  };

  const daysLeft = policy ? Math.max(0, Math.ceil((new Date(policy.end_date).getTime() - Date.now()) / 86400000)) : 0;

  const startChangePlan = (tier: string) => {
    const plan = PLANS.find(p => p.tier === tier);
    if (!plan || !policy) return;
    setSelectedTier(tier);
    setTxnId(`GS${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    setPayStage('initiating');
    setTimeout(() => setPayStage('verifying'), 1000);
    setTimeout(() => setPayStage('processing'), 2200);
    setTimeout(() => setPayStage('completed'), 3500);
  };

  const handleChangePlanAfterPay = async () => {
    if (!policy || !selectedTier) return;
    setPayStage('idle');
    setChangingPlan(true);
    const plan = PLANS.find(p => p.tier === selectedTier)!;
    try {
      const { data, error } = await supabase.functions.invoke('renew-policy', {
        body: { policy_id: policy.id, tier: selectedTier, premium: plan.premium, max_payout: plan.payout },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`🛡️ Switched to ${selectedTier} plan!`);
      if (data.new_policy) setPolicy(data.new_policy);
      setShowChangePlan(false);
      setSelectedTier(null);
    } catch (e: any) {
      toast.error(e.message || 'Plan change failed');
    }
    setChangingPlan(false);
  };

  const startRenew = () => {
    if (!policy) return;
    setSelectedTier(null);
    setTxnId(`GS${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    setPayStage('initiating');
    setTimeout(() => setPayStage('verifying'), 1000);
    setTimeout(() => setPayStage('processing'), 2200);
    setTimeout(() => setPayStage('completed'), 3500);
  };

  const handleRenewAfterPay = async () => {
    if (!policy) return;
    setPayStage('idle');
    setRenewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('renew-policy', { body: { policy_id: policy.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('🛡️ Policy renewed!');
      if (data.new_policy) setPolicy(data.new_policy);
    } catch (e: any) {
      toast.error(e.message || 'Renewal failed');
    }
    setRenewing(false);
  };

  const activePlan = PLANS.find(p => p.tier === selectedTier) || PLANS.find(p => p.tier === policy?.tier);
  const payAmount = activePlan?.premium || Number(policy?.premium || 0);
  const payLabel = selectedTier ? `${selectedTier} Plan` : 'Renewal';

  const stageConfig: Record<PayStage, { icon: string; label: string; color: string }> = {
    idle: { icon: '', label: '', color: '' },
    initiating: { icon: '🔐', label: 'Initiating UPI payment...', color: 'text-primary' },
    verifying: { icon: '🔍', label: 'Verifying details...', color: 'text-accent' },
    processing: { icon: '💸', label: `Processing ₹${payAmount} via UPI...`, color: 'text-secondary' },
    completed: { icon: '✅', label: 'Payment Successful!', color: 'text-secondary' },
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center h-14 px-4 gap-3">
          <Link to="/worker"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
          <h1 className="font-display font-bold">My Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-card overflow-hidden">
            <div className="h-20 gradient-shield" />
            <CardContent className="p-5 -mt-10">
              <div className="w-16 h-16 rounded-full bg-card border-4 border-card flex items-center justify-center text-2xl font-display font-bold shadow-elevated">
                {worker?.name?.charAt(0) || '?'}
              </div>
              <h2 className="font-display text-xl font-bold mt-3">{worker?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline">{worker?.platform}</Badge>
                <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{worker?.city}</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Policy */}
        {policy && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-card border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Active Policy
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary hover:text-primary"
                    onClick={() => setShowChangePlan(!showChangePlan)}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {showChangePlan ? 'Hide Plans' : 'Change Plan'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{policy.tier}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Premium</span>
                  <span className="font-medium">₹{Number(policy.premium)}/week</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Payout</span>
                  <span className="font-medium">₹{Number(policy.max_payout).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Days Left</span>
                  <span className={`font-medium ${daysLeft <= 2 ? 'text-destructive' : 'text-secondary'}`}>{daysLeft} days</span>
                </div>

                {/* Change Plan Options */}
                <AnimatePresence>
                  {showChangePlan && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pt-2 border-t border-border/50"
                    >
                      <p className="text-xs text-muted-foreground">Switch to a different plan (takes effect immediately):</p>
                      {PLANS.map(plan => {
                        const isCurrent = plan.tier === policy.tier;
                        return (
                          <button
                            key={plan.tier}
                            disabled={isCurrent || changingPlan}
                            onClick={() => startChangePlan(plan.tier)}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                              isCurrent
                                ? 'border-primary/30 bg-primary/5 opacity-70'
                                : 'border-border hover:border-primary/50 hover:bg-primary/5'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-display font-bold text-sm">{plan.tier}</p>
                                  {isCurrent && <Badge variant="outline" className="text-[10px] py-0">Current</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground">{plan.desc}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-display font-bold text-sm text-primary">₹{plan.premium}/wk</p>
                                <p className="text-[10px] text-muted-foreground">max ₹{plan.payout.toLocaleString()}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Renew Button */}
                <Button 
                  className="w-full gradient-shield text-primary-foreground border-0 mt-2"
                  disabled={renewing || payStage !== 'idle'}
                  onClick={startRenew}
                >
                  {renewing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Renewing...</> : `Renew Now — ₹${Number(policy.premium)}/week`}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Edit Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Edit Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> UPI ID (for payouts)</Label>
                <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@upi" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Shield Score */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Shield Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Claims History', score: 85, desc: 'Low fraud risk' },
                { label: 'Zone Risk', score: 65, desc: 'Medium risk zone' },
                { label: 'Activity Level', score: 70, desc: 'Regular platform usage' },
                { label: 'Payment History', score: 90, desc: 'On-time premiums' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">{item.score}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.score >= 80 ? 'bg-secondary' : item.score >= 50 ? 'bg-accent' : 'bg-destructive'}`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Earnings Impact Report Link */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Link to="/earnings">
            <Card className="shadow-card border-secondary/20 hover:border-secondary/40 transition-colors cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-sm">Earnings Impact Report</h3>
                  <p className="text-xs text-muted-foreground">See how much GigShield saved you</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </main>

      {/* Demo Payment Overlay */}
      <AnimatePresence>
        {payStage !== 'idle' && (
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
                      <p className="text-white/70 text-xs">GigShield {selectedTier ? 'Plan Change' : 'Renewal'}</p>
                      <p className="text-white font-bold text-sm">UPI • {payLabel}</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 space-y-6">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                    <p className="text-muted-foreground text-sm mb-1">{selectedTier ? 'New Plan Premium' : 'Renewal Premium'}</p>
                    <span className="text-4xl font-display font-bold">₹{payAmount}</span>
                    <p className="text-xs text-muted-foreground mt-1">Weekly • {activePlan?.desc}</p>
                  </motion.div>

                  <div className="flex items-center justify-center gap-3 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-secondary" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">Your UPI</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center relative">
                      <div className="h-0.5 w-full bg-border absolute" />
                      <motion.div
                        initial={{ x: -30 }}
                        animate={{ x: payStage === 'completed' ? 30 : [-30, 30] }}
                        transition={payStage === 'completed' ? { duration: 0 } : { duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                        className="relative z-10 w-6 h-6 rounded-full bg-secondary flex items-center justify-center shadow-md"
                      >
                        {payStage === 'completed' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <ArrowRight className="w-3 h-3 text-white" />}
                      </motion.div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg">🛡️</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">GigShield</span>
                    </div>
                  </div>

                  <motion.div key={payStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <div className={`flex items-center justify-center gap-2 ${stageConfig[payStage].color}`}>
                      {payStage !== 'completed' && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span className="text-lg">{stageConfig[payStage].icon}</span>
                      <span className="font-medium text-sm">{stageConfig[payStage].label}</span>
                    </div>
                  </motion.div>

                  <div className="flex items-center justify-center gap-2">
                    {(['initiating', 'verifying', 'processing', 'completed'] as PayStage[]).map((s) => {
                      const stages: PayStage[] = ['initiating', 'verifying', 'processing', 'completed'];
                      const isComplete = stages.indexOf(s) <= stages.indexOf(payStage);
                      return <motion.div key={s} initial={{ scale: 0.5 }} animate={{ scale: isComplete ? 1 : 0.8 }} className={`w-2 h-2 rounded-full transition-colors ${isComplete ? 'bg-secondary' : 'bg-muted'}`} />;
                    })}
                  </div>

                  <AnimatePresence>
                    {payStage === 'completed' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                        <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Plan</span>
                            <span className="font-medium">{selectedTier || policy?.tier}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium">₹{payAmount}/week</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Transaction ID</span>
                            <span className="font-medium font-mono text-xs">{txnId}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm pt-2 border-t border-secondary/20">
                            <span className="text-muted-foreground">Status</span>
                            <Badge className="bg-secondary/10 text-secondary border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>
                          </div>
                        </div>
                        <Button
                          onClick={selectedTier ? handleChangePlanAfterPay : handleRenewAfterPay}
                          disabled={changingPlan || renewing}
                          className="w-full gradient-shield text-primary-foreground border-0"
                        >
                          {(changingPlan || renewing) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          🛡️ {selectedTier ? `Activate ${selectedTier} Plan` : 'Activate Renewal'}
                        </Button>
                        <p className="text-center text-[10px] text-muted-foreground">Simulated payment • Demo mode</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
