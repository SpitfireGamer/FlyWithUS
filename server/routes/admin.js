/* ═══════════════════════════════════════════════════════════════
   ADMIN API — Protected routes for airline company
   ═══════════════════════════════════════════════════════════════ */
import { Router } from 'express';
import Booking from '../models/Booking.js';
import Airport from '../models/Airport.js';
import Route from '../models/Route.js';
import Schedule from '../models/Schedule.js';
import Airline from '../models/Airline.js';
import User from '../models/User.js';
import adminAuth from '../middleware/adminAuth.js';

const router = Router();

// POST /api/admin/login — Admin authentication
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: process.env.ADMIN_SECRET,
      message: 'Login successful'
    });
  }

  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// GET /api/admin/dashboard — Dashboard statistics
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const [
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      totalAirports,
      totalRoutes,
      totalSchedules,
      totalAirlines,
      totalUsers,
      verifiedUsers,
      googleUsers,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Airport.countDocuments(),
      Route.countDocuments(),
      Schedule.countDocuments(),
      Airline.countDocuments(),
      User.countDocuments(),
      User.countDocuments({ verified: true }),
      User.countDocuments({ googleId: { $exists: true, $ne: null } }),
    ]);

    // Revenue
    const revenueResult = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' }, avgPrice: { $avg: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;
    const avgBookingValue = revenueResult[0]?.avgPrice || 0;

    // Popular routes
    const popularRoutes = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: {
        _id: { from: '$departureIata', to: '$destinationIata' },
        count: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
      }},
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Recent bookings
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('pnr flightNumber departureIata destinationIata departureDate travelClass passengerCount totalPrice status createdAt contactEmail');

    // Class distribution
    const classDistribution = await Booking.aggregate([
      { $group: { _id: '$travelClass', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalBookings,
          confirmedBookings,
          cancelledBookings,
          totalRevenue: Math.round(totalRevenue),
          avgBookingValue: Math.round(avgBookingValue),
          totalAirports,
          totalRoutes,
          totalSchedules,
          totalAirlines,
          totalUsers,
          verifiedUsers,
          googleUsers,
          totalPassengers: await Booking.aggregate([
            { $group: { _id: null, total: { $sum: '$passengerCount' } } }
          ]).then(r => r[0]?.total || 0),
        },
        popularRoutes,
        recentBookings,
        classDistribution,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/bookings — List all bookings (paginated, filterable)
router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, from, to, date, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (from) filter.departureIata = from.toUpperCase();
    if (to) filter.destinationIata = to.toUpperCase();
    if (date) {
      const d = new Date(date);
      filter.departureDate = {
        $gte: new Date(d.setHours(0, 0, 0, 0)),
        $lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    }
    if (search) {
      filter.$or = [
        { pnr: new RegExp(search, 'i') },
        { contactEmail: new RegExp(search, 'i') },
        { flightNumber: new RegExp(search, 'i') },
      ];
    }

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: bookings,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/bookings/:id — Update booking status
router.patch('/bookings/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/bookings/:id/cancel — Cancel a booking
router.patch('/bookings/:id/cancel', adminAuth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: booking, message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/users — List all registered users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const users = await User.find(filter)
      .select('-password -verificationCode -verificationExpiry -__v')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/users/:id — Delete a user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
