import mongoose from 'mongoose';

const aircraftSchema = new mongoose.Schema({
  model: { type: String, required: true },
  manufacturer: { type: String, required: true },
  iataCode: { type: String, default: '' },
  capacity: {
    economy: { type: Number, default: 150 },
    premiumEconomy: { type: Number, default: 40 },
    business: { type: Number, default: 30 },
    first: { type: Number, default: 10 },
  },
  range: { type: Number, default: 5000 }, // km
  cruiseSpeed: { type: Number, default: 850 }, // km/h
}, { timestamps: true });

export default mongoose.model('Aircraft', aircraftSchema);
