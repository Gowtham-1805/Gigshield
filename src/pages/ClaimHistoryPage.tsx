import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Filter, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { triggerTypes } from '@/lib/mock-data';
import { Link } from 'react-router-dom';
import { AppealDialog } from '@/components/shared/AppealDialog';
import type { Tables } from '@/integrations/supabase/types';

const statusColors: Record<string, string> = {
  approved: 'bg-secondary/10 text-secondary border-secondary/20',
  processing: 'bg-accent/10 text-accent border-accent/20',
  flagged: 'bg-destructive/10 text-destructive border-destructive/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};
const statusIcons: Record<string, string> = { approved: '✅', processing: '🔄', flagged: '🚩', rejected: '❌' };

export default function ClaimHistoryPage() {
  const { worker } = useAuth();
  const [claims, setClaims] = useState<(Tables<'claims'> & { payouts?: Tables<'payouts'>[] })[]>([]);
  const [filter, setFilter] = useState('all');
  const [totalPaid, setTotalPaid] = useState(0);
  const [appealClaim, setAppealClaim] = useState<any>(null);
  const [appealedClaimIds, setAppealedClaimIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    if (!worker) return;
    const { data: policies } = await supabase
      .from('policies')
      .select('id')
      .eq('worker_id', worker.id);
    
    if (!policies?.length) return;
    const policyIds = policies.map(p => p.id);

    const { data: claimsData } = await supabase
      .from('claims')
      .select('*, payouts(*)')
      .in('policy_id', policyIds)
      .order('created_at', { ascending: false });

    setClaims(claimsData || []);
    setTotalPaid((claimsData || []).filter(c => c.status === 'approved').reduce((s, c) => s + Number(c.amount), 0));

    // Check which claims already have appeals
    const claimIds = (claimsData || []).map(c => c.id);
    if (claimIds.length > 0) {
      const { data: appeals } = await supabase
        .from('appeals')
        .select('claim_id')
        .in('claim_id', claimIds);
      setAppealedClaimIds(new Set((appeals || []).map((a: any) => a.claim_id)));
    }
  };

  useEffect(() => {
    fetchData();
  }, [worker]);

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);
  const canAppeal = (claim: Tables<'claims'>) =>
    ['flagged', 'rejected'].includes(claim.status) && !appealedClaimIds.has(claim.id);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center h-14 px-4 gap-3">
          <Link to="/worker"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
          <h1 className="font-display font-bold">Claim History</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="shadow-card">
            <CardContent className="p-3 text-center">
              <p className="font-display font-bold text-xl">{claims.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Claims</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-3 text-center">
              <p className="font-display font-bold text-xl text-secondary">₹{totalPaid.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total Received</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-3 text-center">
              <p className="font-display font-bold text-xl">{claims.filter(c => c.status === 'approved').length}</p>
              <p className="text-[10px] text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">Approved</TabsTrigger>
            <TabsTrigger value="processing" className="flex-1">Processing</TabsTrigger>
            <TabsTrigger value="flagged" className="flex-1">Flagged</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Claims List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                No claims found 🛡️
              </CardContent>
            </Card>
          )}
          {filtered.map((claim, i) => {
            const trigger = triggerTypes.find(t => t.id === claim.trigger_type);
            const payout = (claim as any).payouts?.[0];
            const hasAppeal = appealedClaimIds.has(claim.id);
            return (
              <motion.div key={claim.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{statusIcons[claim.status] || '🔄'}</span>
                        <div>
                          <p className="font-medium text-sm">{trigger?.icon} {trigger?.label}</p>
                          <p className="text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleDateString()} at {new Date(claim.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={statusColors[claim.status] || ''}>{claim.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Claim Amount</p>
                        <p className="font-display font-bold text-lg">₹{Number(claim.amount).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Fraud Score</p>
                        <p className={`font-medium text-sm ${claim.fraud_score > 0.5 ? 'text-destructive' : claim.fraud_score > 0.2 ? 'text-accent' : 'text-secondary'}`}>
                          {(claim.fraud_score * 100).toFixed(0)}% risk
                        </p>
                      </div>
                    </div>
                    {payout && (
                      <div className="mt-2 p-2 rounded-lg bg-secondary/5 text-xs">
                        <span className="text-secondary font-medium">💸 Payout: {payout.status}</span>
                        {payout.upi_id && <span className="text-muted-foreground ml-2">via {payout.upi_id}</span>}
                      </div>
                    )}
                    {/* Appeal Button */}
                    {canAppeal(claim) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-3 border-accent text-accent hover:bg-accent/10"
                        onClick={() => setAppealClaim(claim)}
                      >
                        <MessageSquarePlus className="w-4 h-4 mr-2" />
                        Appeal This Claim
                      </Button>
                    )}
                    {hasAppeal && (
                      <div className="mt-2 p-2 rounded-lg bg-accent/5 text-xs text-center">
                        <span className="text-accent font-medium">📨 Appeal submitted — under review</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>

      <AppealDialog
        open={!!appealClaim}
        onOpenChange={(open) => !open && setAppealClaim(null)}
        claim={appealClaim}
        onSuccess={fetchData}
      />
    </div>
  );
}
