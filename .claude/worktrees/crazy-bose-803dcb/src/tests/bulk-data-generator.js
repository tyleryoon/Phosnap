#!/usr/bin/env node
/**
 * Phosnap Bulk Data Generator
 * Generates 350 accounts + bookings + reviews for UI testing
 * Run: node src/tests/bulk-data-generator.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const range = (n) => Array.from({ length: n }, (_, i) => i);

// ─── Constants ──────────────────────────────────────────────
const LOCATIONS = [
  { id: 'seoul', names: { ko: '서울', en: 'Seoul', ja: 'ソウル', zh: '首尔' } },
  { id: 'jeju', names: { ko: '제주', en: 'Jeju', ja: '済州', zh: '济州' } },
  { id: 'busan', names: { ko: '부산', en: 'Busan', ja: '釜山', zh: '釜山' } },
  { id: 'kyoto', names: { ko: '교토', en: 'Kyoto', ja: '京都', zh: '京都' } },
  { id: 'osaka', names: { ko: '오사카', en: 'Osaka', ja: '大阪', zh: '大阪' } },
  { id: 'paris', names: { ko: '파리', en: 'Paris', ja: 'パリ', zh: '巴黎' } },
  { id: 'jeonju', names: { ko: '전주', en: 'Jeonju', ja: '全州', zh: '全州' } },
];

const FIRST_NAMES_KO = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
const FIRST_NAMES_EN = ['Emma', 'Liam', 'Sophia', 'James', 'Mia', 'Oliver', 'Ava', 'Lucas', 'Isabella', 'Mason', 'Charlotte', 'Ethan', 'Harper', 'Noah', 'Amelia', 'Aiden', 'Ella', 'Caden', 'Aria', 'Logan'];
const FIRST_NAMES_JA = ['花子', '太郎', 'さくら', '健太', '美咲', '翔太', '結衣', '大輝', '陽菜', '蓮', '凜', '悠斗', '葵', '颯太', '楓', '伊藤', '佐藤', '鈴木', '田中', '山田'];

const TAGS = ['wedding', 'couple', 'outdoor', 'portrait', 'birthday1st', 'video', 'indoor', 'landmark', 'hanbok', 'kimono'];
const PACKAGE_NAMES = ['Basic Snap', 'Standard', 'Premium', 'Luxury', 'Half Day', 'Full Day', 'Golden Hour'];

const STYLIST_SPECIALTIES = ['hair', 'makeup', 'both'];
const COSTUME_CATEGORIES = ['hanbok', 'dress', 'tuxedo', 'traditional_jp', 'casual', 'qipao'];
const VENUE_CATEGORIES = ['studio', 'traditional_space', 'outdoor', 'urban', 'event_hall'];
const CURRENCIES = ['KRW', 'JPY', 'USD', 'EUR'];

// ─── Generators ─────────────────────────────────────────────

function generateName(type, idx) {
  if (type === 'ko') return pick(FIRST_NAMES_KO) + '**';
  if (type === 'ja') return pick(FIRST_NAMES_JA);
  return pick(FIRST_NAMES_EN) + ' ' + String.fromCharCode(65 + (idx % 26)) + '.';
}

function generatePhotographer(idx, artistType) {
  const loc = pick(LOCATIONS);
  const nameEn = generateName('en', idx);
  const nameKo = generateName('ko', idx);
  const numPkgs = 2 + Math.floor(Math.random() * 3);

  return {
    id: `sim-${artistType}-${idx}`,
    name: nameEn,
    nameKo: nameKo,
    artistType: artistType,
    locationId: loc.id,
    location: loc.names.en,
    locationNames: loc.names,
    tags: TAGS.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 4)),
    img: `https://i.pravatar.cc/400?u=sim-${artistType}-${idx}`,
    confirmType: Math.random() > 0.3 ? 'instant' : 'manual',
    hmkSelf: artistType === 'hmk' || Math.random() > 0.7,
    dressSelf: Math.random() > 0.8,
    rating: +(3.0 + Math.random() * 2).toFixed(1),
    reviewCount: Math.floor(Math.random() * 80),
    packages: range(numPkgs).map(j => ({
      name: PACKAGE_NAMES[j % PACKAGE_NAMES.length],
      price: (200000 + j * 150000 + Math.floor(Math.random() * 100000)),
      duration: 1 + j,
      desc: `Package ${j + 1} description`,
    })),
    portfolio: range(4 + Math.floor(Math.random() * 6)).map(j =>
      `https://picsum.photos/seed/sim-${artistType}-${idx}-${j}/800/1200`
    ),
  };
}

function generateStylist(idx) {
  const loc = pick(LOCATIONS);
  return {
    id: `sim-stylist-${idx}`,
    name: generateName('en', idx),
    nameKo: generateName('ko', idx),
    locationId: loc.id,
    location: loc.names.en,
    specialty: pick(STYLIST_SPECIALTIES),
    services: [
      { name: 'Basic Makeup', nameEn: 'Basic Makeup', price: 80000 + Math.floor(Math.random() * 40000), duration: 60 },
      { name: 'Full Styling', nameEn: 'Full Styling', price: 150000 + Math.floor(Math.random() * 50000), duration: 90 },
      { name: 'Bridal Package', nameEn: 'Bridal Package', price: 250000 + Math.floor(Math.random() * 100000), duration: 120 },
    ],
    img: `https://i.pravatar.cc/400?u=sim-stylist-${idx}`,
    rating: +(3.5 + Math.random() * 1.5).toFixed(1),
    reviewCount: Math.floor(Math.random() * 30),
  };
}

function generateCostumeVendor(idx) {
  const loc = pick(LOCATIONS);
  const numItems = 3 + Math.floor(Math.random() * 7);
  return {
    id: `sim-costume-vendor-${idx}`,
    name: `${loc.names.en} Costume ${idx + 1}`,
    nameI18n: { ko: `${loc.names.ko} 의상 ${idx + 1}`, en: `${loc.names.en} Costume ${idx + 1}`, ja: `${loc.names.ja}衣装${idx + 1}`, zh: `${loc.names.zh}服装${idx + 1}` },
    locationId: loc.id,
    categories: COSTUME_CATEGORIES.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2)),
    isActive: true,
    items: range(numItems).map(j => ({
      id: `sim-costume-item-${idx}-${j}`,
      name: `Costume Item ${j + 1}`,
      nameI18n: { ko: `의상 ${j+1}`, en: `Costume ${j+1}`, ja: `衣装${j+1}`, zh: `服装${j+1}` },
      category: pick(COSTUME_CATEGORIES),
      price: 50000 + Math.floor(Math.random() * 200000),
      sizes: ['S', 'M', 'L', 'XL', 'Free'].slice(0, 2 + Math.floor(Math.random() * 3)),
      isAvailable: Math.random() > 0.1,
    })),
  };
}

function generateVenueVendor(idx) {
  const loc = pick(LOCATIONS);
  const numItems = 2 + Math.floor(Math.random() * 3);
  return {
    id: `sim-venue-vendor-${idx}`,
    name: `${loc.names.en} Venue ${idx + 1}`,
    nameI18n: { ko: `${loc.names.ko} 장소 ${idx + 1}`, en: `${loc.names.en} Venue ${idx + 1}`, ja: `${loc.names.ja}会場${idx + 1}`, zh: `${loc.names.zh}场地${idx + 1}` },
    locationId: loc.id,
    categories: VENUE_CATEGORIES.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2)),
    isActive: true,
    items: range(numItems).map(j => ({
      id: `sim-venue-item-${idx}-${j}`,
      name: `Venue ${j + 1}`,
      nameI18n: { ko: `장소 ${j+1}`, en: `Venue ${j+1}`, ja: `会場${j+1}`, zh: `场地${j+1}` },
      category: pick(VENUE_CATEGORIES),
      capacity: 5 + Math.floor(Math.random() * 25),
      price: 100000 + Math.floor(Math.random() * 400000),
      priceUnit: pick(['per_session', 'per_hour', 'per_day']),
      amenities: ['parking', 'wifi', 'changing_room', 'ac', 'restroom'].slice(0, Math.floor(Math.random() * 5) + 1),
      isAvailable: Math.random() > 0.1,
    })),
  };
}

function generateCustomer(idx) {
  const lang = pick(['ko', 'en', 'ja', 'zh']);
  return {
    id: `sim-customer-${idx}`,
    name: generateName(lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' : 'en', idx),
    email: `customer${idx}@phosnap-sim.com`,
    preferredLang: lang,
    preferredCurrency: pick(CURRENCIES),
  };
}

// ─── Generate All Data ──────────────────────────────────────
console.log('🎬 Generating 350 accounts...\n');

const photographers = range(50).map(i => generatePhotographer(i, 'photographer'));
const videographers = range(50).map(i => generatePhotographer(i, 'videographer'));
const bothArtists = range(50).map(i => generatePhotographer(i, 'photovideo'));
const hmkArtists = range(50).map(i => generatePhotographer(i, 'hmk'));
const allArtists = [...photographers, ...videographers, ...bothArtists, ...hmkArtists];

const stylists = range(20).map(i => generateStylist(i));
const costumeVendors = range(50).map(i => generateCostumeVendor(i));
const venueVendors = range(50).map(i => generateVenueVendor(i));
const customers = range(50).map(i => generateCustomer(i));

console.log(`  📸 Photographers: ${photographers.length}`);
console.log(`  🎥 Videographers: ${videographers.length}`);
console.log(`  📸🎥 Both: ${bothArtists.length}`);
console.log(`  💄 HMK Artists: ${hmkArtists.length}`);
console.log(`  💇 Stylists: ${stylists.length}`);
console.log(`  👗 Costume Vendors: ${costumeVendors.length}`);
console.log(`  🏛️ Venue Vendors: ${venueVendors.length}`);
console.log(`  👤 Customers: ${customers.length}`);
console.log(`  Total: ${allArtists.length + stylists.length + costumeVendors.length + venueVendors.length + customers.length}`);

// ─── Generate Bookings ──────────────────────────────────────
console.log('\n📋 Generating bookings...');

const bookings = [];
const dates = [];
for (let m = 4; m <= 8; m++) {
  for (let d = 1; d <= 28; d++) {
    dates.push(`2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
}

const TIMES = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
const STATUSES = ['confirmed', 'pending', 'completed', 'cancelled'];

// Each customer makes 1-5 bookings
customers.forEach(customer => {
  const numBookings = 1 + Math.floor(Math.random() * 5);
  for (let b = 0; b < numBookings; b++) {
    const artist = pick(allArtists);
    const pkg = pick(artist.packages);
    const date = pick(dates);
    const time = pick(TIMES);

    const booking = {
      id: uuid(),
      customerId: customer.id,
      customerName: customer.name,
      artistId: artist.id,
      artistName: artist.name,
      artistType: artist.artistType,
      date,
      time,
      locationId: artist.locationId,
      packageName: pkg.name,
      packagePrice: pkg.price,
      status: pick(STATUSES),
      confirmType: artist.confirmType,
      pipeline: { artist: { id: artist.id, name: artist.name, type: artist.artistType } },
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 90 * 86400000)).toISOString(),
    };

    // Add stylist (40%)
    if (Math.random() > 0.6) {
      const stylist = pick(stylists);
      const svc = pick(stylist.services);
      booking.stylistId = stylist.id;
      booking.stylistName = stylist.name;
      booking.stylistPrice = svc.price;
      booking.stylistService = svc.name;
      booking.pipeline.stylist = { id: stylist.id, name: stylist.name };
    }

    // Add costume (30%)
    if (Math.random() > 0.7) {
      const vendor = pick(costumeVendors);
      const item = pick(vendor.items);
      booking.costumeVendorId = vendor.id;
      booking.costumeItemId = item.id;
      booking.costumeName = item.name;
      booking.costumePrice = item.price;
      booking.costumeSize = pick(item.sizes);
      booking.pipeline.costume = { id: item.id, name: item.name, size: booking.costumeSize };
    }

    // Add venue (25%)
    if (Math.random() > 0.75) {
      const vendor = pick(venueVendors);
      const item = pick(vendor.items);
      booking.venueVendorId = vendor.id;
      booking.venueItemId = item.id;
      booking.venueName = item.name;
      booking.venuePrice = item.price;
      booking.pipeline.venue = { id: item.id, name: item.name };
    }

    // Calculate total
    booking.totalPrice = (booking.packagePrice || 0) + (booking.stylistPrice || 0) + (booking.costumePrice || 0) + (booking.venuePrice || 0);

    bookings.push(booking);
  }
});

console.log(`  📋 Total bookings: ${bookings.length}`);

// ─── Generate Reviews ───────────────────────────────────────
console.log('\n⭐ Generating reviews...');

const reviews = [];
const unifiedReviews = [];
const REVIEW_TAGS = {
  artist: ['professional', 'friendly', 'creative', 'punctual', 'skilled', 'patient', 'fun'],
  stylist: ['skillful', 'on_time', 'gentle', 'experienced', 'creative'],
  costume: ['clean', 'variety', 'good_fit', 'beautiful', 'affordable'],
  venue: ['spacious', 'clean', 'beautiful', 'convenient', 'well_equipped'],
};
const REVIEW_COMMENTS = {
  ko: ['최고의 촬영이었어요!', '정말 만족합니다', '다음에도 이용할게요', '친절하고 프로페셔널해요', '추천합니다!', '기대 이상이었어요', '좋은 경험이었습니다'],
  en: ['Amazing experience!', 'Highly recommended', 'Will book again', 'Very professional', 'Exceeded expectations', 'Great service'],
  ja: ['最高の撮影でした！', '大満足です', 'また利用したいです', 'プロフェッショナルでした', 'おすすめします！'],
  zh: ['非常棒的体验！', '强烈推荐', '下次还会来', '非常专业', '超出预期'],
};

// Generate reviews for completed bookings
const completedBookings = bookings.filter(b => b.status === 'completed');
completedBookings.forEach(booking => {
  if (Math.random() > 0.3) { // 70% review rate
    const lang = pick(['ko', 'en', 'ja', 'zh']);
    const artistRating = 3 + Math.floor(Math.random() * 3);

    const review = {
      id: uuid(),
      bookingId: booking.id,
      customerId: booking.customerId,
      artistId: booking.artistId,
      rating: artistRating,
      text: pick(REVIEW_COMMENTS[lang]),
      tags: REVIEW_TAGS.artist.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3)),
      createdAt: booking.createdAt,
    };
    reviews.push(review);

    // Unified review if multiple vendors
    const unified = { bookingId: booking.id, reviews: {}, createdAt: booking.createdAt };
    unified.reviews.artist = { rating: artistRating, tags: review.tags, comment: review.text };

    if (booking.stylistId) {
      unified.reviews.stylist = {
        rating: 3 + Math.floor(Math.random() * 3),
        tags: REVIEW_TAGS.stylist.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2)),
        comment: pick(REVIEW_COMMENTS[lang]),
      };
    }
    if (booking.costumeItemId) {
      unified.reviews.costume = {
        rating: 3 + Math.floor(Math.random() * 3),
        tags: REVIEW_TAGS.costume.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2)),
        comment: pick(REVIEW_COMMENTS[lang]),
      };
    }
    if (booking.venueItemId) {
      unified.reviews.venue = {
        rating: 3 + Math.floor(Math.random() * 3),
        tags: REVIEW_TAGS.venue.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2)),
        comment: pick(REVIEW_COMMENTS[lang]),
      };
    }
    unifiedReviews.push(unified);
  }
});

// Generate review replies (30% of reviews)
const reviewReplies = [];
reviews.forEach(review => {
  if (Math.random() > 0.7) {
    reviewReplies.push({
      id: uuid(),
      reviewId: review.id,
      photographerId: review.artistId,
      body: pick(['감사합니다! 또 뵙겠습니다 😊', 'Thank you! Hope to see you again!', 'ありがとうございます！またお会いしましょう！', '谢谢！期待再见！']),
      createdAt: review.createdAt,
    });
  }
});

console.log(`  ⭐ Artist reviews: ${reviews.length}`);
console.log(`  📝 Unified reviews: ${unifiedReviews.length}`);
console.log(`  💬 Review replies: ${reviewReplies.length}`);

// ─── Generate Chat Data ─────────────────────────────────────
console.log('\n💬 Generating chat data...');

const chatRooms = {};
const CHAT_MESSAGES_KO = ['안녕하세요!', '촬영 관련 문의드려요', '시간 조율 가능할까요?', '감사합니다!', '네, 알겠습니다', '좋아요, 그렇게 하겠습니다'];
const CHAT_MESSAGES_EN = ['Hello!', 'Quick question about the shoot', 'Can we adjust the time?', 'Thank you!', 'Sounds great', 'Perfect, see you then'];

// Create chat for 30% of bookings
bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').forEach(booking => {
  if (Math.random() > 0.7) {
    const channelId = `booking-${booking.id}-photo`;
    chatRooms[channelId] = {
      messages: range(2 + Math.floor(Math.random() * 6)).map((_, i) => ({
        id: uuid(),
        senderId: i % 2 === 0 ? booking.customerId : booking.artistId,
        senderRole: i % 2 === 0 ? 'customer' : 'photographer',
        content: pick(Math.random() > 0.5 ? CHAT_MESSAGES_KO : CHAT_MESSAGES_EN),
        timestamp: Date.now() - (10 - i) * 3600000,
        isRead: Math.random() > 0.3,
      })),
      participants: [booking.customerId, booking.artistId],
    };

    // Add stylist chat channel if stylist exists
    if (booking.stylistId && Math.random() > 0.5) {
      const stylistChannelId = `booking-${booking.id}-stylist`;
      chatRooms[stylistChannelId] = {
        messages: range(1 + Math.floor(Math.random() * 3)).map((_, i) => ({
          id: uuid(),
          senderId: i % 2 === 0 ? booking.customerId : booking.stylistId,
          senderRole: i % 2 === 0 ? 'customer' : 'stylist',
          content: pick(CHAT_MESSAGES_KO),
          timestamp: Date.now() - (5 - i) * 3600000,
          isRead: Math.random() > 0.3,
        })),
        participants: [booking.customerId, booking.stylistId],
      };
    }
  }
});

console.log(`  💬 Chat rooms: ${Object.keys(chatRooms).length}`);

// ─── Statistics ─────────────────────────────────────────────
const stats = {
  accounts: {
    photographers: photographers.length,
    videographers: videographers.length,
    bothArtists: bothArtists.length,
    hmkArtists: hmkArtists.length,
    stylists: stylists.length,
    costumeVendors: costumeVendors.length,
    venueVendors: venueVendors.length,
    customers: customers.length,
    total: allArtists.length + stylists.length + costumeVendors.length + venueVendors.length + customers.length,
  },
  bookings: {
    total: bookings.length,
    byStatus: {
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
    },
    withStylist: bookings.filter(b => b.stylistId).length,
    withCostume: bookings.filter(b => b.costumeItemId).length,
    withVenue: bookings.filter(b => b.venueItemId).length,
    avgPrice: Math.round(bookings.reduce((a, b) => a + b.totalPrice, 0) / bookings.length),
  },
  reviews: {
    artistReviews: reviews.length,
    unifiedReviews: unifiedReviews.length,
    reviewReplies: reviewReplies.length,
    avgRating: +(reviews.reduce((a, r) => a + r.rating, 0) / (reviews.length || 1)).toFixed(1),
  },
  chats: {
    rooms: Object.keys(chatRooms).length,
    totalMessages: Object.values(chatRooms).reduce((a, r) => a + r.messages.length, 0),
  },
};

// ─── Output ─────────────────────────────────────────────────
const output = {
  generatedAt: new Date().toISOString(),
  stats,
  data: {
    photographers: allArtists,
    stylists,
    costumeVendors,
    venueVendors,
    customers,
    bookings,
    reviews,
    unifiedReviews,
    reviewReplies,
    chatRooms,
  },
  // localStorage keys for loading into browser
  localStoragePayload: {
    'phosnap_sim_bookings': JSON.stringify(bookings),
    'phosnap_unified_reviews': JSON.stringify(unifiedReviews),
    'phosnap_sim_reviews': JSON.stringify(reviews),
    'phosnap_sim_replies': JSON.stringify(reviewReplies),
    'phosnap_sim_chats': JSON.stringify(chatRooms),
  },
};

const outPath = path.join(__dirname, 'bulk-data.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log('\n' + '═'.repeat(50));
console.log('  BULK DATA GENERATION COMPLETE');
console.log('═'.repeat(50));
console.log(`  📊 Stats:`);
console.log(`     Accounts: ${stats.accounts.total}`);
console.log(`     Bookings: ${stats.bookings.total} (avg ₩${stats.bookings.avgPrice.toLocaleString()})`);
console.log(`       - with stylist: ${stats.bookings.withStylist}`);
console.log(`       - with costume: ${stats.bookings.withCostume}`);
console.log(`       - with venue: ${stats.bookings.withVenue}`);
console.log(`     Reviews: ${stats.reviews.artistReviews} (avg ${stats.reviews.avgRating}★)`);
console.log(`     Unified Reviews: ${stats.reviews.unifiedReviews}`);
console.log(`     Chat Rooms: ${stats.chats.rooms} (${stats.chats.totalMessages} messages)`);
console.log('─'.repeat(50));
console.log(`  📄 Output: ${outPath}`);
console.log(`  💾 Size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log('═'.repeat(50) + '\n');
