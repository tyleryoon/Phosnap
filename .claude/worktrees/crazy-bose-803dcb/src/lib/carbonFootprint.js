/**
 * 탄소발자국 트래킹 (ESG)
 * All calculations based on industry standard emission factors
 */

// Emission factors (kg CO₂e per unit)
const EMISSION_FACTORS = {
  newDress: 33.4,        // Average carbon footprint of manufacturing a new dress
  dressRental: 2.1,      // Carbon footprint of rental logistics (cleaning, transport)
  carPerKm: 0.21,        // Average car emission per km
  publicTransitPerKm: 0.089, // Bus/train per km
  newSuit: 28.6,         // New suit manufacturing
  suitRental: 1.8,       // Suit rental logistics
  newAccessory: 8.2,     // New accessory manufacturing
  accessoryRental: 0.5,  // Accessory rental logistics
  studioSession: 1.5,    // Electricity for studio lighting per hour
  outdoorSession: 0.2,   // Minimal (just transport)
};

/**
 * Calculates CO₂ savings from dress/accessory rental
 * @param {string} itemType - Type of item ('dress', 'suit', 'accessory')
 * @param {number} quantity - Number of items rented
 * @returns {Object} Savings metrics with trees equivalent
 */
export function calculateDressRentalSaving(itemType = 'dress', quantity = 1) {
  const factorMap = {
    dress: { new: EMISSION_FACTORS.newDress, rental: EMISSION_FACTORS.dressRental },
    suit: { new: EMISSION_FACTORS.newSuit, rental: EMISSION_FACTORS.suitRental },
    accessory: { new: EMISSION_FACTORS.newAccessory, rental: EMISSION_FACTORS.accessoryRental },
  };

  const factors = factorMap[itemType] || factorMap.dress;
  const savedPerItem = factors.new - factors.rental;
  const totalSaved = savedPerItem * quantity;

  // 1 tree absorbs ~21 kg CO₂ per year on average
  const treesEquivalent = Math.round((totalSaved / 21) * 100) / 100;

  // Average car emits 4.6 metric tons CO₂ per 10,000 km
  // = 0.46 kg per km, but typical urban driving is lower
  const equivalentDriving = Math.round((totalSaved / EMISSION_FACTORS.carPerKm) * 10) / 10;

  return {
    savedCO2: Math.round(totalSaved * 100) / 100,
    equivalentTrees: treesEquivalent,
    equivalentDriving: equivalentDriving,
  };
}

/**
 * Calculates transport emissions for a journey
 * @param {number} distanceKm - Distance traveled in kilometers
 * @param {string} mode - Transport mode ('car', 'publicTransit', 'bike', 'walk')
 * @returns {Object} Emission and mode information
 */
export function calculateTransportEmission(distanceKm, mode = 'car') {
  const modeMap = {
    car: EMISSION_FACTORS.carPerKm,
    publicTransit: EMISSION_FACTORS.publicTransitPerKm,
    bike: 0,
    walk: 0,
  };

  const emissionPerKm = modeMap[mode] || modeMap.car;
  const emission = Math.round(distanceKm * emissionPerKm * 100) / 100;

  const modeLabels = {
    car: 'Car',
    publicTransit: 'Public Transit',
    bike: 'Bicycle',
    walk: 'Walking',
  };

  return {
    emission,
    mode: modeLabels[mode] || mode,
  };
}

/**
 * Calculates total carbon footprint of a booking
 * @param {Object} booking - Booking object with details
 * @param {boolean} booking.hasRental - Whether items were rented
 * @param {Array} booking.rentalItems - Array of {type, quantity} rented items
 * @param {number} booking.distanceKm - Distance traveled
 * @param {string} booking.transportMode - Transport mode ('car', 'publicTransit', etc.)
 * @param {string} booking.sessionType - 'studio' or 'outdoor'
 * @param {number} booking.durationHours - Session duration in hours
 * @returns {Object} Detailed breakdown of carbon footprint
 */
export function calculateBookingFootprint(booking) {
  const {
    hasRental = false,
    rentalItems = [],
    distanceKm = 0,
    transportMode = 'car',
    sessionType = 'outdoor',
    durationHours = 1,
  } = booking;

  let rentalEmission = 0;
  let rentalSaved = 0;

  // Calculate rental emissions
  if (hasRental && rentalItems.length > 0) {
    rentalItems.forEach(({ type, quantity = 1 }) => {
      const saving = calculateDressRentalSaving(type, quantity);
      rentalSaved += saving.savedCO2;

      const factorMap = {
        dress: EMISSION_FACTORS.dressRental,
        suit: EMISSION_FACTORS.suitRental,
        accessory: EMISSION_FACTORS.accessoryRental,
      };

      rentalEmission += (factorMap[type] || EMISSION_FACTORS.dressRental) * quantity;
    });
  }

  // Calculate transport emissions
  const transportEmission = calculateTransportEmission(distanceKm, transportMode).emission;

  // Calculate session emissions
  const sessionEmissionPerHour = sessionType === 'studio'
    ? EMISSION_FACTORS.studioSession
    : EMISSION_FACTORS.outdoorSession;
  const sessionEmission = Math.round(sessionEmissionPerHour * durationHours * 100) / 100;

  const totalEmission = Math.round((rentalEmission + transportEmission + sessionEmission) * 100) / 100;
  const totalSaved = Math.round(rentalSaved * 100) / 100;
  const netImpact = Math.round((totalSaved - totalEmission) * 100) / 100;

  return {
    totalEmission,
    totalSaved,
    netImpact,
    breakdown: {
      rental: Math.round(rentalEmission * 100) / 100,
      transport: Math.round(transportEmission * 100) / 100,
      session: sessionEmission,
    },
  };
}

/**
 * Calculates cumulative environmental impact for a user
 * @param {Array} bookings - Array of booking objects
 * @returns {Object} User's eco score and impact metrics
 */
export function calculateUserCumulativeImpact(bookings) {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    return {
      totalSaved: 0,
      totalEmission: 0,
      netSaved: 0,
      treesEquivalent: 0,
      ecoScore: 0,
      level: 'seedling',
      badge_ko: '새싹',
      badge_en: 'Seedling',
    };
  }

  let totalSaved = 0;
  let totalEmission = 0;
  let rentalCount = 0;

  bookings.forEach((booking) => {
    const footprint = calculateBookingFootprint(booking);
    totalEmission += footprint.totalEmission;
    totalSaved += footprint.totalSaved;
    if (booking.hasRental) rentalCount += 1;
  });

  const netSaved = Math.round((totalSaved - totalEmission) * 100) / 100;
  const treesEquivalent = Math.round((netSaved / 21) * 100) / 100;

  // Eco score calculation (0-100)
  // Based on: rental usage, net impact, booking count
  const rentalRatio = bookings.length > 0 ? rentalCount / bookings.length : 0;
  const rentalScore = Math.min(rentalRatio * 100, 40);
  const impactScore = Math.min(Math.abs(netSaved) / 10, 40);
  const volumeScore = Math.min(bookings.length * 5, 20);
  const ecoScore = Math.round(rentalScore + impactScore + volumeScore);

  // Determine level based on eco score
  let level = 'seedling'; // 0-20
  let badge_ko = '새싹';
  let badge_en = 'Seedling';

  if (ecoScore >= 80) {
    level = 'forest';
    badge_ko = '숲';
    badge_en = 'Forest';
  } else if (ecoScore >= 60) {
    level = 'tree';
    badge_ko = '나무';
    badge_en = 'Tree';
  } else if (ecoScore >= 40) {
    level = 'sprout';
    badge_ko = '싹';
    badge_en = 'Sprout';
  }

  return {
    totalSaved: Math.round(totalSaved * 100) / 100,
    totalEmission: Math.round(totalEmission * 100) / 100,
    netSaved: netSaved,
    treesEquivalent,
    ecoScore: Math.min(ecoScore, 100),
    level,
    badge_ko,
    badge_en,
  };
}

/**
 * Calculates platform-wide environmental impact
 * @param {Array} allBookings - All bookings across platform
 * @returns {Object} Platform impact metrics
 */
export function calculatePlatformImpact(allBookings) {
  if (!Array.isArray(allBookings) || allBookings.length === 0) {
    return {
      totalCO2Saved: 0,
      totalRentals: 0,
      treesEquivalent: 0,
      carsOffRoad: 0,
    };
  }

  let totalSaved = 0;
  let totalRentals = 0;

  allBookings.forEach((booking) => {
    const footprint = calculateBookingFootprint(booking);
    totalSaved += footprint.totalSaved;

    if (booking.hasRental && booking.rentalItems) {
      totalRentals += booking.rentalItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }
  });

  const treesEquivalent = Math.round((totalSaved / 21) * 100) / 100;
  // Average car drives ~12,000 km/year = ~2,600 kg CO₂
  const carsOffRoad = Math.round((totalSaved / 2600) * 100) / 100;

  return {
    totalCO2Saved: Math.round(totalSaved * 100) / 100,
    totalRentals: totalRentals,
    treesEquivalent: treesEquivalent,
    carsOffRoad: carsOffRoad,
  };
}

/**
 * Formats CO₂ value with appropriate units
 * @param {number} kg - Carbon dioxide in kilograms
 * @returns {string} Formatted string with appropriate unit
 */
export function formatCO2(kg) {
  if (kg >= 1000) {
    const tons = Math.round((kg / 1000) * 100) / 100;
    return `${tons} 톤`;
  }
  if (kg >= 1) {
    const rounded = Math.round(kg * 100) / 100;
    return `${rounded} kg`;
  }
  const grams = Math.round(kg * 1000);
  return `${grams} g`;
}
