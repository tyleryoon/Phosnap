#!/usr/bin/env node
/**
 * Phosnap Platform Simulation — Scenario Tests
 * Tests critical user journeys across the entire booking pipeline
 * Run: node src/tests/simulation.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __filename = fileURLToPath(import.meta.url);

// ─── localStorage Mock ──────────────────────────────────────
const store = {};
const localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

// ─── Utility ────────────────────────────────────────────────
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const fmt = (n) => n.toLocaleString('ko-KR');
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const range = (n) => Array.from({ length: n }, (_, i) => i);

// ─── Mini Data Layer ────────────────────────────────────────
const LOCATIONS = ['seoul', 'jeju', 'kyoto', 'osaka', 'paris', 'jeonju', 'busan'];

const ARTIST_TYPES = ['photographer', 'videographer', 'both', 'hmk'];

const CURRENCY_RATES = { KRW: 1, JPY: 0.112, USD: 0.00072, EUR: 0.00066 };
const TO_KRW = { KRW: 1, JPY: 8.93, USD: 1389, EUR: 1515 };
const SYMBOLS = { KRW: '₩', JPY: '¥', USD: '$', EUR: '€' };

function convertCurrency(amount, from, to) {
  if (from === to) return amount;
  const inKRW = from === 'KRW' ? amount : amount * TO_KRW[from];
  if (to === 'KRW') return Math.round(inKRW);
  return Math.round(inKRW * CURRENCY_RATES[to] * 100) / 100;
}

function formatPrice(amount, currency) {
  const sym = SYMBOLS[currency] || '₩';
  if (currency === 'KRW' || currency === 'JPY') return `${sym}${Math.round(amount).toLocaleString()}`;
  return `${sym}${amount.toFixed(2)}`;
}

// Artists
function generateArtists(count, type) {
  return range(count).map(i => ({
    id: `${type}-${i+1}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Artist ${i+1}`,
    artistType: type === 'photovideo' ? 'both' : type,
    locationId: pick(LOCATIONS),
    packages: [
      { name: 'Basic', price: type === 'hmk' ? 150000 : 300000, duration: 1 },
      { name: 'Standard', price: type === 'hmk' ? 250000 : 500000, duration: 2 },
      { name: 'Premium', price: type === 'hmk' ? 400000 : 800000, duration: 4 },
    ],
    rating: +(3.5 + Math.random() * 1.5).toFixed(1),
    reviewCount: Math.floor(Math.random() * 50),
    confirmType: pick(['instant', 'manual']),
    hmkSelf: type === 'hmk' || Math.random() > 0.7,
    dressSelf: Math.random() > 0.8,
    schedule: {},
  }));
}

// Stylists
function generateStylists(count) {
  return range(count).map(i => ({
    id: `stylist-${i+1}`,
    name: `Stylist ${i+1}`,
    locationId: pick(LOCATIONS),
    specialty: pick(['hair', 'makeup', 'both']),
    services: [
      { name: 'Basic Makeup', price: 80000, duration: 60 },
      { name: 'Full Styling', price: 150000, duration: 90 },
      { name: 'Bridal Package', price: 300000, duration: 120 },
    ],
    schedule: {},
  }));
}

// Costume Vendors
function generateCostumeVendors(count) {
  return range(count).map(i => ({
    id: `costume-vendor-${i+1}`,
    name: `Costume Vendor ${i+1}`,
    locationId: pick(LOCATIONS),
    categories: [pick(['hanbok', 'dress', 'tuxedo', 'traditional_jp', 'casual'])],
    items: range(3 + Math.floor(Math.random() * 5)).map(j => ({
      id: `costume-item-${i+1}-${j+1}`,
      name: `Costume ${j+1}`,
      category: pick(['hanbok', 'dress', 'tuxedo', 'kimono']),
      price: 50000 + Math.floor(Math.random() * 150000),
      sizes: ['S', 'M', 'L', 'XL'].slice(0, 2 + Math.floor(Math.random() * 3)),
      isAvailable: Math.random() > 0.1,
    })),
  }));
}

// Venue Vendors
function generateVenueVendors(count) {
  return range(count).map(i => ({
    id: `venue-vendor-${i+1}`,
    name: `Venue Vendor ${i+1}`,
    locationId: pick(LOCATIONS),
    categories: [pick(['studio', 'traditional_space', 'outdoor', 'urban', 'event_hall'])],
    items: range(2 + Math.floor(Math.random() * 3)).map(j => ({
      id: `venue-item-${i+1}-${j+1}`,
      name: `Venue ${j+1}`,
      category: pick(['studio', 'traditional_space', 'outdoor']),
      capacity: 5 + Math.floor(Math.random() * 20),
      price: 100000 + Math.floor(Math.random() * 400000),
      priceUnit: pick(['per_session', 'per_hour', 'per_day']),
      amenities: ['parking', 'wifi', 'changing_room', 'ac'].slice(0, Math.floor(Math.random() * 4) + 1),
      isAvailable: Math.random() > 0.1,
    })),
  }));
}

// Customers
function generateCustomers(count) {
  return range(count).map(i => ({
    id: `customer-${i+1}`,
    name: `Customer ${i+1}`,
    preferredCurrency: pick(['KRW', 'JPY', 'USD', 'EUR']),
    preferredLang: pick(['ko', 'en', 'ja', 'zh']),
    favorites: [],
    bookings: [],
  }));
}

// ─── Schedule System ────────────────────────────────────────
const SCHEDULE_KEY = 'phosnap_sim_schedules';
const TIME_SLOTS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

function getSchedule(entityId) {
  const all = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}');
  return all[entityId] || {};
}

function saveSchedule(entityId, schedule) {
  const all = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}');
  all[entityId] = schedule;
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(all));
}

function getBookedSlots(entityId, dateStr) {
  const schedule = getSchedule(entityId);
  return schedule[dateStr]?.blocked || [];
}

function bookSlot(entityId, dateStr, timeSlot) {
  const schedule = getSchedule(entityId);
  if (!schedule[dateStr]) schedule[dateStr] = { blocked: [] };
  if (schedule[dateStr].blocked.includes(timeSlot)) {
    return { success: false, error: 'DOUBLE_BOOKING' };
  }
  schedule[dateStr].blocked.push(timeSlot);
  saveSchedule(entityId, schedule);
  return { success: true };
}

function isSlotAvailable(entityId, dateStr, timeSlot) {
  const booked = getBookedSlots(entityId, dateStr);
  return !booked.includes(timeSlot);
}

// ─── Booking System ─────────────────────────────────────────
const BOOKING_KEY = 'phosnap_sim_bookings';

function createBooking(data) {
  const bookings = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
  const booking = {
    id: uuid(),
    ...data,
    status: data.confirmType === 'instant' ? 'confirmed' : 'pending',
    createdAt: new Date().toISOString(),
    pipeline: {},
  };

  // Build pipeline
  if (data.artistId) booking.pipeline.artist = { id: data.artistId, name: data.artistName, type: 'photographer' };
  if (data.stylistId) booking.pipeline.stylist = { id: data.stylistId, name: data.stylistName };
  if (data.costumeItemId) booking.pipeline.costume = { id: data.costumeItemId, name: data.costumeName, size: data.costumeSize };
  if (data.venueItemId) booking.pipeline.venue = { id: data.venueItemId, name: data.venueName };

  // Calculate total
  booking.totalPrice = (data.packagePrice || 0) + (data.stylistPrice || 0) + (data.costumePrice || 0) + (data.venuePrice || 0);

  bookings.push(booking);
  localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
  return booking;
}

function getBookings(filter = {}) {
  const bookings = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
  return bookings.filter(b => {
    if (filter.customerId && b.customerId !== filter.customerId) return false;
    if (filter.artistId && b.artistId !== filter.artistId) return false;
    if (filter.status && b.status !== filter.status) return false;
    return true;
  });
}

function updateBookingStatus(bookingId, status) {
  const bookings = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
  const idx = bookings.findIndex(b => b.id === bookingId);
  if (idx === -1) return { success: false, error: 'NOT_FOUND' };
  bookings[idx].status = status;
  localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
  return { success: true, booking: bookings[idx] };
}

// ─── Review System ──────────────────────────────────────────
const REVIEW_KEY = 'phosnap_sim_reviews';
const UNIFIED_REVIEW_KEY = 'phosnap_unified_reviews';

function submitReview(data) {
  const reviews = JSON.parse(localStorage.getItem(REVIEW_KEY) || '[]');
  const review = { id: uuid(), ...data, createdAt: new Date().toISOString() };
  reviews.push(review);
  localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
  return review;
}

function submitUnifiedReview(bookingId, sections) {
  // sections: { artist: {rating, tags, comment}, stylist: {...}, costume: {...}, venue: {...} }
  const reviews = JSON.parse(localStorage.getItem(UNIFIED_REVIEW_KEY) || '[]');
  reviews.push({ bookingId, reviews: sections, createdAt: new Date().toISOString() });
  localStorage.setItem(UNIFIED_REVIEW_KEY, JSON.stringify(reviews));
  return true;
}

function submitReviewReply(reviewId, photographerId, body) {
  const KEY = 'phosnap_sim_replies';
  const replies = JSON.parse(localStorage.getItem(KEY) || '[]');
  // Check uniqueness
  if (replies.find(r => r.reviewId === reviewId)) {
    return { success: false, error: 'ALREADY_REPLIED' };
  }
  replies.push({ id: uuid(), reviewId, photographerId, body, createdAt: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(replies));
  return { success: true };
}

function getReviewReplies(reviewIds) {
  const KEY = 'phosnap_sim_replies';
  const replies = JSON.parse(localStorage.getItem(KEY) || '[]');
  const map = {};
  replies.forEach(r => { if (reviewIds.includes(r.reviewId)) map[r.reviewId] = r; });
  return map;
}

// ─── Chat System ────────────────────────────────────────────
const CHAT_KEY = 'phosnap_sim_chats';

function sendChatMessage(channelId, senderId, senderRole, content) {
  const chats = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
  if (!chats[channelId]) chats[channelId] = { messages: [], participants: [] };
  chats[channelId].messages.push({
    id: uuid(), senderId, senderRole, content, timestamp: Date.now(), isRead: false,
  });
  if (!chats[channelId].participants.includes(senderId)) {
    chats[channelId].participants.push(senderId);
  }
  localStorage.setItem(CHAT_KEY, JSON.stringify(chats));
  return true;
}

function getChatMessages(channelId) {
  const chats = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
  return chats[channelId]?.messages || [];
}

function getChatChannelsForBooking(bookingId) {
  const chats = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
  const channels = {};
  Object.keys(chats).forEach(key => {
    if (key.startsWith(`booking-${bookingId}-`)) {
      const type = key.split('-').pop();
      channels[type] = chats[key];
    }
  });
  return channels;
}

// ─── Favorites System ───────────────────────────────────────
const FAV_KEY = 'phosnap_fav_artists';

function toggleFavorite(artistId) {
  const favs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  const idx = favs.indexOf(artistId);
  if (idx >= 0) { favs.splice(idx, 1); } else { favs.push(artistId); }
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  return favs;
}

function getFavorites() {
  return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
}

// ─── Refund Policy (inline) ─────────────────────────────────
const REFUND_TIERS = [
  { minDays: 7, refundPercent: 100 },
  { minDays: 3, refundPercent: 50 },
  { minDays: 0, refundPercent: 0 },
];

function calculateRefundSim(totalPrice, shootDate, cancelDate) {
  const shoot = new Date(shootDate + 'T00:00:00');
  const cancel = new Date(cancelDate + 'T00:00:00');
  const diffMs = shoot.getTime() - cancel.getTime();
  const daysUntilShoot = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let tier = REFUND_TIERS[REFUND_TIERS.length - 1];
  for (const t of REFUND_TIERS) {
    if (daysUntilShoot >= t.minDays) { tier = t; break; }
  }
  const refundAmount = Math.round(totalPrice * tier.refundPercent / 100);
  return { refundPercent: tier.refundPercent, refundAmount, daysUntilShoot, canRefund: tier.refundPercent > 0 };
}

// ─── Booking Expiry (inline) ────────────────────────────────
const EXPIRY_HOURS = 48;

function processExpiredBookingsSim(storageKey) {
  const bookings = JSON.parse(localStorage.getItem(storageKey) || '[]');
  let expiredCount = 0;
  const updated = bookings.map(b => {
    if (b.status === 'pending' && b.confirmType === 'manual') {
      const created = new Date(b.createdAt);
      const expiresAt = new Date(created.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);
      if (new Date() >= expiresAt) {
        expiredCount++;
        return { ...b, status: 'expired', expiredAt: new Date().toISOString() };
      }
    }
    return b;
  });
  if (expiredCount > 0) localStorage.setItem(storageKey, JSON.stringify(updated));
  return { processed: bookings.length, expired: expiredCount };
}

// ─── Venue Scheduling (inline) ──────────────────────────────
const VENUE_SCHEDULE_KEY = 'phosnap_sim_venue_schedules';

function bookVenueSlot(venueItemId, dateStr, timeSlot) {
  const all = JSON.parse(localStorage.getItem(VENUE_SCHEDULE_KEY) || '{}');
  if (!all[venueItemId]) all[venueItemId] = {};
  if (!all[venueItemId][dateStr]) all[venueItemId][dateStr] = { blocked: [] };
  if (all[venueItemId][dateStr].blocked.includes(timeSlot)) {
    return { success: false, error: 'VENUE_DOUBLE_BOOKING' };
  }
  all[venueItemId][dateStr].blocked.push(timeSlot);
  localStorage.setItem(VENUE_SCHEDULE_KEY, JSON.stringify(all));
  return { success: true };
}

function cancelVenueBookingSim(venueItemId, dateStr, timeSlot) {
  const all = JSON.parse(localStorage.getItem(VENUE_SCHEDULE_KEY) || '{}');
  if (!all[venueItemId]?.[dateStr]) return { success: false, error: 'NOT_FOUND' };
  all[venueItemId][dateStr].blocked = all[venueItemId][dateStr].blocked.filter(s => s !== timeSlot);
  localStorage.setItem(VENUE_SCHEDULE_KEY, JSON.stringify(all));
  return { success: true };
}

function getVenueBookedSlotsSim(venueItemId, dateStr) {
  const all = JSON.parse(localStorage.getItem(VENUE_SCHEDULE_KEY) || '{}');
  return all[venueItemId]?.[dateStr]?.blocked || [];
}

// ─── Account Cleanup (inline) ───────────────────────────────
function cleanupUserDataSim(userId) {
  const cleaned = {};

  // Remove user bookings
  const bookings = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
  const filteredBookings = bookings.filter(b => b.customerId !== userId && b.artistId !== userId);
  cleaned.bookings = bookings.length - filteredBookings.length;
  localStorage.setItem(BOOKING_KEY, JSON.stringify(filteredBookings));

  // Remove user reviews
  const reviews = JSON.parse(localStorage.getItem(REVIEW_KEY) || '[]');
  const filteredReviews = reviews.filter(r => r.customerId !== userId);
  cleaned.reviews = reviews.length - filteredReviews.length;
  localStorage.setItem(REVIEW_KEY, JSON.stringify(filteredReviews));

  // Clear favorites
  localStorage.removeItem(FAV_KEY);
  cleaned.favorites = 'cleared';

  // Remove user chat rooms
  const chats = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
  Object.keys(chats).forEach(roomId => {
    if (chats[roomId].participants?.includes(userId)) {
      delete chats[roomId];
      cleaned.chats = (cleaned.chats || 0) + 1;
    }
  });
  localStorage.setItem(CHAT_KEY, JSON.stringify(chats));

  return cleaned;
}

// ─── SCENARIOS ──────────────────────────────────────────────
const results = [];

function scenario(name, fn) {
  localStorage.clear();
  const issues = [];
  const log = (msg) => issues.push(msg);
  try {
    const pass = fn(log);
    results.push({ name, pass, issues });
  } catch (err) {
    results.push({ name, pass: false, issues: [...issues, `EXCEPTION: ${err.message}`] });
  }
}

// ── Scenario 1: Full Korean booking journey ──
scenario('S01: 한국 고객 풀코스 예약 (작가+HMK+의상+장소)', (log) => {
  const customer = { id: 'c-1', name: 'Kim', currency: 'KRW' };
  const artist = { id: 'a-1', name: 'Mina J.', locationId: 'seoul', confirmType: 'instant' };
  const pkg = { name: 'Premium', price: 800000 };
  const stylist = { id: 'st-1', name: 'Hana Y.', price: 150000 };
  const costume = { id: 'ci-1', name: '클래식 한복', price: 120000, size: 'M' };
  const venue = { id: 'vi-1', name: '경복궁 한옥 스튜디오', price: 250000 };
  const date = '2026-05-15';
  const time = '10:00';

  // 1. Check artist availability
  const artistAvail = isSlotAvailable(artist.id, date, time);
  if (!artistAvail) { log('Artist not available'); return false; }

  // 2. Book artist slot
  const artistBook = bookSlot(artist.id, date, time);
  if (!artistBook.success) { log('Artist booking failed: ' + artistBook.error); return false; }

  // 3. Check stylist availability
  const stylistAvail = isSlotAvailable(stylist.id, date, time);
  if (!stylistAvail) { log('Stylist not available'); return false; }

  // 4. Book stylist slot
  const stylistBook = bookSlot(stylist.id, date, time);
  if (!stylistBook.success) { log('Stylist booking failed: ' + stylistBook.error); return false; }

  // 5. Create booking
  const booking = createBooking({
    customerId: customer.id, customerName: customer.name,
    artistId: artist.id, artistName: artist.name,
    date, time, packageName: pkg.name, packagePrice: pkg.price,
    stylistId: stylist.id, stylistName: stylist.name, stylistPrice: stylist.price,
    costumeItemId: costume.id, costumeName: costume.name, costumePrice: costume.price, costumeSize: costume.size,
    venueItemId: venue.id, venueName: venue.name, venuePrice: venue.price,
    confirmType: artist.confirmType,
  });

  // 6. Verify booking
  if (!booking.id) { log('Booking creation failed'); return false; }
  if (booking.status !== 'confirmed') { log('Instant booking should be confirmed'); return false; }

  const expectedTotal = 800000 + 150000 + 120000 + 250000; // 1,320,000
  if (booking.totalPrice !== expectedTotal) {
    log(`Total price mismatch: expected ${expectedTotal}, got ${booking.totalPrice}`);
    return false;
  }

  // 7. Verify pipeline
  if (!booking.pipeline.artist) { log('Pipeline missing artist'); return false; }
  if (!booking.pipeline.stylist) { log('Pipeline missing stylist'); return false; }
  if (!booking.pipeline.costume) { log('Pipeline missing costume'); return false; }
  if (!booking.pipeline.venue) { log('Pipeline missing venue'); return false; }

  // 8. Submit unified review
  submitUnifiedReview(booking.id, {
    artist: { rating: 5, tags: ['friendly', 'professional'], comment: '최고의 촬영이었습니다!' },
    stylist: { rating: 4, tags: ['skillful'], comment: '메이크업이 자연스러웠어요' },
    costume: { rating: 5, tags: ['clean', 'variety'], comment: '한복이 정말 예뻤어요' },
    venue: { rating: 4, tags: ['spacious', 'clean'], comment: '경복궁 분위기 최고!' },
  });

  const reviews = JSON.parse(localStorage.getItem(UNIFIED_REVIEW_KEY) || '[]');
  if (reviews.length !== 1) { log('Review not saved'); return false; }
  if (reviews[0].reviews.artist.rating !== 5) { log('Artist review rating wrong'); return false; }

  // 9. Artist replies
  const reply = submitReviewReply(reviews[0].bookingId, artist.id, '감사합니다! 또 뵙겠습니다 😊');
  if (!reply.success) { log('Reply failed'); return false; }

  return true;
});

// ── Scenario 2: Japanese customer with JPY ──
scenario('S02: 일본 고객 JPY 예약 (교토 기모노 촬영)', (log) => {
  const customer = { id: 'c-2', name: 'Yuki', currency: 'JPY' };
  const artist = { id: 'a-kyoto-1', name: 'Takeshi', locationId: 'kyoto', confirmType: 'manual' };
  const pkg = { name: 'Standard', price: 55000, currency: 'JPY' }; // ¥55,000

  // Convert to KRW for storage
  const pkgPriceKRW = convertCurrency(pkg.price, 'JPY', 'KRW');
  if (pkgPriceKRW < 400000 || pkgPriceKRW > 600000) {
    log(`JPY→KRW conversion out of range: ${pkgPriceKRW}`);
    return false;
  }

  // Convert back to JPY for display
  const displayJPY = convertCurrency(pkgPriceKRW, 'KRW', 'JPY');
  const formatted = formatPrice(displayJPY, 'JPY');
  if (!formatted.startsWith('¥')) { log('JPY format wrong: ' + formatted); return false; }

  // Manual confirmation flow
  const booking = createBooking({
    customerId: customer.id, artistId: artist.id, artistName: artist.name,
    date: '2026-06-10', time: '09:00', packageName: pkg.name,
    packagePrice: pkgPriceKRW, confirmType: 'manual',
  });

  if (booking.status !== 'pending') { log('Manual booking should be pending'); return false; }

  // Artist confirms
  const result = updateBookingStatus(booking.id, 'confirmed');
  if (!result.success) { log('Status update failed'); return false; }
  if (result.booking.status !== 'confirmed') { log('Status not updated'); return false; }

  // Convert total to EUR for display
  const totalEUR = convertCurrency(booking.totalPrice, 'KRW', 'EUR');
  const eurFormatted = formatPrice(totalEUR, 'EUR');
  if (!eurFormatted.startsWith('€')) { log('EUR format wrong: ' + eurFormatted); return false; }

  return true;
});

// ── Scenario 3: Artist double-booking prevention ──
scenario('S03: 작가 더블부킹 방지', (log) => {
  const artist = { id: 'a-db-1' };
  const date = '2026-05-20';
  const time = '14:00';

  // First booking succeeds
  const r1 = bookSlot(artist.id, date, time);
  if (!r1.success) { log('First booking should succeed'); return false; }

  // Second booking on same slot fails
  const r2 = bookSlot(artist.id, date, time);
  if (r2.success) { log('Double booking should be prevented!'); return false; }
  if (r2.error !== 'DOUBLE_BOOKING') { log('Wrong error type: ' + r2.error); return false; }

  // Different time on same date succeeds
  const r3 = bookSlot(artist.id, date, '15:00');
  if (!r3.success) { log('Different time should succeed'); return false; }

  // Different date, same time succeeds
  const r4 = bookSlot(artist.id, '2026-05-21', time);
  if (!r4.success) { log('Different date should succeed'); return false; }

  return true;
});

// ── Scenario 4: Stylist double-booking prevention ──
scenario('S04: 스타일리스트 더블부킹 방지', (log) => {
  const stylist = { id: 'st-db-1' };
  const date = '2026-05-20';

  // Book 3 consecutive slots (90-minute service)
  ['09:00', '10:00', '11:00'].forEach(t => {
    const r = bookSlot(stylist.id, date, t);
    if (!r.success) { log(`Slot ${t} booking failed`); }
  });

  // Try to book overlapping slot
  const overlap = bookSlot(stylist.id, date, '10:00');
  if (overlap.success) { log('Overlapping stylist slot should be blocked'); return false; }

  // Non-overlapping slot succeeds
  const ok = bookSlot(stylist.id, date, '14:00');
  if (!ok.success) { log('Non-overlapping slot should succeed'); return false; }

  return true;
});

// ── Scenario 5: Multi-vendor unified review ──
scenario('S05: 통합 리뷰 (작가+HMK+의상+장소 한번에)', (log) => {
  const bookingId = 'booking-review-1';

  // Customer submits unified review for all vendors
  submitUnifiedReview(bookingId, {
    artist: { rating: 5, tags: ['professional', 'friendly', 'creative'], comment: 'Amazing photographer!' },
    stylist: { rating: 4, tags: ['skillful', 'on_time'], comment: 'Great makeup work' },
    costume: { rating: 3, tags: ['limited_selection'], comment: 'Could have more options' },
    venue: { rating: 5, tags: ['spacious', 'beautiful', 'clean'], comment: 'Perfect location' },
  });

  const reviews = JSON.parse(localStorage.getItem(UNIFIED_REVIEW_KEY) || '[]');
  if (reviews.length !== 1) { log('Review count wrong'); return false; }

  const entry = reviews[0];
  if (entry.reviews.artist.rating !== 5) { log('Artist rating wrong'); return false; }
  if (entry.reviews.stylist.tags.length !== 2) { log('Stylist tags count wrong'); return false; }
  if (entry.reviews.costume.rating !== 3) { log('Costume rating wrong'); return false; }
  if (entry.reviews.venue.tags.includes('beautiful') === false) { log('Venue tag missing'); return false; }

  // Verify vendor can read their reviews
  const costumeReviews = reviews.filter(r => r.reviews.costume && r.reviews.costume.rating > 0);
  if (costumeReviews.length !== 1) { log('Costume vendor cannot find review'); return false; }

  return true;
});

// ── Scenario 6: Vendor dashboard review read ──
scenario('S06: 벤더 대시보드 리뷰 열람', (log) => {
  // Create multiple reviews for same vendor type
  for (let i = 1; i <= 5; i++) {
    submitUnifiedReview(`booking-${i}`, {
      artist: { rating: 3 + (i % 3), tags: ['good'], comment: `Review ${i}` },
      stylist: { rating: 4, tags: ['nice'], comment: `Stylist review ${i}` },
    });
  }

  const reviews = JSON.parse(localStorage.getItem(UNIFIED_REVIEW_KEY) || '[]');

  // Calculate average for artist
  const artistRatings = reviews.map(r => r.reviews.artist?.rating).filter(Boolean);
  const avgArtist = artistRatings.reduce((a, b) => a + b, 0) / artistRatings.length;
  if (avgArtist < 3 || avgArtist > 5) { log('Average artist rating out of range: ' + avgArtist); return false; }

  // Calculate average for stylist
  const stylistRatings = reviews.map(r => r.reviews.stylist?.rating).filter(Boolean);
  const avgStylist = stylistRatings.reduce((a, b) => a + b, 0) / stylistRatings.length;
  if (avgStylist !== 4) { log('Average stylist rating should be 4: ' + avgStylist); return false; }

  return true;
});

// ── Scenario 7: Multi-party chat ──
scenario('S07: 멀티파티 채팅 (고객↔작가↔스타일리스트↔장소)', (log) => {
  const bookingId = 'chat-test-1';

  // Customer → Artist
  sendChatMessage(`booking-${bookingId}-photo`, 'c-1', 'customer', '촬영 장소 조율 가능할까요?');
  sendChatMessage(`booking-${bookingId}-photo`, 'a-1', 'photographer', '네, 경복궁 쪽으로 생각하고 있어요');

  // Customer → Stylist
  sendChatMessage(`booking-${bookingId}-stylist`, 'c-1', 'customer', '메이크업 시간이 얼마나 걸릴까요?');
  sendChatMessage(`booking-${bookingId}-stylist`, 'st-1', 'stylist', '약 1시간 정도 소요됩니다');

  // Customer → Venue
  sendChatMessage(`booking-${bookingId}-venue`, 'c-1', 'customer', '주차 가능한가요?');
  sendChatMessage(`booking-${bookingId}-venue`, 'vv-1', 'venue_vendor', '네, 무료 주차 10대 가능합니다');

  // Verify channels
  const channels = getChatChannelsForBooking(bookingId);
  if (!channels.photo) { log('Photo channel missing'); return false; }
  if (!channels.stylist) { log('Stylist channel missing'); return false; }
  if (!channels.venue) { log('Venue channel missing'); return false; }

  // Verify message counts
  const photoMsgs = getChatMessages(`booking-${bookingId}-photo`);
  if (photoMsgs.length !== 2) { log('Photo channel should have 2 messages: ' + photoMsgs.length); return false; }

  const stylistMsgs = getChatMessages(`booking-${bookingId}-stylist`);
  if (stylistMsgs.length !== 2) { log('Stylist channel should have 2 messages: ' + stylistMsgs.length); return false; }

  // Verify sender roles
  if (photoMsgs[0].senderRole !== 'customer') { log('First message should be from customer'); return false; }
  if (photoMsgs[1].senderRole !== 'photographer') { log('Second message should be from photographer'); return false; }

  return true;
});

// ── Scenario 8: EUR user Paris booking ──
scenario('S08: EUR 유저 파리 작가 예약 + 통화 변환', (log) => {
  const customer = { id: 'c-eur', currency: 'EUR' };
  const pkg = { name: 'Parisian Elegance', price: 800000 }; // KRW base

  // Display in EUR
  const eurPrice = convertCurrency(pkg.price, 'KRW', 'EUR');
  if (eurPrice < 400 || eurPrice > 700) { log(`EUR conversion out of range: ${eurPrice}`); return false; }

  const formatted = formatPrice(eurPrice, 'EUR');
  if (!formatted.startsWith('€')) { log('Format wrong: ' + formatted); return false; }
  if (!formatted.includes('.')) { log('EUR should have decimals: ' + formatted); return false; }

  // Convert all currencies for comparison
  const currencies = ['KRW', 'JPY', 'USD', 'EUR'];
  const conversions = {};
  currencies.forEach(c => {
    conversions[c] = convertCurrency(pkg.price, 'KRW', c);
  });

  if (conversions.KRW !== 800000) { log('KRW identity wrong'); return false; }
  if (conversions.JPY < 80000 || conversions.JPY > 100000) { log('JPY range wrong: ' + conversions.JPY); return false; }
  if (conversions.USD < 500 || conversions.USD > 700) { log('USD range wrong: ' + conversions.USD); return false; }

  return true;
});

// ── Scenario 9: Booking filter & status flow ──
scenario('S09: 예약 필터링 (전체/확정/완료/취소)', (log) => {
  const customerId = 'c-filter-1';

  // Create bookings with different statuses
  const b1 = createBooking({ customerId, artistId: 'a-1', date: '2026-05-01', packagePrice: 300000, confirmType: 'instant' });
  const b2 = createBooking({ customerId, artistId: 'a-2', date: '2026-05-02', packagePrice: 500000, confirmType: 'manual' });
  const b3 = createBooking({ customerId, artistId: 'a-3', date: '2026-04-01', packagePrice: 400000, confirmType: 'instant' });

  // Update statuses
  updateBookingStatus(b3.id, 'completed');

  const b4 = createBooking({ customerId, artistId: 'a-4', date: '2026-05-10', packagePrice: 200000, confirmType: 'instant' });
  updateBookingStatus(b4.id, 'cancelled');

  // Filter tests
  const all = getBookings({ customerId });
  if (all.length !== 4) { log('All bookings count wrong: ' + all.length); return false; }

  const confirmed = getBookings({ customerId, status: 'confirmed' });
  if (confirmed.length !== 1) { log('Confirmed count wrong: ' + confirmed.length); return false; }

  const pending = getBookings({ customerId, status: 'pending' });
  if (pending.length !== 1) { log('Pending count wrong: ' + pending.length); return false; }

  const completed = getBookings({ customerId, status: 'completed' });
  if (completed.length !== 1) { log('Completed count wrong: ' + completed.length); return false; }

  const cancelled = getBookings({ customerId, status: 'cancelled' });
  if (cancelled.length !== 1) { log('Cancelled count wrong: ' + cancelled.length); return false; }

  return true;
});

// ── Scenario 10: Favorites toggle ──
scenario('S10: 즐겨찾기 토글 + 목록', (log) => {
  // Add favorites
  toggleFavorite('artist-1');
  toggleFavorite('artist-2');
  toggleFavorite('artist-3');

  let favs = getFavorites();
  if (favs.length !== 3) { log('Should have 3 favorites: ' + favs.length); return false; }

  // Remove one
  toggleFavorite('artist-2');
  favs = getFavorites();
  if (favs.length !== 2) { log('Should have 2 favorites after removal: ' + favs.length); return false; }
  if (favs.includes('artist-2')) { log('artist-2 should be removed'); return false; }

  // Toggle same one back
  toggleFavorite('artist-2');
  favs = getFavorites();
  if (favs.length !== 3) { log('Should have 3 favorites after re-add: ' + favs.length); return false; }

  return true;
});

// ── Scenario 11: Review reply uniqueness ──
scenario('S11: 리뷰 답글 1회 제한 (upsert 검증)', (log) => {
  const reviewId = 'review-unique-1';
  const artistId = 'a-reply-1';

  // First reply succeeds
  const r1 = submitReviewReply(reviewId, artistId, '감사합니다!');
  if (!r1.success) { log('First reply should succeed'); return false; }

  // Second reply to same review fails
  const r2 = submitReviewReply(reviewId, artistId, '다시 답글');
  if (r2.success) { log('Duplicate reply should fail'); return false; }
  if (r2.error !== 'ALREADY_REPLIED') { log('Wrong error: ' + r2.error); return false; }

  // Reply to different review succeeds
  const r3 = submitReviewReply('review-unique-2', artistId, '다른 리뷰 답글');
  if (!r3.success) { log('Reply to different review should succeed'); return false; }

  // Verify replies map
  const map = getReviewReplies([reviewId, 'review-unique-2']);
  if (Object.keys(map).length !== 2) { log('Should have 2 replies in map'); return false; }

  return true;
});

// ── Scenario 12: Complete multi-vendor booking with all checks ──
scenario('S12: 종합 시나리오 — 50명 고객 동시 예약 스트레스 테스트', (log) => {
  const artists = generateArtists(10, 'photographer');
  const stylists = generateStylists(5);
  const costVendors = generateCostumeVendors(5);
  const venueVendors = generateVenueVendors(5);
  const customers = generateCustomers(50);

  let successCount = 0;
  let failCount = 0;
  let doubleBookBlocked = 0;
  const dates = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'];

  customers.forEach(customer => {
    const artist = pick(artists);
    const date = pick(dates);
    const time = pick(TIME_SLOTS);
    const pkg = pick(artist.packages);

    // Try to book artist
    const artistResult = bookSlot(artist.id, date, time);
    if (!artistResult.success) {
      doubleBookBlocked++;
      failCount++;
      return;
    }

    // Optionally add stylist (60% chance)
    let stylistId = null, stylistPrice = 0, stylistName = '';
    if (Math.random() > 0.4) {
      const stylist = pick(stylists);
      const stylistResult = bookSlot(stylist.id, date, time);
      if (stylistResult.success) {
        const svc = pick(stylist.services);
        stylistId = stylist.id;
        stylistName = stylist.name;
        stylistPrice = svc.price;
      }
    }

    // Optionally add costume (40% chance)
    let costumeItemId = null, costumeName = '', costumePrice = 0;
    if (Math.random() > 0.6) {
      const vendor = pick(costVendors);
      const avail = vendor.items.filter(i => i.isAvailable);
      if (avail.length > 0) {
        const item = pick(avail);
        costumeItemId = item.id;
        costumeName = item.name;
        costumePrice = item.price;
      }
    }

    // Optionally add venue (30% chance)
    let venueItemId = null, venueName = '', venuePrice = 0;
    if (Math.random() > 0.7) {
      const vendor = pick(venueVendors);
      const avail = vendor.items.filter(i => i.isAvailable);
      if (avail.length > 0) {
        const item = pick(avail);
        venueItemId = item.id;
        venueName = item.name;
        venuePrice = item.price;
      }
    }

    const booking = createBooking({
      customerId: customer.id, customerName: customer.name,
      artistId: artist.id, artistName: artist.name,
      date, time, packageName: pkg.name, packagePrice: pkg.price,
      stylistId, stylistName, stylistPrice,
      costumeItemId, costumeName, costumePrice,
      venueItemId, venueName, venuePrice,
      confirmType: artist.confirmType,
    });

    if (booking.id && booking.totalPrice > 0) {
      successCount++;
    } else {
      log(`Booking failed for customer ${customer.name}`);
      failCount++;
    }

    // Convert total to customer's preferred currency
    const displayPrice = convertCurrency(booking.totalPrice, 'KRW', customer.preferredCurrency);
    const formatted = formatPrice(displayPrice, customer.preferredCurrency);
    if (!formatted || formatted.length < 2) {
      log(`Price format failed for ${customer.preferredCurrency}`);
    }
  });

  log(`Results: ${successCount} success, ${failCount} fail, ${doubleBookBlocked} double-book blocked`);

  if (successCount === 0) { log('Zero successful bookings'); return false; }
  if (doubleBookBlocked === 0 && successCount === 50) {
    // Unlikely with 10 artists × 15 time slots × 5 dates = 750 slots for 50 customers
    // But possible if lucky
  }

  // Verify all bookings exist
  const allBookings = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
  if (allBookings.length !== successCount) {
    log(`Booking count mismatch: stored ${allBookings.length}, expected ${successCount}`);
    return false;
  }

  // Verify price sanity
  allBookings.forEach(b => {
    if (b.totalPrice <= 0) { log(`Booking ${b.id} has zero/negative price`); }
    if (b.totalPrice > 2000000) { /* high but possible with all options */ }
  });

  return true;
});

// ── Scenario 13: Refund policy calculation ──
scenario('S13: 환불 정책 계산 (7일/3-6일/2일 이내)', (log) => {
  const totalPrice = 800000;

  // 7+ days before → 100%
  const r1 = calculateRefundSim(totalPrice, '2026-06-20', '2026-06-10');
  if (r1.refundPercent !== 100) { log('7일전 100% 아님: ' + r1.refundPercent); return false; }
  if (r1.refundAmount !== 800000) { log('환불금액 틀림: ' + r1.refundAmount); return false; }

  // 5 days before → 50%
  const r2 = calculateRefundSim(totalPrice, '2026-06-20', '2026-06-15');
  if (r2.refundPercent !== 50) { log('5일전 50% 아님: ' + r2.refundPercent); return false; }
  if (r2.refundAmount !== 400000) { log('50% 환불금액 틀림: ' + r2.refundAmount); return false; }

  // 3 days before → 50%
  const r3 = calculateRefundSim(totalPrice, '2026-06-20', '2026-06-17');
  if (r3.refundPercent !== 50) { log('3일전 50% 아님: ' + r3.refundPercent); return false; }

  // 2 days before → 0%
  const r4 = calculateRefundSim(totalPrice, '2026-06-20', '2026-06-18');
  if (r4.refundPercent !== 0) { log('2일전 0% 아님: ' + r4.refundPercent); return false; }
  if (r4.refundAmount !== 0) { log('환불불가인데 금액있음: ' + r4.refundAmount); return false; }

  // Same day → 0%
  const r5 = calculateRefundSim(totalPrice, '2026-06-20', '2026-06-20');
  if (r5.refundPercent !== 0) { log('당일 0% 아님: ' + r5.refundPercent); return false; }

  // 1 day before → 0%
  const r6 = calculateRefundSim(totalPrice, '2026-06-20', '2026-06-19');
  if (r6.refundPercent !== 0) { log('1일전 0% 아님: ' + r6.refundPercent); return false; }

  return true;
});

// ── Scenario 14: 48-hour booking expiry ──
scenario('S14: Manual confirm 48시간 만료 처리', (log) => {
  // Create a pending manual booking that was created 49 hours ago
  const now = Date.now();
  const oldBooking = createBooking({
    customerId: 'c-expiry-1', artistId: 'a-expiry-1', artistName: 'Test Artist',
    date: '2026-07-01', time: '10:00', packagePrice: 500000, confirmType: 'manual',
  });

  // Manually backdate createdAt to 49 hours ago
  const bookings = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
  const idx = bookings.findIndex(b => b.id === oldBooking.id);
  bookings[idx].createdAt = new Date(now - 49 * 60 * 60 * 1000).toISOString();
  localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));

  // Create a recent pending manual booking (1 hour ago)
  const newBooking = createBooking({
    customerId: 'c-expiry-2', artistId: 'a-expiry-2', artistName: 'Test Artist 2',
    date: '2026-07-02', time: '11:00', packagePrice: 300000, confirmType: 'manual',
  });
  const bookings2 = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
  const idx2 = bookings2.findIndex(b => b.id === newBooking.id);
  bookings2[idx2].createdAt = new Date(now - 1 * 60 * 60 * 1000).toISOString();
  localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings2));

  // Create an instant-confirm booking (should never expire)
  const instantBooking = createBooking({
    customerId: 'c-expiry-3', artistId: 'a-expiry-3', artistName: 'Test Artist 3',
    date: '2026-07-03', time: '12:00', packagePrice: 400000, confirmType: 'instant',
  });

  // Process expiry
  const result = processExpiredBookingsSim(BOOKING_KEY);
  if (result.expired !== 1) { log('Should expire exactly 1 booking: ' + result.expired); return false; }

  // Verify the old booking is expired
  const final = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
  const expiredBooking = final.find(b => b.id === oldBooking.id);
  if (expiredBooking.status !== 'expired') { log('Old booking should be expired: ' + expiredBooking.status); return false; }

  // Verify the new booking is still pending
  const stillPending = final.find(b => b.id === newBooking.id);
  if (stillPending.status !== 'pending') { log('New booking should still be pending: ' + stillPending.status); return false; }

  // Verify instant booking is untouched
  const instant = final.find(b => b.id === instantBooking.id);
  if (instant.status !== 'confirmed') { log('Instant booking should stay confirmed: ' + instant.status); return false; }

  return true;
});

// ── Scenario 15: Venue double-booking prevention ──
scenario('S15: 장소(Venue) 더블부킹 방지', (log) => {
  const venueId = 'venue-item-test-1';
  const date = '2026-05-25';

  // First booking succeeds
  const r1 = bookVenueSlot(venueId, date, '10:00');
  if (!r1.success) { log('First venue booking should succeed'); return false; }

  // Same slot fails
  const r2 = bookVenueSlot(venueId, date, '10:00');
  if (r2.success) { log('Venue double booking should be prevented!'); return false; }
  if (r2.error !== 'VENUE_DOUBLE_BOOKING') { log('Wrong error: ' + r2.error); return false; }

  // Different time succeeds
  const r3 = bookVenueSlot(venueId, date, '14:00');
  if (!r3.success) { log('Different time should succeed'); return false; }

  // Different venue, same time succeeds
  const r4 = bookVenueSlot('venue-item-test-2', date, '10:00');
  if (!r4.success) { log('Different venue same time should succeed'); return false; }

  // Cancel and rebook
  const cancel = cancelVenueBookingSim(venueId, date, '10:00');
  if (!cancel.success) { log('Cancel should succeed'); return false; }

  const r5 = bookVenueSlot(venueId, date, '10:00');
  if (!r5.success) { log('Rebooking after cancel should succeed'); return false; }

  // Check venue date status
  const booked = getVenueBookedSlotsSim(venueId, date);
  if (booked.length !== 2) { log('Should have 2 booked slots: ' + booked.length); return false; }

  return true;
});

// ── Scenario 16: Account deletion data cleanup ──
scenario('S16: 회원 탈퇴 시 데이터 정리', (log) => {
  const userId = 'user-delete-test';

  // Create data for this user
  createBooking({ customerId: userId, artistId: 'a-1', date: '2026-06-01', packagePrice: 300000, confirmType: 'instant' });
  createBooking({ customerId: userId, artistId: 'a-2', date: '2026-06-02', packagePrice: 500000, confirmType: 'instant' });
  createBooking({ customerId: 'other-user', artistId: 'a-3', date: '2026-06-03', packagePrice: 400000, confirmType: 'instant' });

  submitUnifiedReview('booking-del-1', {
    artist: { rating: 5, tags: ['good'], comment: 'Great!' },
  });

  // Set up favorites
  toggleFavorite('artist-fav-1');
  toggleFavorite('artist-fav-2');

  // Set up chat
  sendChatMessage('booking-chat-del-photo', userId, 'customer', 'Hello!');
  sendChatMessage('booking-chat-del-photo', 'a-1', 'photographer', 'Hi!');
  sendChatMessage('booking-other-photo', 'other-user', 'customer', 'Other chat');

  // Verify data exists before cleanup
  const beforeBookings = getBookings({ customerId: userId });
  if (beforeBookings.length !== 2) { log('Should have 2 bookings before cleanup: ' + beforeBookings.length); return false; }

  const beforeFavs = getFavorites();
  if (beforeFavs.length !== 2) { log('Should have 2 favorites before cleanup: ' + beforeFavs.length); return false; }

  // Run cleanup
  const result = cleanupUserDataSim(userId);

  // Verify user's bookings removed, others kept
  const afterBookings = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
  const userBookings = afterBookings.filter(b => b.customerId === userId);
  if (userBookings.length !== 0) { log('User bookings should be removed: ' + userBookings.length); return false; }

  const otherBookings = afterBookings.filter(b => b.customerId === 'other-user');
  if (otherBookings.length !== 1) { log('Other user bookings should remain: ' + otherBookings.length); return false; }

  // Verify favorites cleared
  const afterFavs = getFavorites();
  if (afterFavs.length !== 0) { log('Favorites should be cleared: ' + afterFavs.length); return false; }

  // Verify user's chat removed, others kept
  const chats = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
  if (chats['booking-chat-del-photo']) { log('User chat room should be removed'); return false; }
  if (!chats['booking-other-photo']) { log('Other user chat should remain'); return false; }

  return true;
});

// ─── Report ─────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;

console.log('\n' + '='.repeat(60));
console.log('  PHOSNAP SCENARIO SIMULATION REPORT');
console.log('='.repeat(60));
console.log(`  Date: ${new Date().toISOString().slice(0, 10)}`);
console.log(`  Total: ${results.length} scenarios`);
console.log(`  PASS: ${passed}`);
console.log(`  FAIL: ${failed}`);
console.log('-'.repeat(60));

results.forEach((r, i) => {
  const icon = r.pass ? 'OK' : 'XX';
  console.log(`  [${icon}] ${r.name}`);
  if (r.issues.length > 0) {
    r.issues.forEach(issue => {
      console.log(`      > ${issue}`);
    });
  }
});

console.log('-'.repeat(60));
if (failed > 0) {
  console.log(`  ${failed} scenario(s) FAILED — review issues above`);
} else {
  console.log('  All scenarios passed!');
}
console.log('='.repeat(60) + '\n');

// Output JSON for programmatic use
const reportJson = {
  date: new Date().toISOString(),
  total: results.length,
  passed, failed,
  scenarios: results,
};

// Write report to same directory
const reportPath = path.join(__dirname, 'simulation-report.json');
try {
  fs.writeFileSync(reportPath, JSON.stringify(reportJson, null, 2));
  console.log(`Report saved to ${reportPath}\n`);
} catch (err) {
  // Gracefully handle file write errors
  console.log('(Report JSON summary available above)\n');
}
