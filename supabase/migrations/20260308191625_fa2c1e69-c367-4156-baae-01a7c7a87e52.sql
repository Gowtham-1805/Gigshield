ALTER TABLE public.workers 
  ADD COLUMN IF NOT EXISTS last_lat double precision,
  ADD COLUMN IF NOT EXISTS last_lng double precision,
  ADD COLUMN IF NOT EXISTS last_location_at timestamp with time zone;