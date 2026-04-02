
-- Device fingerprints table for multi-signal triangulation
CREATE TABLE public.device_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  device_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  platform TEXT,
  has_touch BOOLEAN DEFAULT false,
  has_accelerometer BOOLEAN DEFAULT false,
  canvas_hash TEXT,
  wifi_bssid TEXT,
  cell_tower_id TEXT,
  signals JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fraud signals table for storing analysis results
CREATE TABLE public.fraud_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  signal_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Anti-spoofing analysis results table
CREATE TABLE public.spoofing_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  gps_confidence DOUBLE PRECISION DEFAULT 0,
  triangulation_score DOUBLE PRECISION DEFAULT 0,
  behavioral_score DOUBLE PRECISION DEFAULT 0,
  device_integrity_score DOUBLE PRECISION DEFAULT 0,
  temporal_cluster_flag BOOLEAN DEFAULT false,
  network_ring_flag BOOLEAN DEFAULT false,
  overall_spoof_probability DOUBLE PRECISION DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  soft_hold_expires_at TIMESTAMP WITH TIME ZONE,
  trust_tier TEXT NOT NULL DEFAULT 'standard',
  analysis_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spoofing_analysis ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can manage all
CREATE POLICY "Admins manage device_fingerprints" ON public.device_fingerprints FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers can insert own fingerprints" ON public.device_fingerprints FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.workers WHERE workers.id = device_fingerprints.worker_id AND workers.user_id = auth.uid()));

CREATE POLICY "Admins manage fraud_signals" ON public.fraud_signals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers view own fraud_signals" ON public.fraud_signals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.workers WHERE workers.id = fraud_signals.worker_id AND workers.user_id = auth.uid()));

CREATE POLICY "Admins manage spoofing_analysis" ON public.spoofing_analysis FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers view own spoofing_analysis" ON public.spoofing_analysis FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.workers WHERE workers.id = spoofing_analysis.worker_id AND workers.user_id = auth.uid()));

-- Add soft_hold to claim_status enum
ALTER TYPE public.claim_status ADD VALUE IF NOT EXISTS 'soft_hold';

-- Index for temporal clustering queries
CREATE INDEX idx_claims_created_zone ON public.claims (created_at, trigger_type);
CREATE INDEX idx_device_fingerprints_hash ON public.device_fingerprints (device_hash);
CREATE INDEX idx_fraud_signals_worker ON public.fraud_signals (worker_id, signal_type);
CREATE INDEX idx_spoofing_analysis_claim ON public.spoofing_analysis (claim_id);
