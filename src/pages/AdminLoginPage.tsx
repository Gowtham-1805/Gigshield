import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, ArrowLeft, Lock, Mail, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Sign in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); setLoading(false); return; }

      if (!data.user) { toast.error('Login failed'); setLoading(false); return; }

      // Step 2: Check if already admin
      const { data: alreadyAdmin } = await supabase.rpc('has_role', { _user_id: data.user.id, _role: 'admin' });

      if (alreadyAdmin) {
        toast.success('Welcome back, Admin!');
        navigate('/admin');
        setLoading(false);
        return;
      }

      // Step 3: If not admin, verify setup key to elevate
      if (!setupKey) {
        toast.error('You are not an admin. Enter the admin setup key to gain access.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const { data: elevateData, error: elevateError } = await supabase.functions.invoke('make-admin', {
        body: { setup_key: setupKey },
      });

      if (elevateError) throw elevateError;
      if (elevateData?.error) throw new Error(elevateData.error);

      toast.success('Admin access granted! Welcome.');
      navigate('/admin');
    } catch (e: any) {
      toast.error(e.message || 'Admin login failed');
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-background to-accent/5" />
      <div className="absolute inset-0 pattern-grid opacity-10" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-destructive/8 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px]" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <Card className="shadow-elevated border-border/30 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-destructive flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Crown className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">Admin Sign In</CardTitle>
            <CardDescription>Access the GigShield admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="admin-email" type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="admin-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-key" className="text-sm font-medium">
                  Admin Setup Key <span className="text-muted-foreground font-normal">(first-time only)</span>
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="admin-key" type="password" placeholder="Leave blank if already admin" value={setupKey} onChange={(e) => setSetupKey(e.target.value)} className="pl-10 h-11" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Existing admins can leave this blank. New admins need the setup key.
                  Hint: <code className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px] select-all">gigshield-admin-2026</code>
                </p>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-accent to-destructive text-primary-foreground border-0 h-12 shadow-lg font-semibold text-base" disabled={loading}>
                {loading ? 'Signing in...' : '👑 Admin Sign In'}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Not an admin?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">Worker Sign In</Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
