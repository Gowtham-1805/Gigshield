import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check, AlertTriangle, Shield, DollarSign, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { Tables } from '@/integrations/supabase/types';

const triggerTypeOptions = [
  { id: 'RAIN_HEAVY', label: 'Heavy Rainfall', icon: '🌧️' },
  { id: 'RAIN_EXTREME', label: 'Extreme Rain', icon: '🌊' },
  { id: 'HEAT_EXTREME', label: 'Extreme Heat', icon: '🔥' },
  { id: 'AQI_SEVERE', label: 'Severe AQI', icon: '😷' },
  { id: 'CURFEW_LOCAL', label: 'Local Curfew', icon: '🚫' },
  { id: 'STORM_CYCLONE', label: 'Cyclone', icon: '🌀' },
];

interface Step {
  id: string;
  label: string;
  icon: typeof Zap;
  detail: string;
  status: 'pending' | 'active' | 'done';
}

export default function DemoTriggerPanel() {
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [severity, setSeverity] = useState([70]);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [zones, setZones] = useState<Tables<'zones'>[]>([]);

  useEffect(() => {
    supabase.from('zones').select('*').then(({ data }) => setZones(data || []));
  }, []);

  const fireTrigger = async () => {
    const zone = zones.find(z => z.id === selectedZone);
    const trigger = triggerTypeOptions.find(t => t.id === selectedTrigger);
    if (!zone || !trigger) return;

    setRunning(true);

    const pipelineSteps: Step[] = [
      { id: '1', label: 'Incident Created', icon: AlertTriangle, detail: `${trigger.label} detected in ${zone.name}`, status: 'pending' },
      { id: '2', label: 'Scanning Workers (Zone + GPS)', icon: Search, detail: `Finding registered & GPS-nearby workers in ${zone.name}...`, status: 'pending' },
      { id: '3', label: 'Auto-Initiating Claims', icon: Zap, detail: 'Processing claims...', status: 'pending' },
      { id: '4', label: 'Fraud Checks Running', icon: Shield, detail: 'GPS validation, weather confirm, anomaly scoring', status: 'pending' },
      { id: '5', label: 'Claims Approved', icon: Check, detail: 'Evaluating results...', status: 'pending' },
      { id: '6', label: 'Payouts Initiated', icon: DollarSign, detail: 'Disbursing via UPI...', status: 'pending' },
    ];

    setSteps(pipelineSteps);

    // Animate first 2 steps
    for (let i = 0; i < 2; i++) {
      await new Promise(r => setTimeout(r, 600));
      setSteps(prev => prev.map((s, j) => ({ ...s, status: j <= i ? 'done' : j === i + 1 ? 'active' : 'pending' })));
    }

    // Call edge function
    try {
      const { data, error } = await supabase.functions.invoke('fire-trigger', {
        body: { zone_id: selectedZone, trigger_type: selectedTrigger, severity: severity[0] },
      });

      if (error) throw error;

      // Animate remaining steps with real data
      await new Promise(r => setTimeout(r, 500));
      const eligibility = data.eligibility || {};
      setSteps(prev => prev.map((s, j) => {
        if (j === 1) return { ...s, status: 'done', detail: `${eligibility.registered_workers || 0} registered + ${eligibility.gps_nearby_workers || 0} GPS-nearby (${eligibility.gps_radius_km || 10}km radius)` };
        if (j === 2) return { ...s, status: 'done', detail: `${data.claims_created} claims initiated` };
        if (j === 3) return { ...s, status: 'active' };
        return s;
      }));

      await new Promise(r => setTimeout(r, 700));
      setSteps(prev => prev.map((s, j) => {
        if (j === 3) return { ...s, status: 'done' };
        if (j === 4) return { ...s, status: 'done', detail: `${data.approved} approved, ${data.flagged} flagged` };
        if (j === 5) return { ...s, status: 'active' };
        return s;
      }));

      await new Promise(r => setTimeout(r, 500));
      setSteps(prev => prev.map((s, j) => {
        if (j === 5) return { ...s, status: 'done', detail: `₹${data.total_disbursed?.toLocaleString()} disbursed to ${data.payouts_created} workers` };
        return { ...s, status: 'done' };
      }));

      toast.success(`Trigger complete! ${data.claims_created} claims, ₹${data.total_disbursed?.toLocaleString()} disbursed`);
    } catch (e: any) {
      toast.error(e.message || 'Trigger failed');
      setSteps(prev => prev.map(s => s.status === 'pending' || s.status === 'active' ? { ...s, status: 'done', detail: 'Error: ' + (e.message || 'Failed') } : s));
    }

    setRunning(false);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-accent/30">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Live Demo Trigger
          </CardTitle>
          <CardDescription>Simulate a weather event and watch the end-to-end claim flow in real-time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Zone</label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger><SelectValue placeholder="Choose a zone" /></SelectTrigger>
                <SelectContent>
                  {zones.map(z => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trigger Type</label>
              <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
                <SelectTrigger><SelectValue placeholder="Choose trigger" /></SelectTrigger>
                <SelectContent>
                  {triggerTypeOptions.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity: {severity[0]}%</label>
              <Slider value={severity} onValueChange={setSeverity} min={10} max={100} step={5} className="mt-3" />
            </div>
          </div>

          <Button
            onClick={fireTrigger}
            disabled={!selectedZone || !selectedTrigger || running}
            className="w-full h-14 text-lg gradient-danger text-primary-foreground border-0 hover:opacity-90"
            size="lg"
          >
            {running ? '⏳ Processing...' : '🔥 Fire Trigger'}
          </Button>
        </CardContent>
      </Card>

      {/* Pipeline visualization */}
      <AnimatePresence>
        {steps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-base">Claim Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <motion.div
                      key={step.id}
                      className="flex items-start gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                          step.status === 'done' ? 'bg-secondary text-secondary-foreground' :
                          step.status === 'active' ? 'bg-accent text-accent-foreground animate-pulse' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          <step.icon className="w-5 h-5" />
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`w-0.5 h-8 transition-colors duration-300 ${
                            step.status === 'done' ? 'bg-secondary' : 'bg-border'
                          }`} />
                        )}
                      </div>
                      <div className="pt-2">
                        <p className={`font-medium text-sm ${step.status === 'active' ? 'text-accent' : step.status === 'done' ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{step.detail}</p>
                      </div>
                      {step.status === 'done' && (
                        <Badge className="bg-secondary/10 text-secondary border-secondary/20 ml-auto mt-2" variant="outline">✓ Done</Badge>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
