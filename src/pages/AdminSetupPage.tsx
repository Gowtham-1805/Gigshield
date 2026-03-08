import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

export default function AdminSetupPage() {
  const [setupKey, setSetupKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshWorker } = useAuth();
  const navigate = useNavigate();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in first');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('make-admin', {
        body: { setup_key: setupKey },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data.message || 'Admin role assigned!');
      await refreshWorker();
      navigate('/admin');
    } catch (e: any) {
      toast.error(e.message || 'Setup failed');
    }
    setLoading(false);
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

        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-destructive flex items-center justify-center mx-auto mb-4">
              <Crown className="w-7 h-7 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">Admin Setup</CardTitle>
            <CardDescription>
              {user 
                ? `Signed in as ${user.email}. Enter the setup key to gain admin access.`
                : 'Please sign in first, then return to this page.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="setupKey">Setup Key</Label>
                  <Input
                    id="setupKey"
                    type="password"
                    placeholder="Enter admin setup key"
                    value={setupKey}
                    onChange={(e) => setSetupKey(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Default key for demo: <code className="bg-muted px-1 py-0.5 rounded text-xs">gigshield-admin-2026</code>
                  </p>
                </div>
                <Button type="submit" className="w-full gradient-danger text-primary-foreground border-0 h-11" disabled={loading}>
                  {loading ? 'Setting up...' : '👑 Become Admin'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">You need to sign in before setting up admin access.</p>
                <Link to="/login">
                  <Button className="w-full gradient-shield text-primary-foreground border-0">Sign In First</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
