import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Shield, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/lib/auth-context';

import { AccountStep } from '@/components/onboarding/AccountStep';
import { PlatformStep } from '@/components/onboarding/PlatformStep';
import { ZoneStep } from '@/components/onboarding/ZoneStep';
import { ShieldScoreStep } from '@/components/onboarding/ShieldScoreStep';
import { PlanStep } from '@/components/onboarding/PlanStep';

const steps = ['account', 'platform', 'zone', 'shield', 'plan'] as const;
type Step = typeof steps[number];

export default function SignupPage() {
  const { t } = useTranslation();
  const { user, worker, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('STANDARD');
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<Tables<'zones'>[]>([]);
  const navigate = useNavigate();

  const stepMeta: Record<Step, { title: string; desc: string }> = {
    account: { title: t('signup.createAccount'), desc: t('signup.createAccountDesc') },
    platform: { title: t('signup.yourPlatform'), desc: t('signup.platformDesc') },
    zone: { title: t('signup.yourZone'), desc: t('signup.zoneDesc') },
    shield: { title: t('signup.shieldScore'), desc: t('signup.shieldScoreDesc') },
    plan: { title: t('signup.choosePlan'), desc: t('signup.choosePlanDesc') },
  };

  useEffect(() => {
    if (!authLoading && user && worker?.zone_id) {
      navigate('/worker', { replace: true });
    }
  }, [authLoading, user, worker, navigate]);

  useEffect(() => {
    if (!authLoading && user && step === 'account') {
      setName(worker?.name || user.user_metadata?.name || '');
      setStep('platform');
    }
  }, [authLoading, user]);

  const stepIndex = steps.indexOf(step);

  useEffect(() => {
    supabase.from('zones').select('*').order('city').then(({ data }) => setZones(data || []));
  }, []);

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const zone = zones.find(z => z.id === zoneId);

      await supabase.from('workers').update({
        name,
        platform,
        city: zone?.city || 'Mumbai',
        zone_id: zoneId || null,
      }).eq('user_id', user.id);

      const { data: workerData } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!workerData) throw new Error('Worker profile not found');

      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 86400000);

      const defaultPlans: Record<string, { premium: number; payout: number }> = {
        BASIC: { premium: 39, payout: 1500 },
        STANDARD: { premium: 64, payout: 2500 },
        PRO: { premium: 99, payout: 4000 },
      };
      const plan = defaultPlans[selectedPlan] || defaultPlans.STANDARD;

      await supabase.from('policies').insert({
        worker_id: workerData.id,
        tier: selectedPlan as any,
        premium: plan.premium,
        max_payout: plan.payout,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
      });

      toast.success(t('signup.protectedWelcome'));
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
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </Link>
          {stepIndex > 0 && (
            <button
              onClick={() => setStep(steps[stepIndex - 1])}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('signup.previousStep')}
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6">{t('signup.step', { current: stepIndex + 1, total: steps.length })}</p>

        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl gradient-shield flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">{stepMeta[step].title}</CardTitle>
            <CardDescription>{stepMeta[step].desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
              {step === 'account' && (
                <AccountStep
                  name={name} setName={setName}
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                  onNext={() => setStep('platform')}
                />
              )}
              {step === 'platform' && (
                <PlatformStep
                  platform={platform}
                  onSelect={(p) => { setPlatform(p); setStep('zone'); }}
                />
              )}
              {step === 'zone' && (
                <ZoneStep
                  zones={zones} zoneId={zoneId} setZoneId={setZoneId}
                  onNext={() => setStep('shield')}
                />
              )}
              {step === 'shield' && (
                <ShieldScoreStep onNext={() => setStep('plan')} />
              )}
              {step === 'plan' && (
                <PlanStep
                  zoneId={zoneId}
                  selectedPlan={selectedPlan}
                  setSelectedPlan={setSelectedPlan}
                  onFinish={handleFinish}
                  loading={loading}
                />
              )}
            </motion.div>

            {step === 'account' && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                {t('signup.alreadyHaveAccount')}{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">{t('common.login')}</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
