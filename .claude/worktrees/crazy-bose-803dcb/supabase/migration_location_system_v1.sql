-- ─── Location System Enhancement: Add Country Code and City Fields ──────
-- Add country_code and city columns to photographers, dress_vendors, stylists
-- These columns support the global location selection system
-- Created: 2026-04-12
-- ────────────────────────────────────────────────────────────────────────

-- photographers table: Add country_code and city columns
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'KR';
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS city TEXT;

-- Comment for clarity
COMMENT ON COLUMN photographers.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., KR, JP, US)';
COMMENT ON COLUMN photographers.city IS 'City name (e.g., Seoul, Kyoto, New York)';

-- dress_vendors table: Add country_code and city columns
ALTER TABLE dress_vendors ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'KR';
ALTER TABLE dress_vendors ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN dress_vendors.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., KR, JP, US)';
COMMENT ON COLUMN dress_vendors.city IS 'City name (e.g., Seoul, Kyoto, New York)';

-- stylists table: Add country_code and city columns
ALTER TABLE stylists ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'KR';
ALTER TABLE stylists ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN stylists.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., KR, JP, US)';
COMMENT ON COLUMN stylists.city IS 'City name (e.g., Seoul, Kyoto, New York)';

-- Optional: Create index for faster filtering by country
CREATE INDEX IF NOT EXISTS idx_photographers_country_code ON photographers(country_code);
CREATE INDEX IF NOT EXISTS idx_dress_vendors_country_code ON dress_vendors(country_code);
CREATE INDEX IF NOT EXISTS idx_stylists_country_code ON stylists(country_code);

-- Optional: Create indexes for compound queries (country + city)
CREATE INDEX IF NOT EXISTS idx_photographers_country_city ON photographers(country_code, city);
CREATE INDEX IF NOT EXISTS idx_dress_vendors_country_city ON dress_vendors(country_code, city);
CREATE INDEX IF NOT EXISTS idx_stylists_country_city ON stylists(country_code, city);
