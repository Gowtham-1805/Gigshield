import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { zones } from '@/lib/mock-data';

const steps = ['account', 'platform', 'zone', 'plan'] as const;
type Step = typeof steps[number];

const platforms = [
  { id: 'zomato', label: 'Zomato', icon: '🍕' },
  { id: 'swiggy', label: 'Swiggy', icon: '🛵' },
  { id: 'other', label: 'Other', icon: '📦' },
];

const planOptions = [
  { tier: 'BASIC', price: '₹29–49', payout: '₹1,500', desc: 'Weather only', color: 'border-border' },
  { tier: 'STANDARD', price: '₹49–79', payout: '₹2,500', desc: 'Weather + AQI', color: 'border-primary ring-2 ring-primary/20', recommended: true },
  { tier: 'PRO', price: '₹79–129', payout: '₹4,000', desc: 'Full coverage', color: 'border-border' },
];

export default function SignupPage() {
  const [step, setStep] = useState<Step>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('STANDARD');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const stepIndex = steps.indexOf(step);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Complete your profile.');
      setStep('platform');
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const zone = zones.find(z => z.id === zoneId);
      await supabase.from('workers').update({
        name,
        platform,
        city: zone?.city || 'Mumbai',
        zone_id: zoneId || null,
      }).eq('user_id', user.id);
    }
    setLoading(false);
    toast.success('You\'re protected! Welcome to GigShield.');
    navigate('/worker');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-80 h-80 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center gap-2 mb-8 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl gradient-shield flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">
              {step === 'account' && 'Create Account'}
              {step === 'platform' && 'Your Platform'}
              {step === 'zone' && 'Your Zone'}
              {step === 'plan' && 'Choose Your Shield'}
            </CardTitle>
            <CardDescription>
              {step === 'account' && 'Start protecting your income in 90 seconds'}
              {step === 'platform' && 'Which delivery platform do you work on?'}
              {step === 'zone' && 'Select your primary delivery zone'}
              {step === 'plan' && 'Pick the coverage that fits your needs'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'account' && (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full gradient-shield text-primary-foreground border-0 h-11" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Account'} <ChevronRight className="w-4 h-4" />
                </Button>
              </form>
            )}

            {step === 'platform' && (
              <div className="space-y-3">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPlatform(p.id); setStep('zone'); }}
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
            )}

            {step === 'zone' && (
              <div className="space-y-4">
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger><SelectValue placeholder="Select your zone" /></SelectTrigger>
                  <SelectContent>
                    {zones.map(z => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setStep('plan')}
                  disabled={!zoneId}
                  className="w-full gradient-shield text-primary-foreground border-0 h-11"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {step === 'plan' && (
              <div className="space-y-3">
                {planOptions.map((p) => (
                  <button
                    key={p.tier}
                    onClick={() => setSelectedPlan(p.tier)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedPlan === p.tier ? 'border-primary bg-primary/5' : 'border-border'
                    } relative`}
                  >
                    {p.recommended && (
                      <span className="absolute -top-2.5 right-3 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                        Recommended
                      </span>
                    )}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-display font-bold">{p.tier}</p>
                        <p className="text-xs text-muted-foreground">{p.desc}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-primary">{p.price}</p>
                        <p className="text-xs text-muted-foreground">max {p.payout}/wk</p>
                      </div>
                    </div>
                  </button>
                ))}
                <Button
                  onClick={handleFinish}
                  disabled={loading}
                  className="w-full gradient-shield text-primary-foreground border-0 h-12 text-lg mt-4"
                >
                  {loading ? 'Setting up...' : '🛡️ Get Protected Now'}
                </Button>
              </div>
            )}

            {step === 'account' && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
