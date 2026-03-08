import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

const steps = ['account', 'platform', 'zone', 'plan'] as const;
type Step = typeof steps[number];

const platforms = [
  { id: 'Zomato', label: 'Zomato', icon: '🍕' },
  { id: 'Swiggy', label: 'Swiggy', icon: '🛵' },
  { id: 'Zepto', label: 'Zepto', icon: '⚡' },
  { id: 'Blinkit', label: 'Blinkit', icon: '🟡' },
  { id: 'Amazon', label: 'Amazon', icon: '📦' },
  { id: 'Flipkart', label: 'Flipkart', icon: '🛒' },
  { id: 'Dunzo', label: 'Dunzo', icon: '🏃' },
  { id: 'Other', label: 'Other', icon: '📋' },
];

const defaultPlanOptions = [
  { tier: 'BASIC' as const, price: '₹29–49', premium: 39, payout: 1500, desc: 'Weather only' },
  { tier: 'STANDARD' as const, price: '₹49–79', premium: 64, payout: 2500, desc: 'Weather + AQI', recommended: true },
  { tier: 'PRO' as const, price: '₹79–129', premium: 99, payout: 4000, desc: 'Full coverage' },
];

export default function SignupPage() {
  const [step, setStep] = useState<Step>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('STANDARD');
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<Tables<'zones'>[]>([]);
  const [aiPremiums, setAiPremiums] = useState<{ tier: string; premium: number; price: string; payout: number; desc: string; recommended?: boolean }[] | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<{ recommended_tier: string; reason: string; savings_tip: string } | null>(null);
  const [loadingPremiums, setLoadingPremiums] = useState(false);
  const navigate = useNavigate();

  const stepIndex = steps.indexOf(step);

  useEffect(() => {
    supabase.from('zones').select('*').order('city').then(({ data }) => setZones(data || []));
  }, []);

  // Fetch AI premiums when zone is selected and we move to plan step
  useEffect(() => {
    if (step !== 'plan' || !zoneId) return;
    
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
          { tier: 'BASIC', premium: premiumData.BASIC, price: `₹${premiumData.BASIC}`, payout: 1500, desc: 'Weather only' },
          { tier: 'STANDARD', premium: premiumData.STANDARD, price: `₹${premiumData.STANDARD}`, payout: 2500, desc: 'Weather + AQI' },
          { tier: 'PRO', premium: premiumData.PRO, price: `₹${premiumData.PRO}`, payout: 4000, desc: 'Full coverage' },
        ];

        if (data.recommendation) {
          setAiRecommendation(data.recommendation);
          plans.forEach(p => {
            if (p.tier === data.recommendation.recommended_tier) {
              (p as any).recommended = true;
            }
          });
          setSelectedPlan(data.recommendation.recommended_tier);
        }

        setAiPremiums(plans);
      } catch (e) {
        console.error('AI premium error:', e);
        // Fallback to defaults
      }
      setLoadingPremiums(false);
    };

    fetchAIPremiums();
  }, [step, zoneId]);

  const planOptions = aiPremiums || defaultPlanOptions;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Complete your profile.');
      setStep('platform');
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const zone = zones.find(z => z.id === zoneId);
      const plan = planOptions.find(p => p.tier === selectedPlan) || planOptions[1];

      // Update worker profile
      await supabase.from('workers').update({
        name,
        platform,
        city: zone?.city || 'Mumbai',
        zone_id: zoneId || null,
      }).eq('user_id', user.id);

      // Get worker id
      const { data: workerData } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!workerData) throw new Error('Worker profile not found');

      // Create policy
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 86400000);

      await supabase.from('policies').insert({
        worker_id: workerData.id,
        tier: plan.tier as any,
        premium: plan.premium,
        max_payout: plan.payout,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
      });

      toast.success("You're protected! Welcome to GigShield. 🛡️");
      navigate('/worker');
    } catch (e: any) {
      toast.error(e.message || 'Setup failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-80 h-80 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center gap-2 mb-8 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl gradient-shield flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">
              {step === 'account' && 'Create Account'}
              {step === 'platform' && 'Your Platform'}
              {step === 'zone' && 'Your Zone'}
              {step === 'plan' && 'Choose Your Shield'}
            </CardTitle>
            <CardDescription>
              {step === 'account' && 'Start protecting your income in 90 seconds'}
              {step === 'platform' && 'Which delivery platform do you work on?'}
              {step === 'zone' && 'Select your primary delivery zone'}
              {step === 'plan' && 'Pick the coverage that fits your needs'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'account' && (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full gradient-shield text-primary-foreground border-0 h-11" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Account'} <ChevronRight className="w-4 h-4" />
                </Button>
              </form>
            )}

            {step === 'platform' && (
              <div className="space-y-3">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPlatform(p.id); setStep('zone'); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:border-primary ${
                      platform === p.id ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="font-medium">{p.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {step === 'zone' && (
              <div className="space-y-4">
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger><SelectValue placeholder="Select your zone" /></SelectTrigger>
                  <SelectContent>
                    {zones.map(z => (
                      <SelectItem key={z.id} value={z.id}>{z.name} ({z.city})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setStep('plan')}
                  disabled={!zoneId}
                  className="w-full gradient-shield text-primary-foreground border-0 h-11"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {step === 'plan' && (
              <div className="space-y-3">
                {/* AI Recommendation Banner */}
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
                    {(p as any).recommended && (
                      <span className="absolute -top-2.5 right-3 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        {aiPremiums ? <><Sparkles className="w-3 h-3" /> AI Recommended</> : 'Recommended'}
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
                  onClick={handleFinish}
                  disabled={loading}
                  className="w-full gradient-shield text-primary-foreground border-0 h-12 text-lg mt-4"
                >
                  {loading ? 'Setting up...' : '🛡️ Get Protected Now'}
                </Button>
              </div>
            )}

            {step === 'account' && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
