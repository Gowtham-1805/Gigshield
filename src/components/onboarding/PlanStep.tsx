import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export function PlanStep({ zoneId, selectedPlan, setSelectedPlan, onFinish, loading }: PlanStepProps) {
  const [aiPremiums, setAiPremiums] = useState<typeof defaultPlanOptions | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<{ recommended_tier: string; reason: string; savings_tip: string } | null>(null);
  const [loadingPremiums, setLoadingPremiums] = useState(false);

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
        onClick={onFinish}
        disabled={loading}
        className="w-full gradient-shield text-primary-foreground border-0 h-12 text-lg mt-4"
      >
        {loading ? 'Setting up...' : '🛡️ Get Protected Now'}
      </Button>
    </div>
  );
}
