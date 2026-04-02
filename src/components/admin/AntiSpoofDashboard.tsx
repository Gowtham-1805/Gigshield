import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Fingerprint, Clock, Network, MapPin, Smartphone, Activity, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SpoofAnalysis {
  id: string;
  claim_id: string;
  worker_id: string;
  gps_confidence: number;
  triangulation_score: number;
  behavioral_score: number;
  device_integrity_score: number;
  temporal_cluster_flag: boolean;
  network_ring_flag: boolean;
  overall_spoof_probability: number;
  verification_status: string;
  soft_hold_expires_at: string | null;
  trust_tier: string;
  analysis_details: any;
  created_at: string;
}

interface FraudSignal {
  id: string;
  claim_id: string;
  worker_id: string;
  signal_type: string;
  severity: string;
  score: number;
  details: any;
  resolved: boolean;
  created_at: string;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  platinum: { label: 'Platinum', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: '💎' },
  gold: { label: 'Gold', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: '🥇' },
  standard: { label: 'Standard', color: 'bg-muted text-muted-foreground border-border', icon: '🔵' },
  probation: { label: 'Probation', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: '⚠️' },
};

const SIGNAL_ICONS: Record<string, string> = {
  gps_spoofing_app: '📍',
  no_accelerometer: '📱',
  stationary_device: '🏠',
  shared_device: '📲',
  timezone_mismatch: '🕐',
  gps_zone_mismatch: '🗺️',
  temporal_cluster: '⏱️',
  uniform_timing: '🤖',
  network_collusion: '🕸️',
  high_claim_frequency: '📈',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-accent/10 text-accent border-accent/20',
  low: 'bg-muted text-muted-foreground border-border',
};

export default function AntiSpoofDashboard() {
  const [analyses, setAnalyses] = useState<SpoofAnalysis[]>([]);
  const [signals, setSignals] = useState<FraudSignal[]>([]);
  const [selected, setSelected] = useState<SpoofAnalysis | null>(null);
  const [selectedSignals, setSelectedSignals] = useState<FraudSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [analysisRes, signalsRes] = await Promise.all([
        supabase.from('spoofing_analysis').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('fraud_signals').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      setAnalyses((analysisRes.data as any) || []);
      setSignals((signalsRes.data as any) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const stats = {
    totalScans: analyses.length,
    softHolds: analyses.filter(a => a.verification_status === 'soft_hold').length,
    flagged: analyses.filter(a => a.verification_status === 'flagged').length,
    cleared: analyses.filter(a => a.verification_status === 'cleared').length,
    avgSpoof: analyses.length > 0 ? analyses.reduce((s, a) => s + a.overall_spoof_probability, 0) / analyses.length : 0,
    criticalSignals: signals.filter(s => s.severity === 'critical' && !s.resolved).length,
    temporalClusters: analyses.filter(a => a.temporal_cluster_flag).length,
    networkRings: analyses.filter(a => a.network_ring_flag).length,
  };

  const handleResolve = async (analysisId: string, action: 'clear' | 'reject') => {
    const analysis = analyses.find(a => a.id === analysisId);
    if (!analysis) return;

    const newStatus = action === 'clear' ? 'approved' : 'rejected';
    await supabase.from('claims').update({ status: newStatus as any }).eq('id', analysis.claim_id);
    await supabase.from('spoofing_analysis').update({ verification_status: action === 'clear' ? 'cleared' : 'flagged' }).eq('id', analysisId);

    setAnalyses(prev => prev.map(a => a.id === analysisId ? { ...a, verification_status: action === 'clear' ? 'cleared' : 'flagged' } : a));
    setSelected(null);
    toast.success(`Claim ${newStatus}`);
  };

  const openDetail = (a: SpoofAnalysis) => {
    setSelected(a);
    setSelectedSignals(signals.filter(s => s.claim_id === a.claim_id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading anti-spoofing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans', value: stats.totalScans, icon: Fingerprint, color: 'text-primary' },
          { label: 'Soft Holds', value: stats.softHolds, icon: Clock, color: 'text-accent' },
          { label: 'Flagged', value: stats.flagged, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Cleared', value: stats.cleared, icon: CheckCircle2, color: 'text-secondary' },
          { label: 'Avg Spoof %', value: `${(stats.avgSpoof * 100).toFixed(1)}%`, icon: TrendingDown, color: 'text-accent' },
          { label: 'Critical Signals', value: stats.criticalSignals, icon: XCircle, color: 'text-destructive' },
          { label: 'Temporal Clusters', value: stats.temporalClusters, icon: Activity, color: 'text-orange-500' },
          { label: 'Network Rings', value: stats.networkRings, icon: Network, color: 'text-purple-500' },
        ].map((kpi, i) => (
          <Card key={i} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="font-display text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analysis Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Anti-Spoofing Analysis Log
          </CardTitle>
          <CardDescription>Multi-signal verification results with trust tier classification</CardDescription>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Fingerprint className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No anti-spoofing analyses yet.</p>
              <p className="text-xs mt-1">Claims will be analyzed automatically when filed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trust Tier</TableHead>
                  <TableHead>Spoof Prob.</TableHead>
                  <TableHead>GPS</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Temporal</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.map((a) => {
                  const tier = TIER_CONFIG[a.trust_tier] || TIER_CONFIG.standard;
                  return (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(a)}>
                      <TableCell>
                        <Badge variant="outline" className={tier.color}>
                          {tier.icon} {tier.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={a.overall_spoof_probability > 0.6 ? 'text-destructive font-bold' : a.overall_spoof_probability > 0.3 ? 'text-accent' : 'text-secondary'}>
                          {(a.overall_spoof_probability * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>{(a.gps_confidence * 100).toFixed(0)}%</TableCell>
                      <TableCell>{(a.device_integrity_score * 100).toFixed(0)}%</TableCell>
                      <TableCell>{a.temporal_cluster_flag ? <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px]">⚠ Cluster</Badge> : '✓'}</TableCell>
                      <TableCell>{a.network_ring_flag ? <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px]">🕸 Ring</Badge> : '✓'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          a.verification_status === 'cleared' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                          a.verification_status === 'soft_hold' ? 'bg-accent/10 text-accent border-accent/20' :
                          'bg-destructive/10 text-destructive border-destructive/20'
                        }>
                          {a.verification_status === 'soft_hold' ? '⏳ Soft Hold' : a.verification_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fraud Signals Summary */}
      {signals.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Active Fraud Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {signals.filter(s => !s.resolved).slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{SIGNAL_ICONS[s.signal_type] || '⚡'}</span>
                    <div>
                      <p className="text-sm font-medium">{s.signal_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      <p className="text-xs text-muted-foreground">{s.details?.reason || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={SEVERITY_COLORS[s.severity]}>
                      {s.severity}
                    </Badge>
                    <span className="text-sm font-mono">{(s.score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Anti-Spoofing Analysis
            </DialogTitle>
            <DialogDescription>Multi-signal verification breakdown</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Trust Tier */}
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Trust Tier</p>
                <Badge variant="outline" className={`text-base px-4 py-1 ${TIER_CONFIG[selected.trust_tier]?.color}`}>
                  {TIER_CONFIG[selected.trust_tier]?.icon} {TIER_CONFIG[selected.trust_tier]?.label}
                </Badge>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Triangulation Scores</p>
                {[
                  { label: 'GPS Confidence', value: selected.gps_confidence, icon: MapPin },
                  { label: 'Triangulation', value: selected.triangulation_score, icon: Network },
                  { label: 'Device Integrity', value: selected.device_integrity_score, icon: Smartphone },
                  { label: 'Behavioral', value: selected.behavioral_score, icon: Activity },
                ].map((metric) => (
                  <div key={metric.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <metric.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        {metric.label}
                      </span>
                      <span className={`font-medium ${metric.value < 0.4 ? 'text-destructive' : metric.value < 0.7 ? 'text-accent' : 'text-secondary'}`}>
                        {(metric.value * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={metric.value * 100} className="h-2" />
                  </div>
                ))}
              </div>

              {/* Flags */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg ${selected.temporal_cluster_flag ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-muted/50'}`}>
                  <p className="text-xs text-muted-foreground">Temporal Cluster</p>
                  <p className={`font-bold ${selected.temporal_cluster_flag ? 'text-orange-500' : 'text-secondary'}`}>
                    {selected.temporal_cluster_flag ? '⚠ Detected' : '✓ Clear'}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${selected.network_ring_flag ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-muted/50'}`}>
                  <p className="text-xs text-muted-foreground">Network Ring</p>
                  <p className={`font-bold ${selected.network_ring_flag ? 'text-purple-500' : 'text-secondary'}`}>
                    {selected.network_ring_flag ? '🕸 Detected' : '✓ Clear'}
                  </p>
                </div>
              </div>

              {/* Overall */}
              <div className={`p-4 rounded-lg text-center ${selected.overall_spoof_probability > 0.6 ? 'bg-destructive/10' : selected.overall_spoof_probability > 0.3 ? 'bg-accent/10' : 'bg-secondary/10'}`}>
                <p className="text-xs text-muted-foreground">Overall Spoof Probability</p>
                <p className={`font-display text-3xl font-bold ${selected.overall_spoof_probability > 0.6 ? 'text-destructive' : selected.overall_spoof_probability > 0.3 ? 'text-accent' : 'text-secondary'}`}>
                  {(selected.overall_spoof_probability * 100).toFixed(1)}%
                </p>
              </div>

              {/* Soft Hold Info */}
              {selected.soft_hold_expires_at && (
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-xs text-accent font-medium">⏳ Soft Hold Active</p>
                  <p className="text-sm">Expires: {new Date(selected.soft_hold_expires_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Claim is held for verification — not rejected. Worker can submit additional evidence.</p>
                </div>
              )}

              {/* Signals */}
              {selectedSignals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Detection Signals ({selectedSignals.length})</p>
                  <div className="space-y-2">
                    {selectedSignals.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                        <span>{SIGNAL_ICONS[s.signal_type] || '⚡'} {s.signal_type.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className={SEVERITY_COLORS[s.severity]} >{s.severity} · {(s.score * 100).toFixed(0)}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              {(selected.verification_status === 'soft_hold' || selected.verification_status === 'flagged') && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 flex-1" onClick={() => handleResolve(selected.id, 'clear')}>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Clear & Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleResolve(selected.id, 'reject')}>
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
