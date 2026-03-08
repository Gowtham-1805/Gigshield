
-- Remove the overly permissive insert policy and replace with user_id check
DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can receive notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
