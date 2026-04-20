/* ═══════════════════════════════════════════════════════════════
   DATABASE SEEDER — Parses CSV datasets and populates MongoDB
   ═══════════════════════════════════════════════════════════════ */
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

// Load .env from project root
dotenv.config({ path: join(ROOT, '.env') });

import mongoose from 'mongoose';
import { parse } from 'csv-parse/sync';
import connectDB from '../config/db.js';
import Airline from '../models/Airline.js';
import Airport from '../models/Airport.js';
import Route from '../models/Route.js';
import Aircraft from '../models/Aircraft.js';
import Schedule from '../models/Schedule.js';

// ═══ HELPERS ═══
function readCSV(filePath, options = {}) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return parse(content, { columns: true, skip_empty_lines: true, trim: true, ...options });
  } catch (e) {
    console.warn(`  ⚠ Could not read ${filePath}: ${e.message}`);
    return [];
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTime() {
  const h = String(randomInt(0, 23)).padStart(2, '0');
  const m = ['00', '15', '30', '45'][randomInt(0, 3)];
  return `${h}:${m}`;
}

function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor((total % 1440) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// ═════════════════════════════════════
// SEED AIRPORTS
// ═════════════════════════════════════
async function seedAirports() {
  console.log('\n✈  Seeding Airports...');

  // Parse Full_Merge airports (has IATA, lat, lng)
  const mergedAirports = readCSV(join(ROOT, 'dataset', 'archive (3)', 'Full_Merge_of_All_Unique Airports.csv'));

  // Parse detailed airports.csv (has country, region, type, etc.)
  const detailedAirports = readCSV(join(ROOT, 'dataset', 'archive (2)', 'airports.csv'));

  // Build lookup from detailed airports
  const detailsMap = {};
  for (const row of detailedAirports) {
    const iata = row.iata_code || row.iata || '';
    if (iata && iata.length >= 2) {
      detailsMap[iata.toUpperCase()] = {
        icao: row.icao_code || row.ident || '',
        name: row.name || '',
        city: row.municipality || '',
        country: row.iso_country || '',
        region: row.iso_region || '',
        latitude: parseFloat(row.latitude_deg) || 0,
        longitude: parseFloat(row.longitude_deg) || 0,
        elevation: parseFloat(row.elevation_ft) || 0,
        timezone: row.timezone || '',
        type: row.type || 'airport',
        scheduledService: row.scheduled_service === 'yes',
      };
    }
  }

  const airports = [];
  const seen = new Set();

  // First, process merged airports (primary source with IATA codes)
  for (const row of mergedAirports) {
    const iata = (row.ID || row.IATA || '').toUpperCase().trim();
    if (!iata || iata.length < 2 || iata.length > 4 || seen.has(iata)) continue;
    seen.add(iata);

    const details = detailsMap[iata] || {};
    airports.push({
      iata,
      icao: details.icao || '',
      name: row.Label || details.name || iata,
      city: details.city || (row.Label || '').replace(/\s*(Airport|Intl|International).*$/i, '').trim(),
      country: details.country || '',
      countryCode: details.country || '',
      region: details.region || '',
      latitude: parseFloat(row.Latitude) || details.latitude || 0,
      longitude: parseFloat(row.Longitude) || details.longitude || 0,
      elevation: details.elevation || 0,
      timezone: details.timezone || '',
      type: details.type || 'airport',
      scheduledService: details.scheduledService ?? true,
    });
  }

  // Add from detailed list if missed
  for (const [iata, details] of Object.entries(detailsMap)) {
    if (!seen.has(iata) && iata.length >= 2 && iata.length <= 4 && details.scheduledService) {
      seen.add(iata);
      airports.push({
        iata,
        icao: details.icao,
        name: details.name,
        city: details.city,
        country: details.country,
        countryCode: details.country,
        region: details.region,
        latitude: details.latitude,
        longitude: details.longitude,
        elevation: details.elevation,
        timezone: details.timezone,
        type: details.type,
        scheduledService: true,
      });
    }
  }

  // Bulk insert
  await Airport.deleteMany({});
  if (airports.length > 0) {
    // Process in batches to avoid memory issues
    const batchSize = 500;
    for (let i = 0; i < airports.length; i += batchSize) {
      const batch = airports.slice(i, i + batchSize);
      await Airport.insertMany(batch, { ordered: false }).catch(() => {});
    }
  }

  const count = await Airport.countDocuments();
  console.log(`  ✓ Seeded ${count} airports`);
  return count;
}

// ═════════════════════════════════════
// SEED ROUTES & AIRLINES
// ═════════════════════════════════════
async function seedRoutes() {
  console.log('\n🛫 Seeding Routes & Airlines...');

  const routesCSV = readCSV(join(ROOT, 'dataset', 'archive (3)', 'Full_Merge_of_All_Unique_Routes.csv'));

  // Get all valid airport IATA codes from DB
  const validAirports = new Set(
    (await Airport.find({}).select('iata -_id').lean()).map(a => a.iata)
  );

  const airlines = new Map();
  const routes = [];
  const routeKeys = new Set();

  for (const row of routesCSV) {
    const airlineId = (row['Airline ID'] || '').trim();
    const dep = (row.Departure || '').toUpperCase().trim();
    const dest = (row.Destination || '').toUpperCase().trim();

    if (!airlineId || !dep || !dest || dep === dest) continue;
    if (!validAirports.has(dep) || !validAirports.has(dest)) continue;

    const key = `${airlineId}-${dep}-${dest}`;
    if (routeKeys.has(key)) continue;
    routeKeys.add(key);

    // Collect unique airlines
    if (!airlines.has(airlineId)) {
      airlines.set(airlineId, { airlineId, name: `Airline ${airlineId}`, iata: airlineId });
    }

    routes.push({ airlineId, departureIata: dep, destinationIata: dest });
  }

  // Insert airlines
  await Airline.deleteMany({});
  const airlineArray = Array.from(airlines.values());
  if (airlineArray.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < airlineArray.length; i += batchSize) {
      await Airline.insertMany(airlineArray.slice(i, i + batchSize), { ordered: false }).catch(() => {});
    }
  }

  // Insert routes
  await Route.deleteMany({});
  if (routes.length > 0) {
    const batchSize = 1000;
    for (let i = 0; i < routes.length; i += batchSize) {
      await Route.insertMany(routes.slice(i, i + batchSize), { ordered: false }).catch(() => {});
    }
  }

  const aCount = await Airline.countDocuments();
  const rCount = await Route.countDocuments();
  console.log(`  ✓ Seeded ${aCount} airlines`);
  console.log(`  ✓ Seeded ${rCount} routes`);
  return rCount;
}

// ═════════════════════════════════════
// SEED AIRCRAFTS
// ═════════════════════════════════════
async function seedAircrafts() {
  console.log('\n🛩  Seeding Aircraft Fleet...');

  const fleet = [
    { model: 'A320', manufacturer: 'Airbus', iataCode: '320', capacity: { economy: 150, premiumEconomy: 24, business: 12, first: 0 }, range: 6100, cruiseSpeed: 840 },
    { model: 'A321', manufacturer: 'Airbus', iataCode: '321', capacity: { economy: 185, premiumEconomy: 28, business: 16, first: 0 }, range: 5950, cruiseSpeed: 840 },
    { model: 'A330', manufacturer: 'Airbus', iataCode: '330', capacity: { economy: 222, premiumEconomy: 40, business: 36, first: 0 }, range: 11750, cruiseSpeed: 870 },
    { model: 'A350', manufacturer: 'Airbus', iataCode: '350', capacity: { economy: 280, premiumEconomy: 56, business: 42, first: 8 }, range: 15000, cruiseSpeed: 903 },
    { model: 'A380', manufacturer: 'Airbus', iataCode: '380', capacity: { economy: 399, premiumEconomy: 76, business: 80, first: 14 }, range: 14800, cruiseSpeed: 900 },
    { model: 'B737', manufacturer: 'Boeing', iataCode: '737', capacity: { economy: 162, premiumEconomy: 0, business: 12, first: 0 }, range: 5600, cruiseSpeed: 830 },
    { model: 'B777', manufacturer: 'Boeing', iataCode: '777', capacity: { economy: 312, premiumEconomy: 52, business: 48, first: 14 }, range: 15840, cruiseSpeed: 892 },
    { model: 'B787', manufacturer: 'Boeing', iataCode: '787', capacity: { economy: 234, premiumEconomy: 42, business: 35, first: 8 }, range: 14140, cruiseSpeed: 903 },
    { model: 'E190', manufacturer: 'Embraer', iataCode: 'E90', capacity: { economy: 96, premiumEconomy: 0, business: 8, first: 0 }, range: 4537, cruiseSpeed: 823 },
  ];

  await Aircraft.deleteMany({});
  await Aircraft.insertMany(fleet);
  console.log(`  ✓ Seeded ${fleet.length} aircraft types`);
}

// ═════════════════════════════════════
// GENERATE SCHEDULES
// ═════════════════════════════════════
async function seedSchedules() {
  console.log('\n📅 Generating Flight Schedules...');

  const routes = await Route.find({}).lean();
  const aircraftModels = ['A320', 'A321', 'A330', 'A350', 'B737', 'B777', 'B787'];
  const schedules = [];

  let flightCounter = 100;

  for (const route of routes) {
    // Each route gets 1-3 daily flights
    const numFlights = randomInt(1, 3);

    for (let f = 0; f < numFlights; f++) {
      const depTime = randomTime();
      const duration = randomInt(60, 720); // 1h to 12h
      const arrTime = addMinutes(depTime, duration);
      const aircraft = aircraftModels[randomInt(0, aircraftModels.length - 1)];

      // Base price based on duration
      const basePrice = Math.round(30 + duration * 0.5 + randomInt(0, 100));

      // Generate days of operation (most flights run daily, some 3-5 days)
      const allDays = [0, 1, 2, 3, 4, 5, 6];
      const operatingDays = Math.random() > 0.3
        ? allDays // 70% daily
        : allDays.filter(() => Math.random() > 0.4); // partial week

      schedules.push({
        routeId: route._id,
        airlineId: route.airlineId,
        flightNumber: `${route.airlineId}${flightCounter++}`,
        departureIata: route.departureIata,
        destinationIata: route.destinationIata,
        departureTime: depTime,
        arrivalTime: arrTime,
        duration,
        daysOfWeek: operatingDays.length > 0 ? operatingDays : allDays,
        aircraft,
        price: {
          economy: basePrice,
          premiumEconomy: Math.round(basePrice * 1.6),
          business: Math.round(basePrice * 3.2),
          first: Math.round(basePrice * 5.5),
        },
        stops: Math.random() > 0.85 ? 1 : 0,
        active: true,
      });
    }
  }

  await Schedule.deleteMany({});
  if (schedules.length > 0) {
    const batchSize = 1000;
    for (let i = 0; i < schedules.length; i += batchSize) {
      await Schedule.insertMany(schedules.slice(i, i + batchSize), { ordered: false }).catch(() => {});
    }
  }

  const count = await Schedule.countDocuments();
  console.log(`  ✓ Generated ${count} flight schedules`);
}

// ═════════════════════════════════════
// MAIN
// ═════════════════════════════════════
async function seed() {
  console.log('═══════════════════════════════════════════════');
  console.log('  ✈  FLYWITHUS — DATABASE SEEDER');
  console.log('═══════════════════════════════════════════════');

  await connectDB();

  const t0 = Date.now();
  await seedAirports();
  await seedRoutes();
  await seedAircrafts();
  await seedSchedules();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  ✅ Seeding complete in ${elapsed}s`);
  console.log(`═══════════════════════════════════════════════\n`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
