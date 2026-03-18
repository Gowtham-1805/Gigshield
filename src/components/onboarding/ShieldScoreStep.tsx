import { motion } from 'framer-motion';
import { Shield, ChevronRight, TrendingUp, CloudRain, AlertTriangle, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface ShieldScoreStepProps {
  onNext: () => void;
}

export function ShieldScoreStep({ onNext }: ShieldScoreStepProps) {
  const { t } = useTranslation();

  const factors = [
    { icon: CloudRain, title: t('shieldScoreOnboarding.zoneWeatherRisk'), desc: t('shieldScoreOnboarding.zoneWeatherDesc'), color: 'text-primary', bg: 'bg-primary/10' },
    { icon: TrendingUp, title: t('shieldScoreOnboarding.claimHistory'), desc: t('shieldScoreOnboarding.claimHistoryDesc'), color: 'text-secondary', bg: 'bg-secondary/10' },
    { icon: AlertTriangle, title: t('shieldScoreOnboarding.seasonalFactors'), desc: t('shieldScoreOnboarding.seasonalDesc'), color: 'text-accent', bg: 'bg-accent/10' },
    { icon: Award, title: t('shieldScoreOnboarding.loyaltyBonus'), desc: t('shieldScoreOnboarding.loyaltyDesc'), color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="relative w-28 h-28 rounded-full gradient-shield flex items-center justify-center mb-3">
          <div className="absolute inset-1 rounded-full bg-card flex items-center justify-center">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="font-display text-3xl font-bold text-primary">50</motion.span>
          </div>
        </motion.div>
        <p className="text-sm text-muted-foreground text-center">{t('shieldScoreOnboarding.startAt50', { defaultValue: 'You start at 50 — improve it by staying active!' })}</p>
      </div>
      <div className="space-y-2.5">
        {factors.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
            <div className={`p-2 rounded-lg ${f.bg} shrink-0`}><f.icon className={`w-4 h-4 ${f.color}`} /></div>
            <div><p className="text-sm font-medium">{f.title}</p><p className="text-xs text-muted-foreground">{f.desc}</p></div>
          </motion.div>
        ))}
      </div>
      <Button onClick={onNext} className="w-full gradient-shield text-primary-foreground border-0 h-11">
        {t('shieldScoreOnboarding.gotIt')} <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
