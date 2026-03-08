import { useAuth } from '@/lib/auth-context';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import TransparencyLedger from '@/components/TransparencyLedger';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';

export default function LedgerPage() {
  const { worker } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <Link to="/worker">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="w-8 h-8 rounded-xl gradient-shield flex items-center justify-center shadow-glow-blue">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">Payout Ledger</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <TransparencyLedger workerId={worker?.id} />
      </main>
    </div>
  );
}
