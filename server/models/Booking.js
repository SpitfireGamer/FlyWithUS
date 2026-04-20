import mongoose from 'mongoose';

const passengerSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: String, default: '' },
  passportNumber: { type: String, default: '' },
  nationality: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  seatPreference: { type: String, enum: ['window', 'middle', 'aisle', 'none'], default: 'none' },
});

const bookingSchema = new mongoose.Schema({
  pnr: { type: String, required: true, unique: true, index: true },
  scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
  flightNumber: { type: String, required: true },
  airlineId: { type: String, required: true },

  // Route info
  departureIata: { type: String, required: true },
  destinationIata: { type: String, required: true },
  departureName: { type: String, default: '' },
  destinationName: { type: String, default: '' },

  // Flight details
  departureDate: { type: Date, required: true },
  departureTime: { type: String, required: true },
  arrivalTime: { type: String, required: true },
  travelClass: { type: String, enum: ['economy', 'premiumEconomy', 'business', 'first'], default: 'economy' },

  // Contact info
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, default: '' },

  // Passengers
  passengers: [passengerSchema],
  passengerCount: { type: Number, default: 1 },

  // Pricing
  pricePerPerson: { type: Number, required: true },
  totalPrice: { type: Number, required: true },

  // Status
  status: {
    type: String,
    enum: ['confirmed', 'pending', 'cancelled', 'completed'],
    default: 'confirmed'
  },

  // Metadata
  bookedAt: { type: Date, default: Date.now },
}, { timestamps: true });

bookingSchema.index({ contactEmail: 1 });
bookingSchema.index({ departureDate: 1 });
bookingSchema.index({ status: 1 });

// Generate a unique PNR
bookingSchema.statics.generatePNR = function () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
};

export default mongoose.model('Booking', bookingSchema);
