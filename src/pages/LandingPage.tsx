import { motion } from 'framer-motion';
import { Shield, CloudRain, Thermometer, Wind, Zap, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/language-context';
import { Link } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const plans = [
  {
    tier: 'basic' as const,
    price: '29–49',
    maxPayout: '₹1,500',
    features: ['Heavy rainfall coverage', 'Auto-claim processing', 'UPI payouts < 10 min'],
    excluded: ['AQI protection', 'Social disruption cover', 'Priority support'],
  },
  {
    tier: 'standard' as const,
    price: '49–79',
    maxPayout: '₹2,500',
    popular: true,
    features: ['Heavy rainfall coverage', 'Extreme weather alerts', 'AQI protection', 'Auto-claim processing', 'UPI payouts < 10 min'],
    excluded: ['Social disruption cover'],
  },
  {
    tier: 'pro' as const,
    price: '79–129',
    maxPayout: '₹4,000',
    features: ['All weather coverage', 'AQI protection', 'Curfew & bandh cover', 'Cyclone coverage', 'Priority support', 'UPI payouts < 5 min'],
    excluded: [],
  },
];

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-shield flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">GigShield</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">{t('login')}</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gradient-shield text-primary-foreground border-0 hover:opacity-90">
                {t('signup')}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* BG orbs */}
        <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />

        <div className="container mx-auto text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm">
              🛡️ AI-Powered Parametric Insurance
            </Badge>
          </motion.div>

          <motion.h1
            className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 max-w-4xl mx-auto"
            variants={fadeUp} custom={1} initial="hidden" animate="visible"
          >
            <span className="text-gradient-shield">{t('heroTagline')}</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            variants={fadeUp} custom={2} initial="hidden" animate="visible"
          >
            {t('heroSubtitle')}
          </motion.p>

          <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4" variants={fadeUp} custom={3} initial="hidden" animate="visible">
            <Link to="/signup">
              <Button size="lg" className="gradient-shield text-primary-foreground border-0 text-lg px-8 h-14 hover:opacity-90 animate-pulse-shield">
                {t('getProtected')} <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                {t('viewPlans')}
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.h2
            className="font-display text-3xl md:text-4xl font-bold text-center mb-16"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            {t('howItWorks')}
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: CloudRain, title: t('step1Title'), desc: t('step1Desc'), color: 'bg-primary/10 text-primary' },
              { icon: Zap, title: t('step2Title'), desc: t('step2Desc'), color: 'bg-accent/10 text-accent' },
              { icon: Shield, title: t('step3Title'), desc: t('step3Desc'), color: 'bg-secondary/10 text-secondary' },
            ].map((step, i) => (
              <motion.div
                key={i}
                className="text-center"
                variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
              >
                <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mx-auto mb-6`}>
                  <step.icon className="w-8 h-8" />
                </div>
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-display font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div className="text-center mb-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{t('pricingTitle')}</h2>
            <p className="text-muted-foreground text-lg">{t('pricingSubtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.tier}
                variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
              >
                <Card className={`relative overflow-hidden h-full ${plan.popular ? 'border-primary shadow-elevated ring-2 ring-primary/20' : 'shadow-card'}`}>
                  {plan.popular && (
                    <div className="absolute top-0 right-0 gradient-shield text-primary-foreground text-xs font-bold px-4 py-1 rounded-bl-lg">
                      {t('popular')}
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <CardDescription className="uppercase tracking-wider text-xs font-semibold">
                      {t(`${plan.tier}Tier` as any)}
                    </CardDescription>
                    <CardTitle className="font-display text-3xl">
                      ₹{plan.price}
                      <span className="text-base font-normal text-muted-foreground">{t('perWeek')}</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('maxPayout')}: {plan.maxPayout}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-secondary shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                    {plan.excluded.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground/50 line-through">
                        <div className="w-4 h-4 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                    <Link to="/signup" className="block pt-4">
                      <Button className={`w-full ${plan.popular ? 'gradient-shield text-primary-foreground border-0' : ''}`} variant={plan.popular ? 'default' : 'outline'}>
                        {t('getProtected')}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-12">{t('trustTitle')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Zap, label: t('trustSpeed'), value: '< 10 min' },
              { icon: Shield, label: t('trustPaperwork'), value: '0 forms' },
              { icon: Thermometer, label: t('trustUpi'), value: 'UPI' },
              { icon: Wind, label: t('trustWorkers'), value: '10K+' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="text-center p-6 rounded-xl bg-card shadow-card"
                variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
              >
                <item.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="font-display font-bold text-xl text-primary mb-1">{item.value}</div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-shield flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">GigShield</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 GigShield. Protecting India's gig workforce.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
