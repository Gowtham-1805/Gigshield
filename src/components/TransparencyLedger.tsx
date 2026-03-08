import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronRight, Shield, Cloud, Banknote, CheckCircle2, XCircle, Clock, AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface LedgerEntry {
  incident: {
    id: string;
    trigger_type: string;
    severity: number;
    created_at: string;
    zone_name: string;
    zone_city: string;
    is_simulated: boolean;
  };
  claim: {
    id: string;
    amount: number;
    status: string;
    fraud_score: number;
    created_at: string;
    worker_name: string;
    policy_tier: string;
  };
  payout: {
    id: string;
    amount: number;
    status: string;
    upi_id: string | null;
    created_at: string;
  } | null;
}

const triggerIcons: Record<string, string> = {
  RAIN_HEAVY: '🌧️',
  RAIN_EXTREME: '⛈️',
  HEAT_EXTREME: '🔥',
  AQI_SEVERE: '😷',
  CURFEW_LOCAL: '🚨',
  STORM_CYCLONE: '🌪️',
};

const claimStatusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  approved: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20' },
  processing: { icon: <Clock className="w-4 h-4" />, color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
  flagged: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
  rejected: { icon: <XCircle className="w-4 h-4" />, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
};

const payoutStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
  completed: { label: 'Paid', color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20' },
  failed: { label: 'Failed', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
};

interface TransparencyLedgerProps {
  workerId?: string; // If provided, filter for this worker only
  isAdmin?: boolean;
}

export default function TransparencyLedger({ workerId, isAdmin = false }: TransparencyLedgerProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [approvedSub, setApprovedSub] = useState<'all' | 'paid' | 'unpaid'>('all');

  useEffect(() => {
    const fetchLedger = async () => {
      // Fetch claims with joined data
      let query = supabase
        .from('claims')
        .select(`
          *,
          policies!inner(worker_id, tier, workers!inner(id, name)),
          incidents(id, trigger_type, severity, created_at, is_simulated, zone_id, zones(name, city))
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (workerId) {
        query = query.eq('policies.worker_id', workerId);
      }

      const { data: claimsData } = await query;

      if (!claimsData?.length) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Fetch payouts for these claims
      const claimIds = claimsData.map((c: any) => c.id);
      const { data: payoutsData } = await supabase
        .from('payouts')
        .select('*')
        .in('claim_id', claimIds);

      const payoutMap: Record<string, any> = {};
      (payoutsData || []).forEach((p: any) => {
        payoutMap[p.claim_id] = p;
      });

      const ledger: LedgerEntry[] = claimsData.map((c: any) => {
        const incident = c.incidents;
        const payout = payoutMap[c.id] || null;

        return {
          incident: {
            id: incident?.id || 'N/A',
            trigger_type: c.trigger_type,
            severity: incident?.severity || 0,
            created_at: incident?.created_at || c.created_at,
            zone_name: incident?.zones?.name || 'Unknown',
            zone_city: incident?.zones?.city || 'Unknown',
            is_simulated: incident?.is_simulated || false,
          },
          claim: {
            id: c.id,
            amount: Number(c.amount),
            status: c.status,
            fraud_score: c.fraud_score,
            created_at: c.created_at,
            worker_name: c.policies?.workers?.name || 'Unknown',
            policy_tier: c.policies?.tier || 'N/A',
          },
          payout: payout
            ? {
                id: payout.id,
                amount: Number(payout.amount),
                status: payout.status,
                upi_id: payout.upi_id,
                created_at: payout.created_at,
              }
            : null,
        };
      });

      setEntries(ledger);
      setLoading(false);
    };

    fetchLedger();
  }, [workerId]);

  // Tab + sub-filter logic
  const tabFiltered = entries.filter((e) => {
    if (tab === 'all') return true;
    if (tab === 'approved') {
      if (approvedSub === 'paid') return e.claim.status === 'approved' && e.payout?.status === 'completed';
      if (approvedSub === 'unpaid') return e.claim.status === 'approved' && (!e.payout || e.payout.status !== 'completed');
      return e.claim.status === 'approved';
    }
    if (tab === 'processing') return e.claim.status === 'processing';
    if (tab === 'flagged') return e.claim.status === 'flagged';
    return true;
  });

  const filtered = search
    ? tabFiltered.filter(
        (e) =>
          e.claim.worker_name.toLowerCase().includes(search.toLowerCase()) ||
          e.incident.trigger_type.toLowerCase().includes(search.toLowerCase()) ||
          e.incident.zone_name.toLowerCase().includes(search.toLowerCase()) ||
          e.incident.zone_city.toLowerCase().includes(search.toLowerCase())
      )
    : tabFiltered;

  // Summary stats
  const totalPaid = entries.filter(e => e.payout?.status === 'completed').reduce((s, e) => s + (e.payout?.amount || 0), 0);
  const totalClaims = entries.length;
  const approvedClaims = entries.filter(e => e.claim.status === 'approved').length;
  const avgProcessTime = '< 10 min'; // Simplified

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trust Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: totalClaims, icon: Cloud, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Claims Approved', value: approvedClaims, icon: CheckCircle2, color: 'text-secondary', bg: 'bg-secondary/10' },
          { label: 'Total Paid Out', value: `₹${totalPaid.toLocaleString()}`, icon: Banknote, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Avg Response', value: avgProcessTime, icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((kpi, i) => (
          <Card key={i} className="shadow-card">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-2`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="font-display text-xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by worker, trigger, zone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Ledger Table with Tabs */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Transparency Ledger
          </CardTitle>
          <CardDescription>
            Full audit trail: Weather Trigger → Claim → Payout. Every transaction is verifiable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setApprovedSub('all'); }}>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <TabsList>
                <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({entries.filter(e => e.claim.status === 'approved').length})
                </TabsTrigger>
                <TabsTrigger value="processing">
                  Processing ({entries.filter(e => e.claim.status === 'processing').length})
                </TabsTrigger>
                <TabsTrigger value="flagged">
                  Flagged ({entries.filter(e => e.claim.status === 'flagged').length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Approved sub-filters */}
            {tab === 'approved' && (
              <div className="flex items-center gap-2 mb-4">
                {(['all', 'paid', 'unpaid'] as const).map((sub) => {
                  const count = sub === 'all'
                    ? entries.filter(e => e.claim.status === 'approved').length
                    : sub === 'paid'
                    ? entries.filter(e => e.claim.status === 'approved' && e.payout?.status === 'completed').length
                    : entries.filter(e => e.claim.status === 'approved' && (!e.payout || e.payout.status !== 'completed')).length;
                  return (
                    <Badge
                      key={sub}
                      variant={approvedSub === sub ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
                        approvedSub === sub
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setApprovedSub(sub)}
                    >
                      {sub === 'all' ? 'All' : sub === 'paid' ? '💰 Paid' : '⏳ Unpaid'} ({count})
                    </Badge>
                  );
                })}
              </div>
            )}

            <TabsContent value={tab} className="mt-0">
              <LedgerTable entries={filtered} isAdmin={isAdmin} onSelect={setSelected} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Transaction Proof</DialogTitle>
            <DialogDescription>Complete audit trail for this event</DialogDescription>
          </DialogHeader>
          {selected && <LedgerDetail entry={selected} isAdmin={isAdmin} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LedgerDetail({ entry, isAdmin }: { entry: LedgerEntry; isAdmin: boolean }) {
  const steps = [
    {
      label: 'Weather Trigger Detected',
      icon: triggerIcons[entry.incident.trigger_type] || '⚡',
      time: format(new Date(entry.incident.created_at), 'dd MMM yyyy, HH:mm:ss'),
      details: [
        { key: 'Type', value: entry.incident.trigger_type.replace(/_/g, ' ') },
        { key: 'Severity', value: `${entry.incident.severity}/100` },
        { key: 'Zone', value: `${entry.incident.zone_name}, ${entry.incident.zone_city}` },
        ...(entry.incident.is_simulated ? [{ key: 'Mode', value: '🧪 Simulated' }] : [{ key: 'Mode', value: '✅ Live' }]),
      ],
      active: true,
    },
    {
      label: 'Claim Auto-Generated',
      icon: '📋',
      time: format(new Date(entry.claim.created_at), 'dd MMM yyyy, HH:mm:ss'),
      details: [
        { key: 'Amount', value: `₹${entry.claim.amount.toLocaleString()}` },
        { key: 'Tier', value: entry.claim.policy_tier },
        { key: 'Fraud Score', value: `${(entry.claim.fraud_score * 100).toFixed(0)}%` },
        { key: 'Status', value: entry.claim.status.toUpperCase() },
        ...(isAdmin ? [{ key: 'Worker', value: entry.claim.worker_name }] : []),
      ],
      active: true,
    },
    {
      label: entry.payout ? 'Payout Processed' : 'Payout Pending',
      icon: entry.payout?.status === 'completed' ? '✅' : entry.payout?.status === 'failed' ? '❌' : '⏳',
      time: entry.payout
        ? format(new Date(entry.payout.created_at), 'dd MMM yyyy, HH:mm:ss')
        : 'Awaiting processing',
      details: entry.payout
        ? [
            { key: 'Amount', value: `₹${entry.payout.amount.toLocaleString()}` },
            { key: 'Status', value: entry.payout.status.toUpperCase() },
            ...(entry.payout.upi_id ? [{ key: 'UPI', value: entry.payout.upi_id }] : []),
            { key: 'Tx ID', value: entry.payout.id.slice(0, 8) + '...' },
          ]
        : [{ key: 'Info', value: entry.claim.status === 'approved' ? 'Processing soon' : 'Claim not yet approved' }],
      active: !!entry.payout,
    },
  ];

  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={i} className="relative pl-8 pb-6 last:pb-0">
          {/* Connector line */}
          {i < steps.length - 1 && (
            <div className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-16px)] ${step.active ? 'bg-primary/30' : 'bg-border'}`} />
          )}
          {/* Step icon */}
          <div className={`absolute left-0 top-0 w-8 h-8 rounded-xl flex items-center justify-center text-base ${step.active ? 'bg-primary/10' : 'bg-muted'}`}>
            {step.icon}
          </div>
          {/* Content */}
          <div>
            <p className="font-display font-semibold text-sm">{step.label}</p>
            <p className="text-xs text-muted-foreground mb-2">{step.time}</p>
            <div className="grid grid-cols-2 gap-2">
              {step.details.map((d) => (
                <div key={d.key} className="p-2 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{d.key}</p>
                  <p className="text-xs font-medium mt-0.5">{d.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
