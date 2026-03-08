import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Brain, CloudRain, Flame, Wind, AlertTriangle,
  TrendingUp, Shield, RefreshCw, Loader2, MapPin, Calendar, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface DailyRisk {
  day: string;
  risk_level: number;
  event: string;
}

interface ZoneForecast {
  zone_id: string;
  zone_name: string;
  city: string;
  overall_risk: 'low' | 'moderate' | 'high' | 'critical';
  risk_score: number;
  primary_threat: string;
  secondary_threat?: string;
  peak_risk_day?: string;
  estimated_affected_workers?: number;
  estimated_claims_inr?: number;
  ai_summary: string;
  daily_risk: DailyRisk[];
}

const riskConfig = {
  low: { color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20', icon: Shield },
  moderate: { color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20', icon: AlertTriangle },
  high: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', icon: Flame },
  critical: { color: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/30', icon: CloudRain },
};

const threatIcons: Record<string, string> = {
  rain: '🌧️', flood: '🌊', heat: '🔥', aqi: '💨', storm: '🌀', cyclone: '🌀',
  fog: '🌫️', thunder: '⛈️', dust: '🏜️', default: '⚠️',
};

function getThreatIcon(threat: string) {
  const lower = threat.toLowerCase();
  for (const [key, icon] of Object.entries(threatIcons)) {
    if (lower.includes(key)) return icon;
  }
  return threatIcons.default;
}

export default function PredictionsPage() {
  const [forecasts, setForecasts] = useState<ZoneForecast[]>([]);
  const [platformSummary, setPlatformSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<ZoneForecast | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [workerCity, setWorkerCity] = useState<string | null>(null);
  const [workerZoneId, setWorkerZoneId] = useState<string | null>(null);

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch worker's city and zone
      let city: string | null = null;
      if (user) {
        const { data: worker } = await supabase
          .from('workers')
          .select('city, zone_id')
          .eq('user_id', user.id)
          .single();
        if (worker) {
          setWorkerCity(worker.city);
          setWorkerZoneId(worker.zone_id);
          city = worker.city;
        }
      }

      // Pass worker's city so AI only analyzes their region
      const { data, error } = await supabase.functions.invoke('ai-predict', {
        body: { type: 'zone_detailed_forecast', data: { city } },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setForecasts(data?.forecasts || []);
      setPlatformSummary(data?.platform_summary || '');
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Forecast error:', e);
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, []);

  // Sort: worker's exact zone first, then by risk score
  const myZoneForecasts = [...forecasts].sort((a, b) => {
    if (workerZoneId && a.zone_id === workerZoneId) return -1;
    if (workerZoneId && b.zone_id === workerZoneId) return 1;
    return b.risk_score - a.risk_score;
  });

  const highRiskCount = myZoneForecasts.filter(f => f.overall_risk === 'high' || f.overall_risk === 'critical').length;
  const totalEstClaims = myZoneForecasts.reduce((s, f) => s + (f.estimated_claims_inr || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link to="/worker"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h1 className="font-display font-bold">AI Risk Forecast</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Platform Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-card overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    7-Day Risk Forecast {workerCity && <Badge variant="outline" className="ml-1 text-xs">{workerCity}</Badge>}
                  </CardTitle>
                  <CardDescription>AI-powered weather disruption forecasts for your zone</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchForecasts}
                  disabled={loading}
                  className="shrink-0"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span className="ml-1 hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {loading ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground animate-pulse">🤖 AI analyzing weather patterns, historical incidents, and seasonal data...</p>
                </div>
              ) : (
                <>
                  {/* KPI Row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                     <p className="font-display font-bold text-xl">{myZoneForecasts.length}</p>
                      <p className="text-[10px] text-muted-foreground">Your Zones</p>
                    </div>
                    <div className="p-3 rounded-lg bg-destructive/5 text-center">
                      <p className="font-display font-bold text-xl text-destructive">{highRiskCount}</p>
                      <p className="text-[10px] text-muted-foreground">Disruptions</p>
                    </div>
                    <div className="p-3 rounded-lg bg-accent/5 text-center">
                      <p className="font-display font-bold text-xl text-accent">₹{(totalEstClaims / 1000).toFixed(0)}K</p>
                      <p className="text-[10px] text-muted-foreground">Est. Claims</p>
                    </div>
                  </div>

                  {/* City Summary */}
                  {platformSummary && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
                      <p className="text-xs font-medium text-primary mb-1">🤖 AI {workerCity || 'City'} Assessment</p>
                      <p className="text-sm text-foreground/80">{platformSummary}</p>
                    </div>
                  )}

                  {lastUpdated && (
                    <p className="text-[10px] text-muted-foreground">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Risk Overview Chart */}
        {!loading && myZoneForecasts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Disruption Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(120, myZoneForecasts.length * 40)}>
                  <BarChart data={myZoneForecasts} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis type="category" dataKey="zone_name" tick={{ fontSize: 10 }} width={80} className="text-muted-foreground" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as ZoneForecast;
                        return (
                          <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs">
                            <p className="font-medium">{d.zone_name}</p>
                            <p>Risk: {d.risk_score}/100</p>
                            <p>Threat: {d.primary_threat}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="risk_score" radius={[0, 4, 4, 0]}>
                      {myZoneForecasts.map((f, i) => (
                        <Cell
                          key={i}
                          className={
                            f.risk_score >= 70 ? 'fill-destructive' :
                            f.risk_score >= 40 ? 'fill-accent' :
                            'fill-secondary'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Your City Zone Forecast Cards */}
        {myZoneForecasts.length > 0 && workerCity && (
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Your city: {workerCity}
          </p>
        )}
        <div className="space-y-3">
          {myZoneForecasts.map((forecast, i) => {
            const config = riskConfig[forecast.overall_risk] || riskConfig.moderate;
            const RiskIcon = config.icon;
            return (
              <motion.div
                key={forecast.zone_id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Card
                  className={cn(
                    'shadow-card cursor-pointer transition-all hover:shadow-elevated border-l-4',
                    config.border
                  )}
                  onClick={() => setSelectedZone(selectedZone?.zone_id === forecast.zone_id ? null : forecast)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getThreatIcon(forecast.primary_threat)}</span>
                        <div>
                          <p className="font-medium text-sm">{forecast.zone_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{forecast.city}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(config.bg, config.color, config.border, 'text-xs')}>
                          <RiskIcon className="w-3 h-3 mr-1" />
                          {forecast.overall_risk}
                        </Badge>
                        <span className={cn('font-display font-bold text-lg', config.color)}>
                          {forecast.risk_score}
                        </span>
                      </div>
                    </div>

                    {/* Risk bar */}
                    <div className="mb-3">
                      <Progress
                        value={forecast.risk_score}
                        className="h-2"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>🎯 {forecast.primary_threat}</span>
                      {forecast.peak_risk_day && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />Peak: {forecast.peak_risk_day}
                        </span>
                      )}
                      {forecast.estimated_claims_inr != null && (
                        <span>₹{forecast.estimated_claims_inr.toLocaleString('en-IN')} est.</span>
                      )}
                    </div>

                    {/* Expanded Detail */}
                    {selectedZone?.zone_id === forecast.zone_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 pt-4 border-t border-border/50 space-y-4"
                      >
                        {/* AI Summary */}
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <p className="text-xs font-medium text-primary mb-1">🤖 AI Analysis</p>
                          <p className="text-sm">{forecast.ai_summary}</p>
                        </div>

                        {/* Daily Risk Chart */}
                        {forecast.daily_risk?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">7-Day Risk Trend</p>
                            <ResponsiveContainer width="100%" height={120}>
                              <AreaChart data={forecast.daily_risk}>
                                <defs>
                                  <linearGradient id={`riskGrad-${forecast.zone_id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="day" tick={{ fontSize: 9 }} className="text-muted-foreground" />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} width={25} className="text-muted-foreground" />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload as DailyRisk;
                                    return (
                                      <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs">
                                        <p className="font-medium">{d.day}</p>
                                        <p>Risk: {d.risk_level}/100</p>
                                        <p>{d.event}</p>
                                      </div>
                                    );
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="risk_level"
                                  stroke="hsl(var(--primary))"
                                  fill={`url(#riskGrad-${forecast.zone_id})`}
                                  strokeWidth={2}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Threat Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {forecast.secondary_threat && (
                            <div className="p-2 rounded-lg bg-muted/50">
                              <p className="text-muted-foreground">Secondary Threat</p>
                              <p className="font-medium">{getThreatIcon(forecast.secondary_threat)} {forecast.secondary_threat}</p>
                            </div>
                          )}
                          {forecast.estimated_affected_workers && (
                            <div className="p-2 rounded-lg bg-muted/50">
                              <p className="text-muted-foreground">Est. Affected Workers</p>
                              <p className="font-medium flex items-center gap-1">
                                <Users className="w-3 h-3" />{forecast.estimated_affected_workers}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>



        {!loading && forecasts.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No forecast data available. Add zones to start getting predictions.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
