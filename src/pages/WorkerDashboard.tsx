import { motion } from 'framer-motion';
import { Shield, Home, FileText, User, Bell, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldScoreGauge } from '@/components/ShieldScoreGauge';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/language-context';
import { mockWorker, triggerTypes } from '@/lib/mock-data';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const statusColors = {
  approved: 'bg-secondary/10 text-secondary border-secondary/20',
  processing: 'bg-accent/10 text-accent border-accent/20',
  flagged: 'bg-destructive/10 text-destructive border-destructive/20',
};
const statusIcons = { approved: '✅', processing: '🔄', flagged: '🚩' };

export default function WorkerDashboard() {
  const { t } = useLanguage();
  const [mobileNav, setMobileNav] = useState(false);
  const worker = mockWorker;

  const navItems = [
    { icon: Home, label: t('home'), active: true },
    { icon: FileText, label: t('claims') },
    { icon: Bell, label: t('alerts') },
    { icon: User, label: t('profile') },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-shield flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">GigShield</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNav(!mobileNav)}>
              {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted-foreground text-sm">{t('welcomeBack')},</p>
          <h1 className="font-display text-2xl font-bold">{worker.name} 👋</h1>
        </motion.div>

        {/* Active Plan Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="gradient-shield text-primary-foreground overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary-foreground/5 -translate-y-8 translate-x-8" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs opacity-80">{t('activePlan')}</p>
                  <p className="font-display font-bold text-lg">{worker.activePlan.tier}</p>
                </div>
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                  {t('coverageActive')} ✅
                </Badge>
              </div>
              <p className="text-xs opacity-70">
                {t('validUntil')}: {worker.activePlan.startDate} → {worker.activePlan.endDate}
              </p>
              <div className="flex gap-4 mt-4">
                <div className="bg-primary-foreground/10 rounded-lg p-3 flex-1 text-center">
                  <p className="font-display font-bold text-xl">₹{worker.claimedThisWeek.toLocaleString()}</p>
                  <p className="text-[10px] opacity-70">{t('claimedThisWeek')}</p>
                </div>
                <div className="bg-primary-foreground/10 rounded-lg p-3 flex-1 text-center">
                  <p className="font-display font-bold text-xl">₹{worker.activePlan.maxPayout.toLocaleString()}</p>
                  <p className="text-[10px] opacity-70">{t('maxCoverage')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Shield Score */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">{t('shieldScore')}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <ShieldScoreGauge score={worker.shieldScore} />
              <div className="text-right text-sm text-muted-foreground space-y-1">
                <p>Zone: {worker.zoneName}</p>
                <p>Platform: {worker.platform}</p>
                <p>Avg ₹{worker.weeklyEarnings}/week</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weather Alert */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-accent/30 bg-accent/5 shadow-card">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-xl">
                ⚠️
              </div>
              <div>
                <p className="font-display font-semibold text-sm">{t('weatherAlert')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Heavy rain expected Thursday in your zone. Your coverage will auto-apply.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">{t('recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {worker.claims.slice(0, 4).map((claim) => {
                const trigger = triggerTypes.find(tt => tt.id === claim.type);
                return (
                  <div key={claim.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{statusIcons[claim.status]}</span>
                      <div>
                        <p className="text-sm font-medium">₹{claim.amount} {trigger?.icon} {trigger?.label}</p>
                        <p className="text-xs text-muted-foreground">{claim.date}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${statusColors[claim.status]}`}>
                      {t(claim.status as any)}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="gradient-shield text-primary-foreground border-0 h-12">
            {t('renewPlan')} — ₹{worker.activePlan.premium}/wk
          </Button>
          <Button variant="outline" className="h-12">
            {t('claimHistory')}
          </Button>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs ${item.active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
