import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const platforms = [
  { id: 'Zomato', key: 'zomato', icon: '🍕' },
  { id: 'Swiggy', key: 'swiggy', icon: '🛵' },
  { id: 'Zepto', key: 'zepto', icon: '⚡' },
  { id: 'Blinkit', key: 'blinkit', icon: '🟡' },
  { id: 'Amazon', key: 'amazon', icon: '📦' },
  { id: 'Flipkart', key: 'flipkart', icon: '🛒' },
  { id: 'Dunzo', key: 'dunzo', icon: '🏃' },
  { id: 'Other', key: 'other', icon: '📋' },
];

interface PlatformStepProps {
  platform: string;
  onSelect: (platform: string) => void;
}

export function PlatformStep({ platform, onSelect }: PlatformStepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {platforms.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:border-primary ${
            platform === p.id ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <span className="text-2xl">{p.icon}</span>
          <span className="font-medium">{t(`platform.${p.key}`)}</span>
          <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
