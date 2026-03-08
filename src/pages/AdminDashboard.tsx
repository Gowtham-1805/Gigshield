import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, LayoutDashboard, FileText, AlertTriangle, Map, TrendingUp,
  DollarSign, Zap, ChevronLeft, ChevronRight, Bell, User, Menu, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { mockFinancials } from '@/lib/mock-data';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { LanguageToggle } from '@/components/LanguageToggle';
import AdminZoneMap from '@/components/AdminZoneMap';
import FraudNetworkGraph from '@/components/FraudNetworkGraph';
import DemoTriggerPanel from '@/components/DemoTriggerPanel';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Overview', id: 'overview' },
  { icon: FileText, label: 'Claims', id: 'claims' },
  { icon: AlertTriangle, label: 'Fraud', id: 'fraud' },
  { icon: Map, label: 'Zone Map', id: 'map' },
  { icon: TrendingUp, label: 'Analytics', id: 'analytics' },
  { icon: DollarSign, label: 'Financial', id: 'financial' },
  { icon: Zap, label: 'Demo Trigger', id: 'demo' },
];

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({ totalWorkers: 0, activePolicies: 0, claimsThisWeek: 0, lossRatio: 0, totalPremium: 0, totalClaims: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [workersRes, policiesRes, claimsRes] = await Promise.all([
        supabase.from('workers').select('id', { count: 'exact', head: true }),
        supabase.from('policies').select('id, premium', { count: 'exact' }).eq('status', 'active'),
        supabase.from('claims').select('id, amount, status, created_at'),
      ]);

      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const weekClaims = (claimsRes.data || []).filter(c => c.created_at > weekAgo);
      const totalClaimAmt = (claimsRes.data || []).reduce((s, c) => s + Number(c.amount), 0);
      const totalPremium = (policiesRes.data || []).reduce((s, p) => s + Number(p.premium), 0);

      setStats({
        totalWorkers: workersRes.count || 0,
        activePolicies: policiesRes.count || 0,
        claimsThisWeek: weekClaims.length,
        lossRatio: totalPremium > 0 ? Math.round((totalClaimAmt / totalPremium) * 100) : 0,
        totalPremium,
        totalClaims: totalClaimAmt,
      });
    };
    fetchStats();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-sidebar border-r border-sidebar-border transition-all duration-300 hidden md:flex flex-col shrink-0`}>
        <div className="h-16 flex items-center px-4 gap-3 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg gradient-shield flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          {sidebarOpen && <span className="font-display font-bold text-sidebar-foreground">GigShield</span>}
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === item.id
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 text-sidebar-foreground/50 hover:text-sidebar-foreground border-t border-sidebar-border"
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="font-display font-semibold text-lg">
              {sidebarItems.find(s => s.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {activeTab === 'overview' && <OverviewTab stats={stats} />}
              {activeTab === 'claims' && <ClaimsTab />}
              {activeTab === 'fraud' && <FraudTab />}
              {activeTab === 'map' && <AdminZoneMap />}
              {activeTab === 'analytics' && <AnalyticsTab />}
              {activeTab === 'financial' && <FinancialTab />}
              {activeTab === 'demo' && <DemoTriggerPanel />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: { totalWorkers: number; activePolicies: number; claimsThisWeek: number; lossRatio: number } }) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoadingPredictions(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-predict', {
          body: { type: 'zone_predictions' },
        });
        if (data?.predictions) setPredictions(data.predictions);
      } catch (e) {
        console.error('Predictions error:', e);
      }
      setLoadingPredictions(false);
    };
    fetchPredictions();
  }, []);

  const kpis = [
    { label: 'Active Workers', value: stats.totalWorkers.toLocaleString(), icon: User },
    { label: 'Active Policies', value: stats.activePolicies.toLocaleString(), icon: Shield },
    { label: 'Claims This Week', value: stats.claimsThisWeek.toString(), icon: FileText },
    { label: 'Loss Ratio', value: `${stats.lossRatio}%`, icon: TrendingUp, positive: stats.lossRatio < 70 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <kpi.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-display text-2xl font-bold">{kpi.value}</p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">AI-Powered Next Week Predictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingPredictions && <p className="text-sm text-muted-foreground animate-pulse">🤖 AI analyzing zone data...</p>}
            {predictions.map((pred: any) => (
              <div key={pred.city} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{pred.city}</p>
                  <p className="text-xs text-muted-foreground">{pred.event}</p>
                </div>
                <div className="text-right">
                  <Badge className={pred.probability > 60 ? 'bg-destructive/10 text-destructive border-destructive/20' : pred.probability > 30 ? 'bg-accent/10 text-accent border-accent/20' : 'bg-secondary/10 text-secondary border-secondary/20'} variant="outline">
                    {pred.probability}% chance
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Est: ₹{(pred.estimated_claims_inr / 1000).toFixed(0)}K</p>
                </div>
              </div>
            ))}
            {!loadingPredictions && predictions.length === 0 && (
              <p className="text-sm text-muted-foreground">No predictions available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Use the Demo Trigger panel to simulate weather events and test the claim pipeline end-to-end.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClaimsTab() {
  const [claims, setClaims] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchClaims = async () => {
      let query = supabase.from('claims').select(`
        *,
        policies!inner(worker_id, tier, workers!inner(name, zone_id, zones(name)))
      `).order('created_at', { ascending: false }).limit(50);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setClaims(data || []);
    };
    fetchClaims();
  }, [filter]);

  const counts = { all: claims.length, approved: 0, processing: 0, flagged: 0 };
  claims.forEach(c => { if (c.status in counts) counts[c.status as keyof typeof counts]++; });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Claims Management</CardTitle>
        <CardDescription>Real-time claims from the database</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="flagged">Flagged</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fraud Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No claims yet. Use the Demo Trigger to simulate events.</TableCell></TableRow>
                )}
                {claims.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{(row as any).policies?.workers?.name || 'Unknown'}</TableCell>
                    <TableCell>{(row as any).policies?.workers?.zones?.name || 'N/A'}</TableCell>
                    <TableCell>{row.trigger_type}</TableCell>
                    <TableCell>₹{Number(row.amount)}</TableCell>
                    <TableCell>
                      <span className={row.fraud_score > 0.5 ? 'text-destructive font-bold' : row.fraud_score > 0.2 ? 'text-accent' : 'text-secondary'}>
                        {(row.fraud_score * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        row.status === 'approved' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                        row.status === 'flagged' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-accent/10 text-accent border-accent/20'
                      }>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function FraudTab() {
  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display">Fraud Detection</CardTitle>
          <CardDescription>Claims flagged by the multi-layer fraud engine</CardDescription>
        </CardHeader>
        <CardContent>
          <FlaggedClaimsTable />
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display">Network Fraud Detection</CardTitle>
          <CardDescription>Graph showing shared devices, UPI accounts, and correlated claims</CardDescription>
        </CardHeader>
        <CardContent>
          <FraudNetworkGraph />
        </CardContent>
      </Card>
    </div>
  );
}

function FlaggedClaimsTable() {
  const [flagged, setFlagged] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('claims').select('*, policies!inner(workers!inner(name, zone_id))')
      .eq('status', 'flagged')
      .order('fraud_score', { ascending: false })
      .limit(20)
      .then(({ data }) => setFlagged(data || []));
  }, []);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Worker</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead>Fraud Score</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flagged.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No flagged claims</TableCell></TableRow>
        )}
        {flagged.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{(c as any).policies?.workers?.name || 'Unknown'}</TableCell>
            <TableCell>{c.trigger_type}</TableCell>
            <TableCell><span className="text-destructive font-bold">{(c.fraud_score * 100).toFixed(0)}%</span></TableCell>
            <TableCell>₹{Number(c.amount)}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AnalyticsTab() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.functions.invoke('ai-predict', { body: { type: 'zone_predictions' } })
      .then(({ data }) => {
        if (data?.predictions) setPredictions(data.predictions);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display">AI Predictive Analytics — Next Week</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-muted-foreground animate-pulse">🤖 Generating predictions...</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {predictions.map((pred: any) => (
              <Card key={pred.city} className={pred.probability > 60 ? 'border-destructive/30 bg-destructive/5' : ''}>
                <CardContent className="p-4 text-center">
                  <p className="font-display font-bold text-lg">{pred.city}</p>
                  <p className="text-3xl font-display font-bold mt-2 mb-1" style={{ color: pred.probability > 60 ? 'hsl(var(--destructive))' : pred.probability > 30 ? 'hsl(var(--accent))' : 'hsl(var(--secondary))' }}>
                    {pred.probability}%
                  </p>
                  <p className="text-xs text-muted-foreground">{pred.event}</p>
                  <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    <p>Est. claims: ₹{((pred.estimated_claims_inr || 0) / 100000).toFixed(1)}L</p>
                    <p>Reserve: ₹{((pred.reserve_needed_inr || 0) / 100000).toFixed(1)}L</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FinancialTab() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Premium vs Claims — Monthly</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={mockFinancials}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => `₹${v.toLocaleString()}`} />
            <Area type="monotone" dataKey="premium" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
            <Area type="monotone" dataKey="claims" stackId="2" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.2)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" /> Premium Collected
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" /> Claims Paid
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
