import mongoose from 'mongoose';

const airlineSchema = new mongoose.Schema({
  airlineId: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: '' },
  iata: { type: String, default: '' },
  icao: { type: String, default: '' },
  country: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

airlineSchema.index({ name: 'text' });

export default mongoose.model('Airline', airlineSchema);
