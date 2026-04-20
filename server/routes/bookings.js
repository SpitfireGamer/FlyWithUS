/* ═══════════════════════════════════════════════════════════════
   BOOKINGS API — Create and retrieve bookings
   ═══════════════════════════════════════════════════════════════ */
import { Router } from 'express';
import Booking from '../models/Booking.js';
import Schedule from '../models/Schedule.js';
import Airport from '../models/Airport.js';

const router = Router();

// POST /api/bookings — Create a new booking
router.post('/', async (req, res) => {
  try {
    const {
      scheduleId,
      departureDate,
      travelClass,
      contactEmail,
      contactPhone,
      passengers,
    } = req.body;

    // Validate required fields
    if (!scheduleId || !departureDate || !contactEmail || !passengers || passengers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: scheduleId, departureDate, contactEmail, passengers'
      });
    }

    // Find the schedule
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Flight schedule not found' });
    }

    // Get airport names
    const [depAirport, destAirport] = await Promise.all([
      Airport.findOne({ iata: schedule.departureIata }),
      Airport.findOne({ iata: schedule.destinationIata }),
    ]);

    // Calculate pricing
    const classKey = travelClass || 'economy';
    const pricePerPerson = schedule.price[classKey] || schedule.price.economy;
    const totalPrice = pricePerPerson * passengers.length;

    // Generate unique PNR
    let pnr;
    let pnrExists = true;
    while (pnrExists) {
      pnr = Booking.generatePNR();
      pnrExists = await Booking.findOne({ pnr });
    }

    // Create booking
    const booking = await Booking.create({
      pnr,
      scheduleId: schedule._id,
      flightNumber: schedule.flightNumber,
      airlineId: schedule.airlineId,
      departureIata: schedule.departureIata,
      destinationIata: schedule.destinationIata,
      departureName: depAirport?.name || schedule.departureIata,
      destinationName: destAirport?.name || schedule.destinationIata,
      departureDate: new Date(departureDate),
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      travelClass: classKey,
      contactEmail,
      contactPhone: contactPhone || '',
      passengers,
      passengerCount: passengers.length,
      pricePerPerson,
      totalPrice,
      status: 'confirmed',
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      data: {
        pnr: booking.pnr,
        flightNumber: booking.flightNumber,
        departure: { iata: booking.departureIata, name: booking.departureName, time: booking.departureTime },
        arrival: { iata: booking.destinationIata, name: booking.destinationName, time: booking.arrivalTime },
        departureDate: booking.departureDate,
        travelClass: booking.travelClass,
        passengers: booking.passengers,
        passengerCount: booking.passengerCount,
        pricePerPerson: booking.pricePerPerson,
        totalPrice: booking.totalPrice,
        status: booking.status,
        bookedAt: booking.bookedAt,
      }
    });
  } catch (error) {
    console.error('[Booking Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/lookup?pnr=ABC123&email=john@example.com — Customer booking lookup
router.get('/lookup', async (req, res) => {
  try {
    const { pnr, email } = req.query;
    if (!pnr || !email) {
      return res.status(400).json({ success: false, message: 'PNR and email are required' });
    }

    const booking = await Booking.findOne({
      pnr: pnr.toUpperCase(),
      contactEmail: email.toLowerCase(),
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
