
-- ============================================
-- GigShield Database Schema
-- ============================================

-- 1. Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.policy_tier AS ENUM ('BASIC', 'STANDARD', 'PRO');
CREATE TYPE public.policy_status AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE public.claim_status AS ENUM ('approved', 'processing', 'flagged', 'rejected');
CREATE TYPE public.trigger_type AS ENUM ('RAIN_HEAVY', 'RAIN_EXTREME', 'HEAT_EXTREME', 'AQI_SEVERE', 'CURFEW_LOCAL', 'STORM_CYCLONE');
CREATE TYPE public.payout_status AS ENUM ('pending', 'completed', 'failed');

-- 2. Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. User Roles Table (security-critical, separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Zones Table
CREATE TABLE public.zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Zones are publicly readable"
  ON public.zones FOR SELECT USING (true);

CREATE POLICY "Admins can manage zones"
  ON public.zones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Workers Table (profile for gig workers)
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  platform TEXT NOT NULL DEFAULT 'Zomato',
  city TEXT NOT NULL DEFAULT 'Mumbai',
  zone_id TEXT REFERENCES public.zones(id),
  shield_score INTEGER NOT NULL DEFAULT 50,
  weekly_earnings NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view their own profile"
  ON public.workers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Workers can update their own profile"
  ON public.workers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Workers can insert their own profile"
  ON public.workers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all workers"
  ON public.workers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all workers"
  ON public.workers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Policies Table
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  tier policy_tier NOT NULL DEFAULT 'STANDARD',
  premium NUMERIC NOT NULL,
  max_payout NUMERIC NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  status policy_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view their own policies"
  ON public.policies FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.workers WHERE workers.id = policies.worker_id AND workers.user_id = auth.uid())
  );

CREATE POLICY "Workers can create their own policies"
  ON public.policies FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workers WHERE workers.id = policies.worker_id AND workers.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all policies"
  ON public.policies FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Incidents Table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT REFERENCES public.zones(id) NOT NULL,
  trigger_type trigger_type NOT NULL,
  severity INTEGER NOT NULL DEFAULT 70,
  weather_data JSONB,
  is_simulated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Incidents are readable by authenticated users"
  ON public.incidents FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage incidents"
  ON public.incidents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Claims Table
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE NOT NULL,
  incident_id UUID REFERENCES public.incidents(id),
  trigger_type trigger_type NOT NULL,
  amount NUMERIC NOT NULL,
  status claim_status NOT NULL DEFAULT 'processing',
  fraud_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  fraud_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view their own claims"
  ON public.claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.policies p
      JOIN public.workers w ON w.id = p.worker_id
      WHERE p.id = claims.policy_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all claims"
  ON public.claims FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Payouts Table
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  upi_id TEXT,
  status payout_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view their own payouts"
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      JOIN public.policies p ON p.id = c.policy_id
      JOIN public.workers w ON w.id = p.worker_id
      WHERE c.id = payouts.claim_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payouts"
  ON public.payouts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Weather Readings (time-series data)
CREATE TABLE public.weather_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT REFERENCES public.zones(id) NOT NULL,
  temperature DOUBLE PRECISION,
  rainfall DOUBLE PRECISION,
  humidity DOUBLE PRECISION,
  wind_speed DOUBLE PRECISION,
  aqi INTEGER,
  raw_data JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weather_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weather readings are readable by authenticated users"
  ON public.weather_readings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage weather readings"
  ON public.weather_readings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for time-series queries
CREATE INDEX idx_weather_readings_zone_time
  ON public.weather_readings (zone_id, recorded_at DESC);

-- 11. Auto-create worker profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workers (user_id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New Worker'),
    NEW.phone
  );
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
