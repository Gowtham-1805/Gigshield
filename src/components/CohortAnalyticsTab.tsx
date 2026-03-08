import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Users, RefreshCw, TrendingDown, ArrowUpRight, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Worker = Tables<'workers'>;
type Policy = Tables<'policies'>;

interface CohortData {
  segment: string;
  totalWorkers: number;
  activePolicies: number;
  expiredPolicies: number;
  renewedPolicies: number;
  retentionRate: number;
  churnRate: number;
  renewalRate: number;
  avgPremium: number;
}

const COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(160, 84%, 39%)', 'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)', 'hsl(280, 60%, 55%)', 'hsl(190, 70%, 45%)',
];

export default function CohortAnalyticsTab() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [segmentBy, setSegmentBy] = useState<'city' | 'platform' | 'tier'>('city');

  useEffect(() => {
    const fetch = async () => {
      const [wRes, pRes] = await Promise.all([
        supabase.from('workers').select('*'),
        supabase.from('policies').select('*'),
      ]);
      setWorkers(wRes.data || []);
      setPolicies(pRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const cohorts = useMemo<CohortData[]>(() => {
    if (!workers.length) return [];

    // Build worker → policies map
    const workerPolicies: Record<string, Policy[]> = {};
    policies.forEach(p => {
      if (!workerPolicies[p.worker_id]) workerPolicies[p.worker_id] = [];
      workerPolicies[p.worker_id].push(p);
    });

    // Group workers by segment
    const groups: Record<string, Worker[]> = {};
    workers.forEach(w => {
      let key: string;
      if (segmentBy === 'city') key = w.city;
      else if (segmentBy === 'platform') key = w.platform;
      else key = 'N/A'; // tier is per-policy, handled below
      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    });

    // If segmenting by tier, regroup by policy tier
    if (segmentBy === 'tier') {
      const tierGroups: Record<string, Set<string>> = {};
      const tierWorkerMap: Record<string, Worker[]> = {};
      policies.forEach(p => {
        const tier = p.tier;
        if (!tierGroups[tier]) { tierGroups[tier] = new Set(); tierWorkerMap[tier] = []; }
        if (!tierGroups[tier].has(p.worker_id)) {
          tierGroups[tier].add(p.worker_id);
          const w = workers.find(w => w.id === p.worker_id);
          if (w) tierWorkerMap[tier].push(w);
        }
      });
      Object.keys(groups).forEach(k => delete groups[k]);
      Object.entries(tierWorkerMap).forEach(([k, v]) => { groups[k] = v; });
    }

    return Object.entries(groups).map(([segment, segWorkers]) => {
      const workerIds = new Set(segWorkers.map(w => w.id));
      const segPolicies = policies.filter(p => workerIds.has(p.worker_id));
      const active = segPolicies.filter(p => p.status === 'active');
      const expired = segPolicies.filter(p => p.status === 'expired');

      // Renewed = workers who had an expired policy AND later got an active one
      const workersWithExpired = new Set(expired.map(p => p.worker_id));
      const workersWithActive = new Set(active.map(p => p.worker_id));
      const renewed = [...workersWithExpired].filter(id => workersWithActive.has(id));

      // Workers with ≥1 policy = engaged; those with active = retained
      const engagedWorkers = new Set(segPolicies.map(p => p.worker_id));
      const retainedWorkers = new Set(active.map(p => p.worker_id));
      const churned = [...engagedWorkers].filter(id => !retainedWorkers.has(id));

      const totalEngaged = engagedWorkers.size || 1;
      const avgPremium = segPolicies.length > 0
        ? segPolicies.reduce((s, p) => s + Number(p.premium), 0) / segPolicies.length
        : 0;

      return {
        segment,
        totalWorkers: segWorkers.length,
        activePolicies: active.length,
        expiredPolicies: expired.length,
        renewedPolicies: renewed.length,
        retentionRate: Math.round((retainedWorkers.size / totalEngaged) * 100),
        churnRate: Math.round((churned.length / totalEngaged) * 100),
        renewalRate: workersWithExpired.size > 0 ? Math.round((renewed.length / workersWithExpired.size) * 100) : 0,
        avgPremium: Math.round(avgPremium),
      };
    }).sort((a, b) => b.totalWorkers - a.totalWorkers);
  }, [workers, policies, segmentBy]);

  const totals = useMemo(() => {
    const t = cohorts.reduce((acc, c) => ({
      workers: acc.workers + c.totalWorkers,
      active: acc.active + c.activePolicies,
      expired: acc.expired + c.expiredPolicies,
      renewed: acc.renewed + c.renewedPolicies,
    }), { workers: 0, active: 0, expired: 0, renewed: 0 });
    const engaged = t.active + t.expired;
    return {
      ...t,
      retentionRate: engaged > 0 ? Math.round((t.active / engaged) * 100) : 0,
      churnRate: engaged > 0 ? Math.round(((engaged - t.active) / engaged) * 100) : 0,
      renewalRate: t.expired > 0 ? Math.round((t.renewed / t.expired) * 100) : 0,
    };
  }, [cohorts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis = [
    { label: 'Total Workers', value: totals.workers, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Retention Rate', value: `${totals.retentionRate}%`, icon: ArrowUpRight, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Churn Rate', value: `${totals.churnRate}%`, icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Renewal Rate', value: `${totals.renewalRate}%`, icon: RefreshCw, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="shadow-card">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="font-display text-2xl font-bold">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Segment Selector */}
      <Tabs value={segmentBy} onValueChange={(v) => setSegmentBy(v as any)}>
        <TabsList>
          <TabsTrigger value="city">By City</TabsTrigger>
          <TabsTrigger value="platform">By Platform</TabsTrigger>
          <TabsTrigger value="tier">By Tier</TabsTrigger>
        </TabsList>

        <TabsContent value={segmentBy} className="mt-4 space-y-6">
          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Retention & Churn Bar Chart */}
            <Card className="shadow-card overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-display">Retention vs Churn by {segmentBy}</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <div style={{ minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={cohorts} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="segment" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        formatter={(v: number) => `${v}%`}
                      />
                      <Legend />
                      <Bar dataKey="retentionRate" name="Retention %" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="churnRate" name="Churn %" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Renewal Rate Chart */}
            <Card className="shadow-card overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-display">Policy Renewal Rate by {segmentBy}</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <div style={{ minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={cohorts} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="segment" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        formatter={(v: number) => `${v}%`}
                      />
                      <Bar dataKey="renewalRate" name="Renewal %" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Worker Distribution Pie + Avg Premium */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="shadow-card overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-display">Worker Distribution by {segmentBy}</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <div style={{ minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={cohorts.map(c => ({ name: c.segment, value: c.totalWorkers }))}
                        cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                        dataKey="value" paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {cohorts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-display">Avg Premium by {segmentBy}</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <div style={{ minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={cohorts} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="segment" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `₹${v}`} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        formatter={(v: number) => `₹${v}/week`}
                      />
                      <Bar dataKey="avgPremium" name="Avg Premium" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Cohort Breakdown</CardTitle>
              <CardDescription>Segmented by {segmentBy} — retention, churn & renewal metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{segmentBy === 'city' ? 'City' : segmentBy === 'platform' ? 'Platform' : 'Tier'}</TableHead>
                    <TableHead>Workers</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Expired</TableHead>
                    <TableHead>Renewed</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead>Churn</TableHead>
                    <TableHead>Renewal</TableHead>
                    <TableHead>Avg Premium</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohorts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No data available yet
                      </TableCell>
                    </TableRow>
                  )}
                  {cohorts.map(c => (
                    <TableRow key={c.segment}>
                      <TableCell className="font-medium">{c.segment}</TableCell>
                      <TableCell>{c.totalWorkers}</TableCell>
                      <TableCell>{c.activePolicies}</TableCell>
                      <TableCell>{c.expiredPolicies}</TableCell>
                      <TableCell>{c.renewedPolicies}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.retentionRate >= 70 ? 'bg-secondary/10 text-secondary border-secondary/20' : c.retentionRate >= 40 ? 'bg-accent/10 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                          {c.retentionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.churnRate <= 30 ? 'bg-secondary/10 text-secondary border-secondary/20' : c.churnRate <= 60 ? 'bg-accent/10 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                          {c.churnRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.renewalRate >= 60 ? 'bg-secondary/10 text-secondary border-secondary/20' : c.renewalRate >= 30 ? 'bg-accent/10 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                          {c.renewalRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>₹{c.avgPremium}/wk</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
