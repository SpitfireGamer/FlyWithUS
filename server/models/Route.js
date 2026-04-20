import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
  airlineId: { type: String, required: true, index: true },
  departureIata: { type: String, required: true, index: true },
  destinationIata: { type: String, required: true, index: true },
}, { timestamps: true });

// Compound index for route search
routeSchema.index({ departureIata: 1, destinationIata: 1 });
routeSchema.index({ airlineId: 1, departureIata: 1, destinationIata: 1 }, { unique: true });

export default mongoose.model('Route', routeSchema);
