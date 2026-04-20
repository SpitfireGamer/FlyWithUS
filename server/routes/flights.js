/* ═══════════════════════════════════════════════════════════════
   FLIGHTS SEARCH API
   User selects: Mumbai → Delhi, Date → Backend queries routes & schedules
   ═══════════════════════════════════════════════════════════════ */
import { Router } from 'express';
import Schedule from '../models/Schedule.js';
import Airport from '../models/Airport.js';
import Airline from '../models/Airline.js';

const router = Router();

// GET /api/flights/search?from=BOM&to=DEL&date=2026-04-25&class=economy
router.get('/search', async (req, res) => {
  try {
    const { from, to, date, travelClass = 'economy' } = req.query;

    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'From and To airports are required' });
    }

    // Validate airports exist
    const [depAirport, arrAirport] = await Promise.all([
      Airport.findOne({ iata: from.toUpperCase() }),
      Airport.findOne({ iata: to.toUpperCase() }),
    ]);

    if (!depAirport) return res.status(404).json({ success: false, message: `Departure airport ${from} not found` });
    if (!arrAirport) return res.status(404).json({ success: false, message: `Destination airport ${to} not found` });

    // Build schedule query
    const query = {
      departureIata: from.toUpperCase(),
      destinationIata: to.toUpperCase(),
      active: true,
    };

    // If date provided, filter by day of week
    if (date) {
      const dayOfWeek = new Date(date).getDay();
      query.daysOfWeek = dayOfWeek;
    }

    const schedules = await Schedule.find(query).sort({ 'price.economy': 1 });

    // Enrich with airport and airline info
    const flights = await Promise.all(schedules.map(async (schedule) => {
      const airline = await Airline.findOne({ airlineId: schedule.airlineId });

      return {
        scheduleId: schedule._id,
        flightNumber: schedule.flightNumber,
        airline: {
          id: schedule.airlineId,
          name: airline?.name || schedule.airlineId,
        },
        departure: {
          iata: depAirport.iata,
          name: depAirport.name,
          city: depAirport.city,
          country: depAirport.country,
          time: schedule.departureTime,
        },
        arrival: {
          iata: arrAirport.iata,
          name: arrAirport.name,
          city: arrAirport.city,
          country: arrAirport.country,
          time: schedule.arrivalTime,
        },
        duration: schedule.duration,
        aircraft: schedule.aircraft,
        stops: schedule.stops,
        price: schedule.price,
        selectedClassPrice: schedule.price[travelClass] || schedule.price.economy,
        daysOfWeek: schedule.daysOfWeek,
      };
    }));

    res.json({
      success: true,
      data: flights,
      meta: {
        from: { iata: depAirport.iata, name: depAirport.name, city: depAirport.city },
        to: { iata: arrAirport.iata, name: arrAirport.name, city: arrAirport.city },
        date,
        travelClass,
        totalResults: flights.length,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/flights/popular — Popular routes for homepage
router.get('/popular', async (req, res) => {
  try {
    const popular = await Schedule.aggregate([
      { $match: { active: true } },
      { $group: {
        _id: { dep: '$departureIata', dest: '$destinationIata' },
        minPrice: { $min: '$price.economy' },
        flightCount: { $sum: 1 },
      }},
      { $sort: { flightCount: -1 } },
      { $limit: 12 },
    ]);

    // Enrich with airport names
    const enriched = await Promise.all(popular.map(async (p) => {
      const [dep, dest] = await Promise.all([
        Airport.findOne({ iata: p._id.dep }).select('iata name city country'),
        Airport.findOne({ iata: p._id.dest }).select('iata name city country'),
      ]);
      return {
        departure: dep,
        destination: dest,
        minPrice: p.minPrice,
        flightCount: p.flightCount,
      };
    }));

    res.json({ success: true, data: enriched.filter(e => e.departure && e.destination) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
