
-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('weather', 'claim', 'payout');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: Users can update (mark read) their own notifications
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: System can insert notifications (via triggers with SECURITY DEFINER)
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS: Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function: auto-create notifications when an incident is created
CREATE OR REPLACE FUNCTION public.notify_on_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify all workers in the affected zone
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  SELECT
    w.user_id,
    'weather'::notification_type,
    '⚠️ Weather Alert: ' || REPLACE(NEW.trigger_type::text, '_', ' '),
    'Severity ' || NEW.severity || '/100 detected in your zone. Your coverage is active.',
    jsonb_build_object('incident_id', NEW.id, 'trigger_type', NEW.trigger_type, 'severity', NEW.severity, 'zone_id', NEW.zone_id)
  FROM public.workers w
  WHERE w.zone_id = NEW.zone_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_incident
AFTER INSERT ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_incident();

-- Function: auto-create notifications when a claim status changes
CREATE OR REPLACE FUNCTION public.notify_on_claim_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get the worker's user_id
  SELECT w.user_id INTO v_user_id
  FROM public.policies p
  JOIN public.workers w ON w.id = p.worker_id
  WHERE p.id = NEW.policy_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'approved' THEN
      v_title := '✅ Claim Approved';
      v_message := 'Your claim for ₹' || NEW.amount || ' has been approved! Payout processing.';
    WHEN 'flagged' THEN
      v_title := '🚩 Claim Flagged';
      v_message := 'Your claim for ₹' || NEW.amount || ' has been flagged for review.';
    WHEN 'rejected' THEN
      v_title := '❌ Claim Rejected';
      v_message := 'Your claim for ₹' || NEW.amount || ' has been rejected.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    v_user_id,
    'claim'::notification_type,
    v_title,
    v_message,
    jsonb_build_object('claim_id', NEW.id, 'status', NEW.status, 'amount', NEW.amount, 'trigger_type', NEW.trigger_type)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_claim_update
AFTER UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_claim_update();

-- Function: auto-create notifications when a payout status changes
CREATE OR REPLACE FUNCTION public.notify_on_payout_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT w.user_id INTO v_user_id
  FROM public.claims c
  JOIN public.policies p ON p.id = c.policy_id
  JOIN public.workers w ON w.id = p.worker_id
  WHERE c.id = NEW.claim_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'completed' THEN
      v_title := '💰 Payout Completed';
      v_message := '₹' || NEW.amount || ' has been credited to your UPI!';
    WHEN 'failed' THEN
      v_title := '⚠️ Payout Failed';
      v_message := 'Payout of ₹' || NEW.amount || ' failed. We will retry.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    v_user_id,
    'payout'::notification_type,
    v_title,
    v_message,
    jsonb_build_object('payout_id', NEW.id, 'claim_id', NEW.claim_id, 'status', NEW.status, 'amount', NEW.amount)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_payout_update
AFTER UPDATE ON public.payouts
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_payout_update();
