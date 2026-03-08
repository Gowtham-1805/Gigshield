import { motion } from 'framer-motion';
import { Shield, ChevronRight, TrendingUp, CloudRain, AlertTriangle, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShieldScoreStepProps {
  onNext: () => void;
}

const factors = [
  {
    icon: CloudRain,
    title: 'Zone Weather Risk',
    desc: 'Zones with frequent rain or extreme heat contribute to your score.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: TrendingUp,
    title: 'Claim History',
    desc: 'Fewer fraudulent claims keep your score high and premiums low.',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    icon: AlertTriangle,
    title: 'Seasonal Factors',
    desc: 'Monsoon and summer seasons dynamically adjust your protection.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: Award,
    title: 'Loyalty Bonus',
    desc: 'Renewing your policy weekly builds trust and improves your score.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
];

export function ShieldScoreStep({ onNext }: ShieldScoreStepProps) {
  return (
    <div className="space-y-5">
      {/* Animated gauge preview */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative w-28 h-28 rounded-full gradient-shield flex items-center justify-center mb-3"
        >
          <div className="absolute inset-1 rounded-full bg-card flex items-center justify-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="font-display text-3xl font-bold text-primary"
            >
              50
            </motion.span>
          </div>
        </motion.div>
        <p className="text-sm text-muted-foreground text-center">
          You start at <span className="font-semibold text-foreground">50</span> — improve it by staying active!
        </p>
      </div>

      {/* Factor cards */}
      <div className="space-y-2.5">
        {factors.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
          >
            <div className={`p-2 rounded-lg ${f.bg} shrink-0`}>
              <f.icon className={`w-4 h-4 ${f.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="w-full gradient-shield text-primary-foreground border-0 h-11"
      >
        Got it! Choose my plan <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
