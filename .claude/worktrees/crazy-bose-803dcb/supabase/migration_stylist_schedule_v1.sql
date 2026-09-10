-- Stylist Scheduling Table
-- Prevents double-booking by enforcing unique constraint on (stylist_id, date, time_slot)

CREATE TABLE IF NOT EXISTS public.stylist_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked','cancelled','completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint to prevent double-booking
  UNIQUE(stylist_id, date, time_slot)
);

-- Enable Row Level Security
ALTER TABLE public.stylist_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Public can view stylist schedules (for availability display)
CREATE POLICY "stylist_schedules_public_read"
  ON public.stylist_schedules
  FOR SELECT
  USING (true);

-- RLS Policy 2: Stylists can manage their own schedules
CREATE POLICY "stylist_schedules_self_manage"
  ON public.stylist_schedules
  FOR ALL
  USING (auth.uid() = stylist_id)
  WITH CHECK (auth.uid() = stylist_id);

-- RLS Policy 3: Booking system can insert/update schedules
CREATE POLICY "stylist_schedules_booking_system"
  ON public.stylist_schedules
  FOR INSERT
  WITH CHECK (true);

-- Index for date-based queries (most common use case)
CREATE INDEX IF NOT EXISTS idx_stylist_schedule_date
  ON public.stylist_schedules(stylist_id, date);

-- Index for booking lookups
CREATE INDEX IF NOT EXISTS idx_stylist_schedule_booking
  ON public.stylist_schedules(booking_id)
  WHERE booking_id IS NOT NULL;

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_stylist_schedule_status
  ON public.stylist_schedules(stylist_id, status, date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stylist_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stylist_schedule_updated_at
  BEFORE UPDATE ON public.stylist_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_stylist_schedule_timestamp();