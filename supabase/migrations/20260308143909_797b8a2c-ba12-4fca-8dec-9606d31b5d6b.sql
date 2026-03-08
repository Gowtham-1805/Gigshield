
-- Appeals table
CREATE TABLE public.appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(claim_id)
);

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

-- Workers can view their own appeals
CREATE POLICY "Workers can view own appeals" ON public.appeals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Workers can insert their own appeals
CREATE POLICY "Workers can create appeals" ON public.appeals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins manage all appeals" ON public.appeals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated at trigger
CREATE TRIGGER update_appeals_updated_at
  BEFORE UPDATE ON public.appeals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for evidence photos
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', true);

-- Storage policies
CREATE POLICY "Users can upload evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Evidence is publicly readable" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'evidence');

-- Enable realtime for appeals
ALTER PUBLICATION supabase_realtime ADD TABLE public.appeals;
