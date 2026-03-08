import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check, AlertTriangle, Shield, DollarSign, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { zones, triggerTypes } from '@/lib/mock-data';

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

  const fireTrigger = async () => {
    const zone = zones.find(z => z.id === selectedZone);
    const trigger = triggerTypes.find(t => t.id === selectedTrigger);
    if (!zone || !trigger) return;

    const pipelineSteps: Step[] = [
      { id: '1', label: 'Incident Created', icon: AlertTriangle, detail: `${trigger.label} detected in ${zone.name}`, status: 'pending' },
      { id: '2', label: 'Affected Workers Identified', icon: Search, detail: `45 active policies in ${zone.name}`, status: 'pending' },
      { id: '3', label: 'Auto-Initiating Claims', icon: Zap, detail: '45 claims initiated', status: 'pending' },
      { id: '4', label: 'Fraud Checks Running', icon: Shield, detail: 'GPS validation, multi-source weather confirm, anomaly scoring', status: 'pending' },
      { id: '5', label: 'Claims Approved', icon: Check, detail: '43 approved, 2 flagged for review', status: 'pending' },
      { id: '6', label: 'Payouts Initiated', icon: DollarSign, detail: '₹25,800 disbursed via UPI to 43 workers', status: 'pending' },
    ];

    setSteps(pipelineSteps);
    setRunning(true);

    for (let i = 0; i < pipelineSteps.length; i++) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
      setSteps(prev => prev.map((s, j) => ({
        ...s,
        status: j < i ? 'done' : j === i ? 'active' : 'pending',
      })));
      await new Promise(r => setTimeout(r, 400));
      setSteps(prev => prev.map((s, j) => ({
        ...s,
        status: j <= i ? 'done' : j === i + 1 ? 'active' : 'pending',
      })));
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
                  {triggerTypes.map(t => (
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
