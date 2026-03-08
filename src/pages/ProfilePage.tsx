import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, CreditCard, MapPin, Smartphone, Save, Loader2, TrendingUp, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

export default function ProfilePage() {
  const { worker, user } = useAuth();
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [policy, setPolicy] = useState<Tables<'policies'> | null>(null);

  useEffect(() => {
    if (!worker) return;
    setPhone(worker.phone || '');
    
    supabase.from('policies')
      .select('*')
      .eq('worker_id', worker.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPolicy(data));
  }, [worker]);

  const handleSave = async () => {
    if (!worker) return;
    setSaving(true);
    const { error } = await supabase.from('workers').update({ phone }).eq('id', worker.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Profile updated!');
  };

  const daysLeft = policy ? Math.max(0, Math.ceil((new Date(policy.end_date).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center h-14 px-4 gap-3">
          <Link to="/worker"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
          <h1 className="font-display font-bold">My Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-card overflow-hidden">
            <div className="h-20 gradient-shield" />
            <CardContent className="p-5 -mt-10">
              <div className="w-16 h-16 rounded-full bg-card border-4 border-card flex items-center justify-center text-2xl font-display font-bold shadow-elevated">
                {worker?.name?.charAt(0) || '?'}
              </div>
              <h2 className="font-display text-xl font-bold mt-3">{worker?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline">{worker?.platform}</Badge>
                <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{worker?.city}</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Policy */}
        {policy && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Active Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{policy.tier}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Premium</span>
                  <span className="font-medium">₹{Number(policy.premium)}/week</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Payout</span>
                  <span className="font-medium">₹{Number(policy.max_payout).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Days Left</span>
                  <span className={`font-medium ${daysLeft <= 2 ? 'text-destructive' : 'text-secondary'}`}>{daysLeft} days</span>
                </div>
                {daysLeft <= 2 && (
                  <Button 
                    className="w-full gradient-shield text-primary-foreground border-0 mt-2"
                    disabled={renewing}
                    onClick={async () => {
                      setRenewing(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('renew-policy', {
                          body: { policy_id: policy!.id },
                        });
                        if (error) throw error;
                        if (data?.error) throw new Error(data.error);
                        toast.success('🛡️ Policy renewed!');
                        if (data.new_policy) setPolicy(data.new_policy);
                      } catch (e: any) {
                        toast.error(e.message || 'Renewal failed');
                      }
                      setRenewing(false);
                    }}
                  >
                    {renewing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Renewing...</> : `Renew Now — ₹${Number(policy.premium)}/week`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Edit Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Edit Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> UPI ID (for payouts)</Label>
                <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@upi" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Shield Score */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Shield Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Claims History', score: 85, desc: 'Low fraud risk' },
                { label: 'Zone Risk', score: 65, desc: 'Medium risk zone' },
                { label: 'Activity Level', score: 70, desc: 'Regular platform usage' },
                { label: 'Payment History', score: 90, desc: 'On-time premiums' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">{item.score}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.score >= 80 ? 'bg-secondary' : item.score >= 50 ? 'bg-accent' : 'bg-destructive'}`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Earnings Impact Report Link */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Link to="/earnings">
            <Card className="shadow-card border-secondary/20 hover:border-secondary/40 transition-colors cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-sm">Earnings Impact Report</h3>
                  <p className="text-xs text-muted-foreground">See how much GigShield saved you</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
