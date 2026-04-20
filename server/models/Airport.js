import mongoose from 'mongoose';

const airportSchema = new mongoose.Schema({
  iata: { type: String, required: true, index: true },
  icao: { type: String, default: '' },
  name: { type: String, required: true },
  city: { type: String, default: '' },
  country: { type: String, default: '' },
  countryCode: { type: String, default: '' },
  region: { type: String, default: '' },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  elevation: { type: Number, default: 0 },
  timezone: { type: String, default: '' },
  type: { type: String, default: 'airport' },
  scheduledService: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index for faster searching
airportSchema.index({ name: 'text', city: 'text', country: 'text' });
airportSchema.index({ iata: 1 }, { unique: true, sparse: true });
airportSchema.index({ country: 1 });

export default mongoose.model('Airport', airportSchema);
