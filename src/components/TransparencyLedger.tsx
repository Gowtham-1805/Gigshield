import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Search, Download, ArrowRight, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface LedgerEntry {
  id: string;
  incident: {
    id: string;
    trigger_type: string;
    severity: number;
    created_at: string;
    zone: { name: string; city: string } | null;
    is_simulated: boolean;
  };
  claim: {
    id: string;
    amount: number;
    status: string;
    fraud_score: number;
    created_at: string;
    trigger_type: string;
  };
  policy: {
    tier: string;
    worker_name: string;
  };
  payout: {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    upi_id: string | null;
  } | null;
}

const CHART_COLORS = {
  approved: '#22c55e',
  processing: '#f59e0b',
  flagged: '#ef4444',
  rejected: '#6b7280',
  completed: '#22c55e',
  pending: '#f59e0b',
  failed: '#ef4444',
};

export default function TransparencyLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mainTab, setMainTab] = useState('approved');
  const [approvedSub, setApprovedSub] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    setLoading(true);

    // Fetch claims with related data
    const { data: claims } = await supabase
      .from('claims')
      .select(`
        id, amount, status, fraud_score, created_at, trigger_type,
        incidents!claims_incident_id_fkey(id, trigger_type, severity, created_at, is_simulated, zone_id, zones(name, city)),
        policies!claims_policy_id_fkey(tier, worker_id, workers!policies_worker_id_fkey(name))
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!claims) { setLoading(false); return; }

    // Fetch payouts for these claims
    const claimIds = claims.map(c => c.id);
    const { data: payouts } = await supabase
      .from('payouts')
      .select('id, claim_id, amount, status, created_at, upi_id')
      .in('claim_id', claimIds);

    const payoutMap = new Map((payouts || []).map(p => [p.claim_id, p]));

    const ledger: LedgerEntry[] = claims.map((c: any) => ({
      id: c.id,
      incident: c.incidents ? {
        id: c.incidents.id,
        trigger_type: c.incidents.trigger_type,
        severity: c.incidents.severity,
        created_at: c.incidents.created_at,
        zone: c.incidents.zones || null,
        is_simulated: c.incidents.is_simulated,
      } : {
        id: 'N/A',
        trigger_type: c.trigger_type,
        severity: 0,
        created_at: c.created_at,
        zone: null,
        is_simulated: false,
      },
      claim: {
        id: c.id,
        amount: Number(c.amount),
        status: c.status,
        fraud_score: c.fraud_score,
        created_at: c.created_at,
        trigger_type: c.trigger_type,
      },
      policy: {
        tier: c.policies?.tier || 'N/A',
        worker_name: c.policies?.workers?.name || 'Unknown',
      },
      payout: payoutMap.get(c.id) ? {
        id: payoutMap.get(c.id)!.id,
        amount: Number(payoutMap.get(c.id)!.amount),
        status: payoutMap.get(c.id)!.status,
        created_at: payoutMap.get(c.id)!.created_at,
        upi_id: payoutMap.get(c.id)!.upi_id,
      } : null,
    }));

    setEntries(ledger);
    setLoading(false);
  };

  const filtered = entries.filter(e => {
    const matchesSearch = search === '' ||
      e.policy.worker_name.toLowerCase().includes(search.toLowerCase()) ||
      e.incident.trigger_type.toLowerCase().includes(search.toLowerCase()) ||
      (e.incident.zone?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.incident.zone?.city || '').toLowerCase().includes(search.toLowerCase());
    
    let matchesTab = false;
    if (mainTab === 'approved') {
      matchesTab = e.claim.status === 'approved';
      if (approvedSub === 'paid') matchesTab = matchesTab && e.payout?.status === 'completed';
      if (approvedSub === 'unpaid') matchesTab = matchesTab && (!e.payout || e.payout.status !== 'completed');
    } else if (mainTab === 'processing') {
      matchesTab = e.claim.status === 'processing';
    } else if (mainTab === 'flagged') {
      matchesTab = e.claim.status === 'flagged';
    }
    
    return matchesSearch && matchesTab;
  }).sort((a, b) => {
    const da = new Date(a.claim.created_at).getTime();
    const db = new Date(b.claim.created_at).getTime();
    return sortDir === 'desc' ? db - da : da - db;
  });

  const counts = {
    approved: entries.filter(e => e.claim.status === 'approved').length,
    approvedPaid: entries.filter(e => e.claim.status === 'approved' && e.payout?.status === 'completed').length,
    approvedUnpaid: entries.filter(e => e.claim.status === 'approved' && (!e.payout || e.payout.status !== 'completed')).length,
    processing: entries.filter(e => e.claim.status === 'processing').length,
    flagged: entries.filter(e => e.claim.status === 'flagged').length,
  };

  const totals = {
    claims: filtered.length,
    approved: filtered.filter(e => e.claim.status === 'approved').length,
    totalPaid: filtered.reduce((s, e) => s + (e.payout?.status === 'completed' ? e.payout.amount : 0), 0),
    avgFraud: filtered.length > 0 ? (filtered.reduce((s, e) => s + e.claim.fraud_score, 0) / filtered.length * 100) : 0,
  };

  const exportCSV = () => {
    const headers = ['Date', 'Worker', 'Zone', 'City', 'Trigger', 'Severity', 'Tier', 'Claim ₹', 'Claim Status', 'Fraud %', 'Payout ₹', 'Payout Status', 'UPI'];
    const rows = filtered.map(e => [
      format(new Date(e.claim.created_at), 'yyyy-MM-dd HH:mm'),
      e.policy.worker_name,
      e.incident.zone?.name || 'N/A',
      e.incident.zone?.city || 'N/A',
      e.incident.trigger_type,
      e.incident.severity,
      e.policy.tier,
      e.claim.amount,
      e.claim.status,
      (e.claim.fraud_score * 100).toFixed(1),
      e.payout?.amount || '',
      e.payout?.status || 'N/A',
      e.payout?.upi_id || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gigshield-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Entries', value: totals.claims.toString(), color: 'bg-primary/10 text-primary' },
          { label: 'Approved', value: totals.approved.toString(), color: 'bg-secondary/10 text-secondary' },
          { label: 'Total Paid Out', value: `₹${totals.totalPaid.toLocaleString()}`, color: 'bg-accent/10 text-accent' },
          { label: 'Avg Fraud Score', value: `${totals.avgFraud.toFixed(1)}%`, color: totals.avgFraud > 30 ? 'bg-destructive/10 text-destructive' : 'bg-secondary/10 text-secondary' },
        ].map((s, i) => (
          <Card key={i} className="shadow-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-display font-bold mt-1 ${s.color.split(' ')[1]}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ledger Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Transparency Ledger
              </CardTitle>
              <CardDescription>Full audit trail: Incident → Claim → Payout</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 shrink-0">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            <Tabs value={mainTab} onValueChange={(v) => { setMainTab(v); setApprovedSub('all'); }}>
              <TabsList>
                <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
                <TabsTrigger value="processing">Processing ({counts.processing})</TabsTrigger>
                <TabsTrigger value="flagged">Flagged ({counts.flagged})</TabsTrigger>
              </TabsList>
            </Tabs>
            {mainTab === 'approved' && (
              <div className="flex items-center gap-2">
                {(['all', 'paid', 'unpaid'] as const).map(sub => (
                  <Button
                    key={sub}
                    variant={approvedSub === sub ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setApprovedSub(sub)}
                    className="text-xs capitalize"
                  >
                    {sub === 'all' ? `All (${counts.approved})` : sub === 'paid' ? `Paid (${counts.approvedPaid})` : `Unpaid (${counts.approvedUnpaid})`}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search worker, zone, trigger..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} title="Toggle sort">
                {sortDir === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground animate-pulse">Loading ledger…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No entries found. Use Demo Trigger to generate data.</div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead className="text-right">Claim ₹</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(entry => (
                    <>
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.claim.created_at), 'dd MMM yy, HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{entry.policy.worker_name}</TableCell>
                        <TableCell className="text-sm">
                          {entry.incident.zone?.name || 'N/A'}
                          <span className="text-xs text-muted-foreground ml-1">({entry.incident.zone?.city || '?'})</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{entry.incident.trigger_type.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">₹{entry.claim.amount}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: CHART_COLORS[entry.claim.status as keyof typeof CHART_COLORS] || '#6b7280', color: CHART_COLORS[entry.claim.status as keyof typeof CHART_COLORS] || '#6b7280' }}
                          >
                            {entry.claim.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.payout ? (
                            <span className="text-xs" style={{ color: CHART_COLORS[entry.payout.status as keyof typeof CHART_COLORS] || '#6b7280' }}>
                              ₹{entry.payout.amount} · {entry.payout.status}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {expandedRow === entry.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </TableCell>
                      </TableRow>
                      {expandedRow === entry.id && (
                        <TableRow key={`${entry.id}-detail`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <div className="p-4 space-y-3">
                              {/* Flow visualization */}
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                                  <p className="font-semibold text-primary">🌩️ Incident</p>
                                  <p className="text-muted-foreground mt-0.5">Severity: {entry.incident.severity}/100</p>
                                  <p className="text-muted-foreground">{entry.incident.is_simulated ? '🧪 Simulated' : '🌐 Real'}</p>
                                  <p className="text-muted-foreground">{format(new Date(entry.incident.created_at), 'dd MMM, HH:mm')}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                                  <p className="font-semibold text-accent">📋 Claim</p>
                                  <p className="text-muted-foreground mt-0.5">Amount: ₹{entry.claim.amount}</p>
                                  <p className="text-muted-foreground">Fraud: {(entry.claim.fraud_score * 100).toFixed(1)}%</p>
                                  <p className="text-muted-foreground">Tier: {entry.policy.tier}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className={`px-3 py-2 rounded-lg border ${entry.payout ? 'bg-secondary/10 border-secondary/20' : 'bg-muted/50 border-border'}`}>
                                  <p className={`font-semibold ${entry.payout ? 'text-secondary' : 'text-muted-foreground'}`}>💰 Payout</p>
                                  {entry.payout ? (
                                    <>
                                      <p className="text-muted-foreground mt-0.5">₹{entry.payout.amount} · {entry.payout.status}</p>
                                      {entry.payout.upi_id && <p className="text-muted-foreground">UPI: {entry.payout.upi_id}</p>}
                                      <p className="text-muted-foreground">{format(new Date(entry.payout.created_at), 'dd MMM, HH:mm')}</p>
                                    </>
                                  ) : (
                                    <p className="text-muted-foreground mt-0.5">Pending / Not issued</p>
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono">Claim ID: {entry.claim.id}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
