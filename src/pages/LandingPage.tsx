import { motion } from 'framer-motion';
import { Shield, CloudRain, Zap, ChevronRight, Check, ArrowRight, Sparkles, Activity, Umbrella, IndianRupee } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const { t } = useTranslation();

  const plans = [
    {
      tier: t('landing.basic'),
      price: '29–49',
      maxPayout: '₹1,500',
      features: [t('landing.heavyRainfall'), t('landing.autoClaimProcessing'), t('landing.upiPayouts10')],
      excluded: [t('landing.aqiProtection'), t('landing.socialDisruption'), t('landing.prioritySupport')],
    },
    {
      tier: t('landing.standard'),
      price: '49–79',
      maxPayout: '₹2,500',
      popular: true,
      features: [t('landing.heavyRainfall'), t('landing.extremeWeather'), t('landing.aqiProtection'), t('landing.autoClaimProcessing'), t('landing.upiPayouts10')],
      excluded: [t('landing.socialDisruption')],
    },
    {
      tier: t('landing.pro'),
      price: '79–129',
      maxPayout: '₹4,000',
      features: [t('landing.allWeather'), t('landing.aqiProtection'), t('landing.curfewCover'), t('landing.cycloneCoverage'), t('landing.prioritySupport'), t('landing.upiPayouts5')],
      excluded: [],
    },
  ];
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-shield flex items-center justify-center shadow-glow-blue">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">GigShield</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-medium">{t('common.login')}</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gradient-shield text-primary-foreground border-0 hover:opacity-90 shadow-glow-blue font-medium">
                {t('common.signup')}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — Dark immersive section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="gradient-hero min-h-[90vh] flex items-center relative">
          {/* Background effects */}
          <div className="absolute inset-0 pattern-grid opacity-30" />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-secondary/8 blur-[100px]" />

          {/* Floating shield icons */}
          <div className="absolute top-32 right-[15%] animate-float opacity-20">
            <Shield className="w-16 h-16 text-primary-foreground" />
          </div>
          <div className="absolute bottom-32 left-[10%] animate-float-delayed opacity-15">
            <Umbrella className="w-12 h-12 text-primary-foreground" />
          </div>

          <div className="container mx-auto px-4 relative z-10 py-20">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <Badge className="mb-8 bg-primary-foreground/10 text-primary-foreground/90 border-primary-foreground/20 px-5 py-2 text-sm font-medium backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('landing.aiPowered')}
                </Badge>
              </motion.div>

              <motion.h1
                className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8"
                variants={fadeUp} custom={1} initial="hidden" animate="visible"
              >
                <span className="text-gradient-hero">{t('landing.tagline')}</span>
                <br />
                <span className="text-gradient-shield">{t('landing.subtitle')}</span>
              </motion.h1>

              <motion.p
                className="text-lg md:text-xl text-primary-foreground/60 max-w-2xl mx-auto mb-12 leading-relaxed"
                variants={fadeUp} custom={2} initial="hidden" animate="visible"
              >
                {t('landing.description')}
              </motion.p>

              <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4" variants={fadeUp} custom={3} initial="hidden" animate="visible">
                <Link to="/signup">
                  <Button size="lg" className="gradient-shield text-primary-foreground border-0 text-lg px-10 h-14 hover:opacity-90 animate-pulse-shield shadow-glow-blue font-semibold">
                    {t('landing.getProtected')} <ArrowRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button size="lg" variant="ghost" className="text-lg px-8 h-14 border border-white/30 text-white hover:bg-white/10 hover:text-white">
                    {t('landing.viewPlans')}
                  </Button>
                </a>
              </motion.div>

              {/* Stats row */}
              <motion.div
                className="flex flex-wrap items-center justify-center gap-8 mt-16 pt-8 border-t border-primary-foreground/10"
                variants={fadeUp} custom={4} initial="hidden" animate="visible"
              >
                {[
                  { value: t('landing.tenKPlus'), label: t('landing.workersProtectedStat') },
                  { value: t('landing.lessThan10Min'), label: t('landing.avgPayoutTime') },
                  { value: '₹0', label: t('landing.paperworkRequired') },
                  { value: '24/7', label: t('landing.aiMonitoring') },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="font-display font-bold text-2xl text-primary-foreground">{stat.value}</p>
                    <p className="text-xs text-primary-foreground/40 mt-1">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 pattern-dots" />
        <div className="container mx-auto relative z-10">
          <motion.div className="text-center mb-20" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <Badge variant="outline" className="mb-4 text-primary border-primary/20">{t('landing.howItWorks')}</Badge>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              {t('landing.threeSteps').split('<1>')[0]}<span className="text-gradient-shield">{t('landing.threeSteps').replace(/<\/?1>/g, '').replace(t('landing.threeSteps').split('<1>')[0], '')}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t('landing.howItWorksSubtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: CloudRain, title: t('landing.step1Title'), desc: t('landing.step1Desc'), gradient: 'from-primary/10 to-primary/5', iconBg: 'bg-primary/10 text-primary', border: 'border-primary/10' },
              { icon: Activity, title: t('landing.step2Title'), desc: t('landing.step2Desc'), gradient: 'from-accent/10 to-accent/5', iconBg: 'bg-accent/10 text-accent', border: 'border-accent/10' },
              { icon: IndianRupee, title: t('landing.step3Title'), desc: t('landing.step3Desc'), gradient: 'from-secondary/10 to-secondary/5', iconBg: 'bg-secondary/10 text-secondary', border: 'border-secondary/10' },
            ].map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
              >
                <Card className={`relative overflow-hidden h-full shadow-card hover:shadow-elevated transition-all duration-300 border ${step.border} group`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-50`} />
                  <CardContent className="relative p-8 text-center">
                    <div className="absolute top-4 right-4 font-display font-bold text-6xl text-muted/80 select-none">
                      {i + 1}
                    </div>
                    <div className={`w-16 h-16 rounded-2xl ${step.iconBg} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <step.icon className="w-8 h-8" />
                    </div>
                    <h3 className="font-display text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-muted/30 relative">
        <div className="absolute inset-0 pattern-grid opacity-50" />
        <div className="container mx-auto relative z-10">
          <motion.div className="text-center mb-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <Badge variant="outline" className="mb-4 text-primary border-primary/20">{t('landing.pricing')}</Badge>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">{t('landing.chooseShield')}</h2>
            <p className="text-muted-foreground text-lg">{t('landing.pricingSubtitle')}</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.tier}
                variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
              >
                <Card className={`relative overflow-hidden h-full transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular 
                    ? 'border-primary shadow-elevated ring-2 ring-primary/20' 
                    : 'shadow-card hover:shadow-elevated'
                }`}>
                  {plan.popular && (
                    <div className="absolute top-0 inset-x-0 h-1 gradient-shield" />
                  )}
                  {plan.popular && (
                    <div className="absolute top-3 right-3">
                      <Badge className="gradient-shield text-primary-foreground border-0 shadow-glow-blue text-xs">
                        <Sparkles className="w-3 h-3 mr-1" /> Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-4 pt-6">
                    <CardDescription className="uppercase tracking-widest text-xs font-bold text-muted-foreground">
                      {plan.tier}
                    </CardDescription>
                    <CardTitle className="font-display text-4xl mt-2">
                      ₹{plan.price}
                      <span className="text-base font-normal text-muted-foreground">/week</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Max weekly payout: <span className="font-semibold text-foreground">{plan.maxPayout}</span>
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-8">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-secondary" />
                        </div>
                        <span>{f}</span>
                      </div>
                    ))}
                    {plan.excluded.map((f) => (
                      <div key={f} className="flex items-center gap-3 text-sm text-muted-foreground/40 line-through">
                        <div className="w-5 h-5 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                    <Link to="/signup" className="block pt-6">
                      <Button className={`w-full h-12 font-semibold ${
                        plan.popular 
                          ? 'gradient-shield text-primary-foreground border-0 shadow-glow-blue hover:opacity-90' 
                          : ''
                      }`} variant={plan.popular ? 'default' : 'outline'}>
                        Get Protected
                        <ChevronRight className="w-4 h-4 ml-1" />
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
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <motion.div className="text-center mb-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Why Workers Trust <span className="text-gradient-shield">GigShield</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Zap, label: 'Instant payouts', value: '< 10 min', color: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
              { icon: Shield, label: 'Zero paperwork', value: '0 forms', color: 'text-secondary', bg: 'bg-secondary/5 border-secondary/10' },
              { icon: IndianRupee, label: 'Direct UPI transfer', value: 'UPI', color: 'text-accent', bg: 'bg-accent/5 border-accent/10' },
              { icon: Activity, label: 'Workers protected', value: '10K+', color: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className={`text-center p-6 rounded-2xl border ${item.bg} hover:shadow-card transition-all duration-300`}
                variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
              >
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className={`font-display font-bold text-2xl ${item.color} mb-1`}>{item.value}</div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="gradient-hero rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <div className="absolute inset-0 pattern-grid opacity-20" />
            <div className="relative z-10 text-center">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to protect your income?
              </h2>
              <p className="text-primary-foreground/60 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of gig workers who never worry about lost earnings due to weather or disruptions.
              </p>
              <div className="flex justify-center">
                <Link to="/signup">
                  <Button size="lg" className="gradient-shield text-primary-foreground border-0 text-base md:text-lg px-6 md:px-10 h-12 md:h-14 hover:opacity-90 shadow-glow-blue font-semibold">
                    Start Now — ₹29/week <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg gradient-shield flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">GigShield</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 GigShield. Protecting India's gig workforce.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
