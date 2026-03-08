import { ChevronRight } from 'lucide-react';

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

interface PlatformStepProps {
  platform: string;
  onSelect: (platform: string) => void;
}

export function PlatformStep({ platform, onSelect }: PlatformStepProps) {
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
          <span className="font-medium">{p.label}</span>
          <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
