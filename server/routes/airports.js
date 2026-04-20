/* ═══════════════════════════════════════════════════════════════
   AIRPORTS API — Search & list airports
   ═══════════════════════════════════════════════════════════════ */
import { Router } from 'express';
import Airport from '../models/Airport.js';

const router = Router();

// GET /api/airports — List all airports (paginated)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, country } = req.query;
    const filter = {};
    if (country) filter.country = new RegExp(country, 'i');

    const airports = await Airport.find(filter)
      .select('iata icao name city country latitude longitude')
      .sort({ name: 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Airport.countDocuments(filter);

    res.json({ success: true, data: airports, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/airports/search?q=mum — Autocomplete search
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(q, 'i');
    const airports = await Airport.find({
      $or: [
        { iata: regex },
        { icao: regex },
        { name: regex },
        { city: regex },
        { country: regex },
      ]
    })
      .select('iata icao name city country latitude longitude')
      .sort({ name: 1 })
      .limit(20);

    res.json({ success: true, data: airports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/airports/countries — List all unique countries
router.get('/countries', async (req, res) => {
  try {
    const countries = await Airport.distinct('country');
    res.json({ success: true, data: countries.filter(c => c).sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/airports/:iata — Get single airport
router.get('/:iata', async (req, res) => {
  try {
    const airport = await Airport.findOne({ iata: req.params.iata.toUpperCase() });
    if (!airport) return res.status(404).json({ success: false, message: 'Airport not found' });
    res.json({ success: true, data: airport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
