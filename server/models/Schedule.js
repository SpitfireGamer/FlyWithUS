import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  airlineId: { type: String, required: true },
  flightNumber: { type: String, required: true },
  departureIata: { type: String, required: true },
  destinationIata: { type: String, required: true },
  departureTime: { type: String, required: true }, // "06:30"
  arrivalTime: { type: String, required: true },   // "09:15"
  duration: { type: Number, required: true },       // minutes
  daysOfWeek: [{ type: Number }],                   // 0=Sun, 1=Mon, ... 6=Sat
  aircraft: { type: String, default: 'A320' },
  price: {
    economy: { type: Number, default: 0 },
    premiumEconomy: { type: Number, default: 0 },
    business: { type: Number, default: 0 },
    first: { type: Number, default: 0 },
  },
  stops: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

scheduleSchema.index({ departureIata: 1, destinationIata: 1 });
scheduleSchema.index({ flightNumber: 1 });

export default mongoose.model('Schedule', scheduleSchema);
