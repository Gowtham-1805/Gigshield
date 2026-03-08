import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Shield, Search, Download, ChevronLeft, ChevronRight, ArrowRight, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface LedgerEntry {
  id: string;
  incident_id: string | null;
  trigger_type: string;
  incident_date: string;
  incident_zone: string;
  incident_severity: number;
  worker_name: string;
  claim_amount: number;
  claim_status: string;
  fraud_score: number;
  payout_amount: number | null;
  payout_status: string | null;
  payout_date: string | null;
  claim_date: string;
}

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; class: string }> = {
  approved: { icon: CheckCircle2, class: 'bg-secondary/10 text-secondary border-secondary/20' },
  processing: { icon: Clock, class: 'bg-accent/10 text-accent border-accent/20' },
  flagged: { icon: AlertTriangle, class: 'bg-destructive/10 text-destructive border-destructive/20' },
  rejected: { icon: XCircle, class: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const PAYOUT_STATUS_CONFIG: Record<string, string> = {
  completed: 'bg-secondary/10 text-secondary border-secondary/20',
  pending: 'bg-accent/10 text-accent border-accent/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function TransparencyLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTrigger, setFilterTrigger] = useState('all');
  const [search, setSearch] = useState('');

  const [summaryStats, setSummaryStats] = useState({
    totalIncidents: 0,
    totalClaims: 0,
    totalPaidOut: 0,
    avgProcessingTime: '—',
  });

  useEffect(() => {
    fetchLedger();
  }, [page, filterStatus, filterTrigger, search]);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    const [incRes, claimRes, payoutRes] = await Promise.all([
      supabase.from('incidents').select('id', { count: 'exact', head: true }),
      supabase.from('claims').select('id, amount', { count: 'exact' }),
      supabase.from('payouts').select('amount').eq('status', 'completed'),
    ]);

    const totalPaid = (payoutRes.data || []).reduce((s, p) => s + Number(p.amount), 0);

    setSummaryStats({
      totalIncidents: incRes.count || 0,
      totalClaims: claimRes.count || 0,
      totalPaidOut: totalPaid,
      avgProcessingTime: '< 2 min',
    });
  };

  const fetchLedger = async () => {
    setLoading(true);

    let query = supabase
      .from('claims')
      .select(`
        id, amount, status, fraud_score, trigger_type, created_at,
        incident_id,
        incidents(id, created_at, severity, zone_id, zones(name)),
        policies!inner(worker_id, workers!inner(name))
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus as any);
    }
    if (filterTrigger !== 'all') {
      query = query.eq('trigger_type', filterTrigger as any);
    }

    const { data, count } = await query;
    setTotalCount(count || 0);

    if (!data) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Fetch payouts for these claims
    const claimIds = data.map(c => c.id);
    const { data: payouts } = await supabase
      .from('payouts')
      .select('claim_id, amount, status, created_at')
      .in('claim_id', claimIds.length > 0 ? claimIds : ['none']);

    const payoutMap = new Map((payouts || []).map(p => [p.claim_id, p]));

    const mapped: LedgerEntry[] = data
      .filter(row => {
        if (!search) return true;
        const name = (row as any).policies?.workers?.name || '';
        return name.toLowerCase().includes(search.toLowerCase());
      })
      .map(row => {
        const payout = payoutMap.get(row.id);
        const incident = (row as any).incidents;
        return {
          id: row.id,
          incident_id: row.incident_id,
          trigger_type: row.trigger_type,
          incident_date: incident?.created_at || row.created_at,
          incident_zone: incident?.zones?.name || 'N/A',
          incident_severity: incident?.severity || 0,
          worker_name: (row as any).policies?.workers?.name || 'Unknown',
          claim_amount: Number(row.amount),
          claim_status: row.status,
          fraud_score: row.fraud_score,
          payout_amount: payout ? Number(payout.amount) : null,
          payout_status: payout?.status || null,
          payout_date: payout?.created_at || null,
          claim_date: row.created_at,
        };
      });

    setEntries(mapped);
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Trigger', 'Zone', 'Severity', 'Worker', 'Claim ₹', 'Claim Status', 'Fraud %', 'Payout ₹', 'Payout Status'];
    const rows = entries.map(e => [
      format(new Date(e.claim_date), 'yyyy-MM-dd HH:mm'),
      e.trigger_type,
      e.incident_zone,
      e.incident_severity,
      e.worker_name,
      e.claim_amount,
      e.claim_status,
      (e.fraud_score * 100).toFixed(0) + '%',
      e.payout_amount ?? '—',
      e.payout_status ?? '—',
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gigshield-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Incidents', value: summaryStats.totalIncidents.toLocaleString(), color: 'text-primary' },
          { label: 'Total Claims Filed', value: summaryStats.totalClaims.toLocaleString(), color: 'text-accent' },
          { label: 'Total Paid Out', value: `₹${(summaryStats.totalPaidOut / 1000).toFixed(1)}K`, color: 'text-secondary' },
          { label: 'Avg Processing', value: summaryStats.avgProcessingTime, color: 'text-primary' },
        ].map((stat, i) => (
          <Card key={i} className="shadow-card border-border/50">
            <CardContent className="p-5">
              <p className={`font-display text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit Trail */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Transparency Ledger
              </CardTitle>
              <CardDescription>Full audit trail: Trigger → Claim → Payout</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search worker..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTrigger} onValueChange={v => { setFilterTrigger(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trigger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Triggers</SelectItem>
                <SelectItem value="RAIN_HEAVY">Rain Heavy</SelectItem>
                <SelectItem value="RAIN_EXTREME">Rain Extreme</SelectItem>
                <SelectItem value="HEAT_EXTREME">Heat Extreme</SelectItem>
                <SelectItem value="AQI_SEVERE">AQI Severe</SelectItem>
                <SelectItem value="CURFEW_LOCAL">Curfew Local</SelectItem>
                <SelectItem value="STORM_CYCLONE">Storm Cyclone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Date</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead className="text-right">Claim ₹</TableHead>
                  <TableHead>Claim Status</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead className="text-right">Payout ₹</TableHead>
                  <TableHead>Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      Loading ledger...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No records found. Use Demo Trigger to simulate events.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && entries.map(entry => {
                  const statusCfg = STATUS_CONFIG[entry.claim_status] || STATUS_CONFIG.processing;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(entry.claim_date), 'dd MMM yy, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {entry.trigger_type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{entry.incident_zone}</TableCell>
                      <TableCell className="text-sm font-medium">{entry.worker_name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">₹{entry.claim_amount}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${statusCfg.class}`}>
                          <StatusIcon className="w-3 h-3" />
                          {entry.claim_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.payout_amount != null ? (
                          <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">Paid</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {entry.payout_amount != null ? `₹${entry.payout_amount}` : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.payout_status ? (
                          <Badge variant="outline" className={PAYOUT_STATUS_CONFIG[entry.payout_status] || ''}>
                            {entry.payout_status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
