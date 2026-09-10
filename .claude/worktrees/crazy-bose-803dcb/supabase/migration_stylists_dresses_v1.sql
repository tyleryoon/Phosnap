-- Migration: Stylists, Dress Items, and Photo Delivery Features
-- Created: 2026-04-12
-- Description: Adds stylists, stylist_services, dress_items tables with RLS policies and indexes
--              Updates bookings table with delivery columns

-- ============================================================================
-- 1. STYLISTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stylists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name_ko TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  name_zh TEXT,
  specialty TEXT, -- e.g. 'makeup', 'hair', 'both'
  description TEXT,
  phone TEXT,
  instagram TEXT,
  portfolio_images TEXT[] DEFAULT '{}',
  location_id TEXT,
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for stylists
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stylists are viewable by everyone" ON stylists
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own stylist profile" ON stylists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Stylists can update their own profile" ON stylists
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Stylists can delete their own profile" ON stylists
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for stylists
CREATE INDEX IF NOT EXISTS idx_stylists_user_id ON stylists(user_id);
CREATE INDEX IF NOT EXISTS idx_stylists_location_id ON stylists(location_id);
CREATE INDEX IF NOT EXISTS idx_stylists_is_active ON stylists(is_active);

-- ============================================================================
-- 2. STYLIST_SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stylist_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  name_zh TEXT,
  price INT NOT NULL DEFAULT 0,
  duration_minutes INT DEFAULT 60,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for stylist_services
ALTER TABLE stylist_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are viewable by everyone" ON stylist_services
  FOR SELECT USING (true);

CREATE POLICY "Stylists can insert their own services" ON stylist_services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM stylists
      WHERE stylists.id = stylist_services.stylist_id
      AND stylists.user_id = auth.uid()
    )
  );

CREATE POLICY "Stylists can update their own services" ON stylist_services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM stylists
      WHERE stylists.id = stylist_services.stylist_id
      AND stylists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stylists
      WHERE stylists.id = stylist_services.stylist_id
      AND stylists.user_id = auth.uid()
    )
  );

CREATE POLICY "Stylists can delete their own services" ON stylist_services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM stylists
      WHERE stylists.id = stylist_services.stylist_id
      AND stylists.user_id = auth.uid()
    )
  );

-- Indexes for stylist_services
CREATE INDEX IF NOT EXISTS idx_stylist_services_stylist_id ON stylist_services(stylist_id);

-- ============================================================================
-- 3. DRESS_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dress_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES dress_vendors(id) ON DELETE CASCADE,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  name_zh TEXT,
  category TEXT NOT NULL DEFAULT 'hanbok', -- hanbok, western_dress, tuxedo, kimono, cheongsam
  price INT NOT NULL DEFAULT 0,
  sizes TEXT[] DEFAULT '{}',
  color TEXT,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for dress_items
ALTER TABLE dress_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dress items are viewable by everyone" ON dress_items
  FOR SELECT USING (true);

CREATE POLICY "Vendors can insert their own dress items" ON dress_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM dress_vendors
      WHERE dress_vendors.id = dress_items.vendor_id
      AND dress_vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update their own dress items" ON dress_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM dress_vendors
      WHERE dress_vendors.id = dress_items.vendor_id
      AND dress_vendors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dress_vendors
      WHERE dress_vendors.id = dress_items.vendor_id
      AND dress_vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete their own dress items" ON dress_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM dress_vendors
      WHERE dress_vendors.id = dress_items.vendor_id
      AND dress_vendors.user_id = auth.uid()
    )
  );

-- Indexes for dress_items
CREATE INDEX IF NOT EXISTS idx_dress_items_vendor_id ON dress_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_dress_items_category ON dress_items(category);
CREATE INDEX IF NOT EXISTS idx_dress_items_is_available ON dress_items(is_available);

-- ============================================================================
-- 4. ADD DELIVERY COLUMNS TO BOOKINGS TABLE
-- ============================================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_memo TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Update status check constraint if it exists
-- Add 'delivered' as a valid status value
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'delivered'));

-- ============================================================================
-- 5. REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  photographer_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  lang TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_photographer_id ON reviews(photographer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- ============================================================================
-- Migration Complete
-- ============================================================================
