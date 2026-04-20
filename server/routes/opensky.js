/* ═══════════════════════════════════════════════════════════════
   OPENSKY API PROXY — Live flight data with caching
   ═══════════════════════════════════════════════════════════════ */
import { Router } from 'express';

const router = Router();

// In-memory cache to avoid rate-limiting (keyed by region)
let cache = {};
const CACHE_TTL = 15000; // 15 seconds

// GET /api/opensky/live — All aircraft currently in flight
// Supports optional bbox filtering: ?lamin=20&lomin=-20&lamax=60&lomax=80
router.get('/live', async (req, res) => {
  try {
    const now = Date.now();
    const { lamin, lomin, lamax, lomax } = req.query;
    const hasRegion = lamin && lomin && lamax && lomax;

    // Create separate cache keys for global vs regional
    const cacheKey = hasRegion ? `region_${lamin}_${lomin}_${lamax}_${lomax}` : 'global';

    // Return cached data if fresh
    if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_TTL) {
      return res.json(cache[cacheKey].data);
    }

    const baseUrl = process.env.OPENSKY_BASE_URL || 'https://opensky-network.org/api';
    let url = `${baseUrl}/states/all`;
    if (hasRegion) {
      url += `?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    }

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Return stale cache if available
      if (cache[cacheKey]) return res.json(cache[cacheKey].data);
      throw new Error(`OpenSky responded with ${response.status}`);
    }

    const raw = await response.json();

    // Transform states into a cleaner format
    const states = (raw.states || []).slice(0, 5000).map(s => ({
      icao24: s[0],
      callsign: (s[1] || '').trim(),
      originCountry: s[2],
      longitude: s[5],
      latitude: s[6],
      altitude: s[7] || s[13],
      onGround: s[8],
      velocity: s[9],
      heading: s[10],
      verticalRate: s[11],
      squawk: s[14],
    })).filter(s => s.latitude && s.longitude && !s.onGround);

    const result = {
      success: true,
      time: raw.time,
      count: states.length,
      totalAircraft: states.length,
      states,
      data: states, // Backward compat for LiveTracker component
    };

    // Update cache
    cache[cacheKey] = { data: result, timestamp: now };

    res.json(result);
  } catch (error) {
    console.error('[OpenSky]', error.message);
    // Return stale cache if available
    const cacheKey = 'global';
    if (cache[cacheKey]) return res.json(cache[cacheKey].data);
    res.status(502).json({ success: false, message: 'OpenSky API unavailable', states: [], data: [] });
  }
});

// GET /api/opensky/aircraft/:icao24 — Single aircraft details
router.get('/aircraft/:icao24', async (req, res) => {
  try {
    const baseUrl = process.env.OPENSKY_BASE_URL || 'https://opensky-network.org/api';
    const response = await fetch(`${baseUrl}/states/all?icao24=${req.params.icao24}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Aircraft not found');
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

export default router;
