import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, LayoutDashboard, FileText, AlertTriangle, Map, TrendingUp,
  DollarSign, Zap, ChevronLeft, ChevronRight, Bell, User, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import {
  mockAdminStats, mockClaimsData, mockFraudAlerts, mockPredictions,
  mockFinancials, zones, triggerTypes
} from '@/lib/mock-data';
import { useLanguage } from '@/lib/language-context';
import { LanguageToggle } from '@/components/LanguageToggle';
import AdminZoneMap from '@/components/AdminZoneMap';
import FraudNetworkGraph from '@/components/FraudNetworkGraph';
import DemoTriggerPanel from '@/components/DemoTriggerPanel';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const stats = mockAdminStats;

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
        {/* Top bar */}
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
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
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

function OverviewTab({ stats }: { stats: typeof mockAdminStats }) {
  const kpis = [
    { label: 'Active Workers', value: stats.totalWorkers.toLocaleString(), change: `+${stats.workerGrowth}%`, icon: User, positive: true },
    { label: 'Active Policies', value: stats.activePolicies.toLocaleString(), icon: Shield, positive: true },
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
                  {kpi.change && (
                    <Badge variant="outline" className={kpi.positive ? 'text-secondary border-secondary/20 bg-secondary/5' : 'text-destructive border-destructive/20 bg-destructive/5'}>
                      {kpi.change}
                    </Badge>
                  )}
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
            <CardTitle className="text-base font-display">Claims Heatmap (This Week)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mockClaimsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="claims" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Next Week Predictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockPredictions.map((pred) => (
              <div key={pred.city} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{pred.city}</p>
                  <p className="text-xs text-muted-foreground">{pred.event}</p>
                </div>
                <div className="text-right">
                  <Badge className={pred.probability > 60 ? 'bg-destructive/10 text-destructive border-destructive/20' : pred.probability > 30 ? 'bg-accent/10 text-accent border-accent/20' : 'bg-secondary/10 text-secondary border-secondary/20'} variant="outline">
                    {pred.probability}% chance
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Est: ₹{(pred.estClaims / 1000).toFixed(0)}K</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClaimsTab() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Claims Management</CardTitle>
        <CardDescription>Auto-approved, pending, and flagged claims</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All (342)</TabsTrigger>
            <TabsTrigger value="approved">Approved (310)</TabsTrigger>
            <TabsTrigger value="pending">Pending (24)</TabsTrigger>
            <TabsTrigger value="flagged">Flagged (8)</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
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
                {[
                  { worker: 'Raju K.', zone: 'Mumbai-Andheri', trigger: '🌧️ Heavy Rain', amount: 600, fraud: 0.08, status: 'approved' },
                  { worker: 'Priya S.', zone: 'Mumbai-Bandra', trigger: '🌧️ Heavy Rain', amount: 600, fraud: 0.92, status: 'flagged' },
                  { worker: 'Amit D.', zone: 'Delhi-CP', trigger: '😷 AQI Severe', amount: 400, fraud: 0.15, status: 'approved' },
                  { worker: 'Neha R.', zone: 'Chennai-Anna', trigger: '🌀 Cyclone', amount: 600, fraud: 0.05, status: 'approved' },
                  { worker: 'Vikram L.', zone: 'Mumbai-Powai', trigger: '🌧️ Heavy Rain', amount: 450, fraud: 0.34, status: 'pending' },
                ].map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.worker}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>{row.trigger}</TableCell>
                    <TableCell>₹{row.amount}</TableCell>
                    <TableCell>
                      <span className={row.fraud > 0.5 ? 'text-destructive font-bold' : row.fraud > 0.2 ? 'text-accent' : 'text-secondary'}>
                        {(row.fraud * 100).toFixed(0)}%
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
          <CardTitle className="font-display">Fraud Alerts</CardTitle>
          <CardDescription>Anomaly detection and flagged workers</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Anomaly Score</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockFraudAlerts.map((alert) => (
                <TableRow key={alert.workerId}>
                  <TableCell className="font-medium">{alert.name} ({alert.workerId})</TableCell>
                  <TableCell>{alert.type}</TableCell>
                  <TableCell>{alert.zone}</TableCell>
                  <TableCell>
                    <span className={alert.score > 0.7 ? 'text-destructive font-bold' : 'text-accent'}>
                      {(alert.score * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      alert.severity === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      alert.severity === 'medium' ? 'bg-accent/10 text-accent border-accent/20' :
                      'bg-muted text-muted-foreground'
                    }>
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{alert.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display">Predictive Analytics — Next Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockPredictions.map((pred) => (
              <Card key={pred.city} className={pred.probability > 60 ? 'border-destructive/30 bg-destructive/5' : ''}>
                <CardContent className="p-4 text-center">
                  <p className="font-display font-bold text-lg">{pred.city}</p>
                  <p className="text-3xl font-display font-bold mt-2 mb-1" style={{ color: pred.probability > 60 ? 'hsl(var(--destructive))' : pred.probability > 30 ? 'hsl(var(--accent))' : 'hsl(var(--secondary))' }}>
                    {pred.probability}%
                  </p>
                  <p className="text-xs text-muted-foreground">{pred.event}</p>
                  <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    <p>Est. claims: ₹{(pred.estClaims / 100000).toFixed(1)}L</p>
                    <p>Reserve: ₹{(pred.reserve / 100000).toFixed(1)}L</p>
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
