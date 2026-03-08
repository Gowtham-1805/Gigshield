import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Smartphone, IndianRupee, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sendMockWhatsAppPayout } from '@/lib/whatsapp-mock';

interface PayoutSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  upiId: string;
  claimType: string;
  workerName: string;
}

type PayoutStage = 'initiating' | 'verifying' | 'processing' | 'completed';

export function PayoutSimulator({ isOpen, onClose, amount, upiId, claimType, workerName }: PayoutSimulatorProps) {
  const [stage, setStage] = useState<PayoutStage>('initiating');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStage('initiating');
      return;
    }

    // Generate mock transaction ID
    setTransactionId(`GS${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`);

    // Simulate payout stages
    const timers = [
      setTimeout(() => setStage('verifying'), 1200),
      setTimeout(() => setStage('processing'), 2400),
      setTimeout(() => {
        setStage('completed');
        sendMockWhatsAppPayout(amount);
      }, 4000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  const stageConfig = {
    initiating: { icon: '🔐', label: 'Initiating secure transfer...', color: 'text-primary' },
    verifying: { icon: '🔍', label: 'Verifying claim & fraud check...', color: 'text-accent' },
    processing: { icon: '💸', label: 'Processing UPI transfer...', color: 'text-secondary' },
    completed: { icon: '✅', label: 'Payout Successful!', color: 'text-secondary' },
  };

  const currentConfig = stageConfig[stage];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-sm"
          >
            <Card className="border-0 shadow-elevated overflow-hidden">
              {/* Header - Razorpay-style */}
              <div className="bg-gradient-to-r from-primary to-primary/80 p-4 relative overflow-hidden">
                <div className="absolute inset-0 pattern-grid opacity-10" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <IndianRupee className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white/70 text-xs">GigShield Instant Payout</p>
                      <p className="text-white font-bold text-sm">UPI Transfer</p>
                    </div>
                  </div>
                  {stage === 'completed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Amount Display */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-center"
                >
                  <p className="text-muted-foreground text-sm mb-1">Payout Amount</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-4xl font-display font-bold">₹{amount.toLocaleString()}</span>
                  </div>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {claimType.replace('_', ' ')}
                  </Badge>
                </motion.div>

                {/* Transfer Animation */}
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-lg gradient-shield flex items-center justify-center">
                        <span className="text-sm">🛡️</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">GigShield</span>
                  </div>

                  <div className="flex-1 flex items-center justify-center relative">
                    <div className="h-0.5 w-full bg-border absolute" />
                    <motion.div
                      initial={{ x: -30 }}
                      animate={{ x: stage === 'completed' ? 30 : [-30, 30] }}
                      transition={stage === 'completed' ? { duration: 0 } : { 
                        duration: 1,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                      className="relative z-10 w-6 h-6 rounded-full bg-secondary flex items-center justify-center shadow-md"
                    >
                      {stage === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <ArrowRight className="w-3 h-3 text-white" />
                      )}
                    </motion.div>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-secondary" />
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{upiId}</span>
                  </div>
                </div>

                {/* Status */}
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className={`flex items-center justify-center gap-2 ${currentConfig.color}`}>
                    {stage !== 'completed' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span className="text-lg">{currentConfig.icon}</span>
                    <span className="font-medium text-sm">{currentConfig.label}</span>
                  </div>
                </motion.div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2">
                  {(['initiating', 'verifying', 'processing', 'completed'] as PayoutStage[]).map((s, i) => {
                    const stages: PayoutStage[] = ['initiating', 'verifying', 'processing', 'completed'];
                    const currentIndex = stages.indexOf(stage);
                    const stepIndex = stages.indexOf(s);
                    const isComplete = stepIndex <= currentIndex;
                    return (
                      <motion.div
                        key={s}
                        initial={{ scale: 0.5 }}
                        animate={{ scale: isComplete ? 1 : 0.8 }}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          isComplete ? 'bg-secondary' : 'bg-muted'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Transaction Details - Only show when completed */}
                <AnimatePresence>
                  {stage === 'completed' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Recipient</span>
                          <span className="font-medium">{workerName}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">UPI ID</span>
                          <span className="font-medium font-mono text-xs">{upiId}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Transaction ID</span>
                          <span className="font-medium font-mono text-xs">{transactionId}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Time</span>
                          <span className="font-medium text-xs">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-secondary/20">
                          <span className="text-muted-foreground">Status</span>
                          <Badge className="bg-secondary/10 text-secondary border-0">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Credited
                          </Badge>
                        </div>
                      </div>

                      <Button
                        onClick={onClose}
                        className="w-full gradient-shield text-primary-foreground border-0"
                      >
                        Done
                      </Button>

                      <p className="text-center text-[10px] text-muted-foreground">
                        Simulated payment • Powered by GigShield + Razorpay Test Mode
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
