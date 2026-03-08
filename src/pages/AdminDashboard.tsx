import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, LayoutDashboard, FileText, AlertTriangle, Map, TrendingUp,
  DollarSign, Zap, ChevronLeft, ChevronRight, Bell, User, Menu, LogOut, Eye, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { mockFinancials } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
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
  { icon: Users, label: 'Workers', id: 'workers' },
  { icon: Zap, label: 'Demo Trigger', id: 'demo' },
];

export default function AdminDashboard() {
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
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-sidebar transition-all duration-300 hidden md:flex flex-col shrink-0 relative`}>
        <div className="absolute inset-0 bg-gradient-to-b from-sidebar-accent/20 to-transparent pointer-events-none" />
        <div className="h-16 flex items-center px-4 gap-3 border-b border-sidebar-border relative z-10">
          <div className="w-9 h-9 rounded-xl gradient-shield flex items-center justify-center shrink-0 shadow-glow-blue">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          {sidebarOpen && <span className="font-display font-bold text-sidebar-foreground tracking-tight">GigShield</span>}
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2 relative z-10">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium shadow-sm'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? 'text-sidebar-primary' : ''}`} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 text-sidebar-foreground/40 hover:text-sidebar-foreground border-t border-sidebar-border transition-colors relative z-10"
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="font-display font-bold text-lg tracking-tight">
              {sidebarItems.find(s => s.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-card" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out" className="text-muted-foreground hover:text-foreground">
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
              {activeTab === 'workers' && <WorkersTab />}
              {activeTab === 'demo' && <DemoTriggerPanel />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: { totalWorkers: number; activePolicies: number; claimsThisWeek: number; lossRatio: number; totalPremium: number; totalClaims: number } }) {
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
    { label: 'Active Workers', value: stats.totalWorkers.toLocaleString(), icon: User, color: 'text-primary' },
    { label: 'Active Policies', value: stats.activePolicies.toLocaleString(), icon: Shield, color: 'text-secondary' },
    { label: 'Claims This Week', value: stats.claimsThisWeek.toString(), icon: FileText, color: 'text-accent' },
    { label: 'Loss Ratio', value: `${stats.lossRatio}%`, icon: TrendingUp, positive: stats.lossRatio < 70, color: stats.lossRatio < 70 ? 'text-secondary' : 'text-destructive' },
    { label: 'Premium Collected', value: `₹${(stats.totalPremium / 1000).toFixed(1)}K`, icon: DollarSign, color: 'text-primary' },
    { label: 'Claims Paid', value: `₹${(stats.totalClaims / 1000).toFixed(1)}K`, icon: Zap, color: 'text-accent' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
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
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  useEffect(() => {
    const fetchClaims = async () => {
      let query = supabase.from('claims').select(`
        *,
        policies!inner(worker_id, tier, workers!inner(name, zone_id, zones(name)))
      `).order('created_at', { ascending: false }).limit(50);

      if (filter !== 'all') {
        query = query.eq('status', filter as "approved" | "processing" | "flagged" | "rejected");
      }

      const { data } = await query;
      setClaims(data || []);
    };
    fetchClaims();
  }, [filter]);

  const handleStatusChange = async (claimId: string, newStatus: string) => {
    await supabase.from('claims').update({ status: newStatus as any }).eq('id', claimId);
    setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: newStatus } : c));
    setSelectedClaim((prev: any) => prev ? { ...prev, status: newStatus } : null);
    toast.success(`Claim ${newStatus}`);
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display">Claims Management</CardTitle>
          <CardDescription>Real-time claims from the database — click a row to drill down</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All ({claims.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="flagged">Flagged</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
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
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No claims yet. Use the Demo Trigger to simulate events.</TableCell></TableRow>
                  )}
                  {claims.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedClaim(row)}>
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
                          row.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-accent/10 text-accent border-accent/20'
                        }>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell><Eye className="w-4 h-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Claim Drill-Down Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Claim Details</DialogTitle>
            <DialogDescription>Full breakdown of this claim</DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Worker</p>
                  <p className="font-medium">{selectedClaim.policies?.workers?.name || 'Unknown'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Zone</p>
                  <p className="font-medium">{selectedClaim.policies?.workers?.zones?.name || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Trigger</p>
                  <p className="font-medium">{selectedClaim.trigger_type}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-display font-bold text-lg">₹{Number(selectedClaim.amount).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Fraud Score</p>
                  <p className={`font-bold text-lg ${selectedClaim.fraud_score > 0.5 ? 'text-destructive' : selectedClaim.fraud_score > 0.2 ? 'text-accent' : 'text-secondary'}`}>
                    {(selectedClaim.fraud_score * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Policy Tier</p>
                  <p className="font-medium">{selectedClaim.policies?.tier}</p>
                </div>
              </div>

              {/* Fraud Details */}
              {selectedClaim.fraud_details && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Fraud Check Breakdown</p>
                  <div className="space-y-1.5 text-sm">
                    {Object.entries(selectedClaim.fraud_details as Record<string, any>).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{typeof val === 'number' ? `${(val * 100).toFixed(0)}%` : String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                <p className="text-sm">Created: {new Date(selectedClaim.created_at).toLocaleString()}</p>
                <p className="text-sm">Updated: {new Date(selectedClaim.updated_at).toLocaleString()}</p>
              </div>

              {/* Admin Actions */}
              <div className="flex gap-2 pt-2">
                {selectedClaim.status !== 'approved' && (
                  <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => handleStatusChange(selectedClaim.id, 'approved')}>
                    ✅ Approve
                  </Button>
                )}
                {selectedClaim.status !== 'rejected' && (
                  <Button size="sm" variant="destructive" onClick={() => handleStatusChange(selectedClaim.id, 'rejected')}>
                    ❌ Reject
                  </Button>
                )}
                {selectedClaim.status !== 'flagged' && (
                  <Button size="sm" variant="outline" className="border-accent text-accent" onClick={() => handleStatusChange(selectedClaim.id, 'flagged')}>
                    🚩 Flag
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
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
  const [claimsByType, setClaimsByType] = useState<{ name: string; value: number }[]>([]);
  const [claimsByStatus, setClaimsByStatus] = useState<{ name: string; value: number }[]>([]);
  const [dailyClaims, setDailyClaims] = useState<{ date: string; count: number; amount: number }[]>([]);

  const COLORS = ['hsl(221, 83%, 53%)', 'hsl(160, 84%, 39%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(280, 60%, 55%)', 'hsl(190, 70%, 45%)'];

  useEffect(() => {
    // Fetch AI predictions
    supabase.functions.invoke('ai-predict', { body: { type: 'zone_predictions' } })
      .then(({ data }) => {
        if (data?.predictions) setPredictions(data.predictions);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch claims analytics
    supabase.from('claims').select('trigger_type, status, amount, created_at').then(({ data }) => {
      if (!data) return;

      // By type
      const typeMap: Record<string, number> = {};
      data.forEach(c => { typeMap[c.trigger_type] = (typeMap[c.trigger_type] || 0) + 1; });
      setClaimsByType(Object.entries(typeMap).map(([name, value]) => ({ name, value })));

      // By status
      const statusMap: Record<string, number> = {};
      data.forEach(c => { statusMap[c.status] = (statusMap[c.status] || 0) + 1; });
      setClaimsByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      // Daily claims (last 7 days)
      const days: Record<string, { count: number; amount: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        days[d] = { count: 0, amount: 0 };
      }
      data.forEach(c => {
        const d = c.created_at.split('T')[0];
        if (days[d]) {
          days[d].count++;
          days[d].amount += Number(c.amount);
        }
      });
      setDailyClaims(Object.entries(days).map(([date, v]) => ({ date: date.slice(5), ...v })));
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Claims by Trigger Type</CardTitle>
          </CardHeader>
          <CardContent>
            {claimsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={claimsByType} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.replace(/_/g, ' ')} ${(percent * 100).toFixed(0)}%`}>
                    {claimsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No claims data yet</p>}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Daily Claims (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyClaims}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Claims" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Claims by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {claimsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={claimsByStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {claimsByStatus.map((entry, i) => (
                      <Cell key={i} fill={
                        entry.name === 'approved' ? 'hsl(160, 84%, 39%)' :
                        entry.name === 'flagged' ? 'hsl(0, 84%, 60%)' :
                        entry.name === 'rejected' ? 'hsl(0, 60%, 45%)' :
                        'hsl(38, 92%, 50%)'
                      } />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No claims data yet</p>}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Daily Disbursement (₹)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyClaims}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => `₹${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ fill: 'hsl(var(--secondary))' }} name="Amount" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Predictions */}
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
  const [financials, setFinancials] = useState<{ month: string; premium: number; claims: number }[]>([]);
  const [viability, setViability] = useState<{
    totalPremium: number; totalClaims: number; margin: number; marginPct: number;
    lossRatio: number; avgClaimAmount: number; claimRate: number; totalWorkers: number;
    projectedMonthlyMargin: number;
  } | null>(null);

  useEffect(() => {
    const fetchFinancials = async () => {
      const [policiesRes, claimsRes, workersRes] = await Promise.all([
        supabase.from('policies').select('premium, created_at'),
        supabase.from('claims').select('amount, status, created_at'),
        supabase.from('workers').select('id', { count: 'exact', head: true }),
      ]);

      const monthMap: Record<string, { premium: number; claims: number }> = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      (policiesRes.data || []).forEach(p => {
        const m = months[new Date(p.created_at).getMonth()];
        if (!monthMap[m]) monthMap[m] = { premium: 0, claims: 0 };
        monthMap[m].premium += Number(p.premium);
      });

      const approvedClaims = (claimsRes.data || []).filter(c => c.status === 'approved');
      approvedClaims.forEach(c => {
        const m = months[new Date(c.created_at).getMonth()];
        if (!monthMap[m]) monthMap[m] = { premium: 0, claims: 0 };
        monthMap[m].claims += Number(c.amount);
      });

      const data = Object.keys(monthMap).length > 0
        ? Object.entries(monthMap).map(([month, v]) => ({ month, ...v }))
        : mockFinancials;
      setFinancials(data);

      // Calculate viability metrics
      const totalPremium = (policiesRes.data || []).reduce((s, p) => s + Number(p.premium), 0);
      const totalClaimsAmt = approvedClaims.reduce((s, c) => s + Number(c.amount), 0);
      const totalWorkers = workersRes.count || 0;
      const margin = totalPremium - totalClaimsAmt;
      const marginPct = totalPremium > 0 ? Math.round((margin / totalPremium) * 100) : 0;
      const lossRatio = totalPremium > 0 ? Math.round((totalClaimsAmt / totalPremium) * 100) : 0;
      const avgClaimAmount = approvedClaims.length > 0 ? Math.round(totalClaimsAmt / approvedClaims.length) : 0;
      const claimRate = totalWorkers > 0 ? Math.round((approvedClaims.length / totalWorkers) * 100) : 0;
      const weeksOfData = Math.max(1, Object.keys(monthMap).length * 4);
      const weeklyMargin = margin / weeksOfData;
      const projectedMonthlyMargin = Math.round(weeklyMargin * 4);

      setViability({
        totalPremium, totalClaims: totalClaimsAmt, margin, marginPct,
        lossRatio, avgClaimAmount, claimRate, totalWorkers, projectedMonthlyMargin,
      });
    };
    fetchFinancials();
  }, []);

  return (
    <div className="space-y-6">
      {/* Viability KPIs */}
      {viability && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Premium', value: `₹${(viability.totalPremium / 1000).toFixed(1)}K`, color: 'text-primary' },
            { label: 'Total Claims Paid', value: `₹${(viability.totalClaims / 1000).toFixed(1)}K`, color: 'text-destructive' },
            { label: 'Operating Margin', value: `₹${(viability.margin / 1000).toFixed(1)}K (${viability.marginPct}%)`, color: viability.margin > 0 ? 'text-secondary' : 'text-destructive' },
            { label: 'Loss Ratio', value: `${viability.lossRatio}%`, color: viability.lossRatio < 70 ? 'text-secondary' : viability.lossRatio < 90 ? 'text-accent' : 'text-destructive' },
            { label: 'Avg Claim Amount', value: `₹${viability.avgClaimAmount}`, color: 'text-foreground' },
            { label: 'Claim Rate', value: `${viability.claimRate}% of workers`, color: 'text-foreground' },
            { label: 'Active Workers', value: viability.totalWorkers.toString(), color: 'text-primary' },
            { label: 'Projected Monthly Margin', value: `₹${(viability.projectedMonthlyMargin / 1000).toFixed(1)}K`, color: viability.projectedMonthlyMargin > 0 ? 'text-secondary' : 'text-destructive' },
          ].map((kpi, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`font-display font-bold text-lg ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Viability Model Card */}
      {viability && viability.totalWorkers > 0 && (
        <Card className="shadow-card border-primary/20">
          <CardHeader>
            <CardTitle className="font-display text-base">📊 Financial Viability Model (Weekly)</CardTitle>
            <CardDescription>Projected at current scale of {viability.totalWorkers} workers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Avg premium/worker:</span><span className="font-medium">₹{viability.totalWorkers > 0 ? Math.round(viability.totalPremium / viability.totalWorkers) : 0}/wk</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Claim rate:</span><span className="font-medium">{viability.claimRate}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avg payout/claim:</span><span className="font-medium">₹{viability.avgClaimAmount}</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Weekly premium pool:</span><span className="font-medium text-primary">₹{(viability.totalPremium / 1000).toFixed(1)}K</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Weekly claims:</span><span className="font-medium text-destructive">₹{(viability.totalClaims / 1000).toFixed(1)}K</span></div>
                <div className="flex justify-between border-t border-border pt-2"><span className="font-medium">Operating margin:</span><span className={`font-bold ${viability.margin > 0 ? 'text-secondary' : 'text-destructive'}`}>₹{(viability.margin / 1000).toFixed(1)}K ({viability.marginPct}%)</span></div>
              </div>
            </div>
            {viability.totalWorkers > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <strong>At 10K workers scale:</strong> Weekly premium ₹{((viability.totalPremium / viability.totalWorkers) * 10000 / 100000).toFixed(1)}L, 
                Est. claims ₹{((viability.totalClaims / Math.max(1, viability.totalWorkers)) * 10000 / 100000).toFixed(1)}L, 
                Monthly margin ₹{(((viability.totalPremium - viability.totalClaims) / viability.totalWorkers) * 10000 * 4 / 100000).toFixed(1)}L
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display">Premium vs Claims — Monthly</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={financials}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => `₹${v.toLocaleString()}`} />
              <Legend />
              <Area type="monotone" dataKey="premium" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Premium Collected" />
              <Area type="monotone" dataKey="claims" stackId="2" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.2)" name="Claims Paid" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkersTab() {
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('workers').select('*, zones(name)').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setWorkers(data || []));
  }, []);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Registered Workers</CardTitle>
        <CardDescription>All workers on the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Shield Score</TableHead>
              <TableHead>Weekly Earnings</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No workers yet</TableCell></TableRow>
            )}
            {workers.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.name}</TableCell>
                <TableCell><Badge variant="outline">{w.platform}</Badge></TableCell>
                <TableCell>{w.city}</TableCell>
                <TableCell>{w.zones?.name || 'N/A'}</TableCell>
                <TableCell>
                  <span className={w.shield_score >= 70 ? 'text-secondary font-medium' : w.shield_score >= 40 ? 'text-accent' : 'text-destructive'}>
                    {w.shield_score}
                  </span>
                </TableCell>
                <TableCell>₹{Number(w.weekly_earnings).toLocaleString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
