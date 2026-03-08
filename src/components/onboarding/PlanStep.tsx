import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, CheckCircle2, ArrowRight, IndianRupee, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

type PlanOption = { tier: string; price: string; premium: number; payout: number; desc: string; recommended: boolean };

const defaultPlanOptions: PlanOption[] = [
  { tier: 'BASIC', price: '₹29–49', premium: 39, payout: 1500, desc: 'Weather only', recommended: false },
  { tier: 'STANDARD', price: '₹49–79', premium: 64, payout: 2500, desc: 'Weather + AQI', recommended: true },
  { tier: 'PRO', price: '₹79–129', premium: 99, payout: 4000, desc: 'Full coverage', recommended: false },
];

interface PlanStepProps {
  zoneId: string;
  selectedPlan: string;
  setSelectedPlan: (v: string) => void;
  onFinish: () => void;
  loading: boolean;
}

type PayStage = 'idle' | 'initiating' | 'verifying' | 'processing' | 'completed';

export function PlanStep({ zoneId, selectedPlan, setSelectedPlan, onFinish, loading }: PlanStepProps) {
  const [aiPremiums, setAiPremiums] = useState<PlanOption[] | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<{ recommended_tier: string; reason: string; savings_tip: string } | null>(null);
  const [loadingPremiums, setLoadingPremiums] = useState(false);
  const [payStage, setPayStage] = useState<PayStage>('idle');
  const [txnId, setTxnId] = useState('');

  useEffect(() => {
    if (!zoneId) return;

    const fetchAIPremiums = async () => {
      setLoadingPremiums(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: workerData } = await supabase
          .from('workers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!workerData) return;

        const { data, error } = await supabase.functions.invoke('calculate-premium', {
          body: { worker_id: workerData.id, zone_id: zoneId },
        });

        if (error || !data) throw error;

        const premiumData = data.premiums as Record<string, number>;
        const plans = [
          { tier: 'BASIC' as const, premium: premiumData.BASIC, price: `₹${premiumData.BASIC}`, payout: 1500, desc: 'Weather only', recommended: false },
          { tier: 'STANDARD' as const, premium: premiumData.STANDARD, price: `₹${premiumData.STANDARD}`, payout: 2500, desc: 'Weather + AQI', recommended: false },
          { tier: 'PRO' as const, premium: premiumData.PRO, price: `₹${premiumData.PRO}`, payout: 4000, desc: 'Full coverage', recommended: false },
        ];

        if (data.recommendation) {
          setAiRecommendation(data.recommendation);
          plans.forEach(p => {
            if (p.tier === data.recommendation.recommended_tier) {
              p.recommended = true;
            }
          });
          setSelectedPlan(data.recommendation.recommended_tier);
        }

        setAiPremiums(plans);
      } catch (e) {
        console.error('AI premium error:', e);
      }
      setLoadingPremiums(false);
    };

    fetchAIPremiums();
  }, [zoneId]);

  const planOptions = aiPremiums || defaultPlanOptions;
  const chosenPlan = planOptions.find(p => p.tier === selectedPlan) || planOptions[1];

  const handlePay = () => {
    setTxnId(`GS${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    setPayStage('initiating');

    setTimeout(() => setPayStage('verifying'), 1000);
    setTimeout(() => setPayStage('processing'), 2200);
    setTimeout(() => setPayStage('completed'), 3500);
  };

  const handlePayDone = () => {
    setPayStage('idle');
    onFinish();
  };

  const stageConfig: Record<PayStage, { icon: string; label: string; color: string }> = {
    idle: { icon: '', label: '', color: '' },
    initiating: { icon: '🔐', label: 'Initiating UPI payment...', color: 'text-primary' },
    verifying: { icon: '🔍', label: 'Verifying payment details...', color: 'text-accent' },
    processing: { icon: '💸', label: 'Processing ₹' + chosenPlan.premium + ' via UPI...', color: 'text-secondary' },
    completed: { icon: '✅', label: 'Payment Successful!', color: 'text-secondary' },
  };

  return (
    <div className="space-y-3">
      {loadingPremiums && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-primary">AI calculating your personalized premiums...</span>
        </div>
      )}
      {aiRecommendation && !loadingPremiums && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI Recommendation</span>
          </div>
          <p className="text-xs text-muted-foreground">{aiRecommendation.reason}</p>
          <p className="text-xs text-primary/70 mt-1">💡 {aiRecommendation.savings_tip}</p>
        </motion.div>
      )}

      {planOptions.map((p) => (
        <button
          key={p.tier}
          onClick={() => setSelectedPlan(p.tier)}
          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
            selectedPlan === p.tier ? 'border-primary bg-primary/5' : 'border-border'
          } relative`}
        >
          {p.recommended && (
            <span className="absolute -top-2.5 right-3 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              {aiPremiums ? <><Sparkles className="w-3 h-3" /> AI Pick</> : 'Recommended'}
            </span>
          )}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-display font-bold">{p.tier}</p>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-primary">{p.price}/wk</p>
              <p className="text-xs text-muted-foreground">max ₹{p.payout.toLocaleString()}/wk</p>
            </div>
          </div>
        </button>
      ))}

      <Button
        onClick={handlePay}
        disabled={loading || payStage !== 'idle'}
        className="w-full gradient-shield text-primary-foreground border-0 h-12 text-lg mt-4"
      >
        {loading ? 'Setting up...' : `💳 Pay ₹${chosenPlan.premium}/wk & Get Protected`}
      </Button>
      <p className="text-center text-[10px] text-muted-foreground">Demo mode • No real money charged</p>

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
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-primary/80 p-4 relative overflow-hidden">
                  <div className="absolute inset-0 pattern-grid opacity-10" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <IndianRupee className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">GigShield Premium Payment</p>
                        <p className="text-white font-bold text-sm">UPI • {chosenPlan.tier} Plan</p>
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Amount */}
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                    <p className="text-muted-foreground text-sm mb-1">Premium Amount</p>
                    <span className="text-4xl font-display font-bold">₹{chosenPlan.premium}</span>
                    <p className="text-xs text-muted-foreground mt-1">Weekly • {chosenPlan.desc}</p>
                  </motion.div>

                  {/* Transfer Animation */}
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
                        {payStage === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                          <ArrowRight className="w-3 h-3 text-white" />
                        )}
                      </motion.div>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg">🛡️</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">GigShield</span>
                    </div>
                  </div>

                  {/* Status */}
                  <motion.div key={payStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <div className={`flex items-center justify-center gap-2 ${stageConfig[payStage].color}`}>
                      {payStage !== 'completed' && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span className="text-lg">{stageConfig[payStage].icon}</span>
                      <span className="font-medium text-sm">{stageConfig[payStage].label}</span>
                    </div>
                  </motion.div>

                  {/* Progress Dots */}
                  <div className="flex items-center justify-center gap-2">
                    {(['initiating', 'verifying', 'processing', 'completed'] as PayStage[]).map((s) => {
                      const stages: PayStage[] = ['initiating', 'verifying', 'processing', 'completed'];
                      const isComplete = stages.indexOf(s) <= stages.indexOf(payStage);
                      return (
                        <motion.div
                          key={s}
                          initial={{ scale: 0.5 }}
                          animate={{ scale: isComplete ? 1 : 0.8 }}
                          className={`w-2 h-2 rounded-full transition-colors ${isComplete ? 'bg-secondary' : 'bg-muted'}`}
                        />
                      );
                    })}
                  </div>

                  {/* Completed Details */}
                  <AnimatePresence>
                    {payStage === 'completed' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Plan</span>
                            <span className="font-medium">{chosenPlan.tier} — {chosenPlan.desc}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium">₹{chosenPlan.premium}/week</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Max Payout</span>
                            <span className="font-medium">₹{chosenPlan.payout.toLocaleString()}/week</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Transaction ID</span>
                            <span className="font-medium font-mono text-xs">{txnId}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm pt-2 border-t border-secondary/20">
                            <span className="text-muted-foreground">Status</span>
                            <Badge className="bg-secondary/10 text-secondary border-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                            </Badge>
                          </div>
                        </div>

                        <Button
                          onClick={handlePayDone}
                          className="w-full gradient-shield text-primary-foreground border-0"
                        >
                          🛡️ Activate My Protection
                        </Button>

                        <p className="text-center text-[10px] text-muted-foreground">
                          Simulated payment • Demo mode — no real charge
                        </p>
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
