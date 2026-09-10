-- ─── Bookings: customer service fee column ────────────────────────────
-- Adds a column to record the 4% customer-paid service fee separately
-- from package/stylist/dress/venue prices. The artist payout is still
-- computed off (package_price * (1 - artist_commission_rate)); the
-- service_fee is platform revenue and never paid out to the artist.
--
-- Example:
--   package_price  = 100000
--   stylist_price  =     0
--   dress_price    =     0
--   venue_price    =     0
--   service_fee    =  4000   (= 100000 * 0.04, customer-paid)
--   total_price    = 104000  (= subtotal + service_fee, what TossPayments charged)

alter table public.bookings
  add column if not exists service_fee int default 0;

comment on column public.bookings.service_fee is
  'Customer-paid 4% service fee (booking protection). Excluded from artist payout calculations.';
