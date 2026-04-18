-- ═══ Package Reviews ═══
CREATE TABLE IF NOT EXISTS package_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  package_id UUID,
  photographer_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ Photographer Reviews ═══
CREATE TABLE IF NOT EXISTS photographer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  photographer_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pkg_reviews_photographer ON package_reviews(photographer_id);
CREATE INDEX IF NOT EXISTS idx_pkg_reviews_booking ON package_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_photo_reviews_photographer ON photographer_reviews(photographer_id);
CREATE INDEX IF NOT EXISTS idx_photo_reviews_booking ON photographer_reviews(booking_id);

-- RLS
ALTER TABLE package_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read package reviews" ON package_reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert their own package reviews" ON package_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update their own package reviews" ON package_reviews FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Anyone can read photographer reviews" ON photographer_reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert their own photographer reviews" ON photographer_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update their own photographer reviews" ON photographer_reviews FOR UPDATE USING (auth.uid() = customer_id);
