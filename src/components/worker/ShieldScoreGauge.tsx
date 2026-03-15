import { motion } from 'framer-motion';

interface ShieldScoreGaugeProps {
  score: number;
  size?: number;
}

export function ShieldScoreGauge({ score, size = 120 }: ShieldScoreGaugeProps) {
  const radius = (size - 16) / 2;
  const circumference = Math.PI * radius; // half circle
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? 'hsl(var(--safety-green))' : score >= 40 ? 'hsl(var(--alert-amber))' : 'hsl(var(--alert-red))';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        {/* Background arc */}
        <path
          d={`M 8 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2 + 4}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.path
          d={`M 8 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2 + 4}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <motion.span
        className="text-2xl font-display font-bold -mt-8"
        style={{ color }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {score}
      </motion.span>
    </div>
  );
}
