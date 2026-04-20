/* ═══════════════════════════════════════════════════════════════
   FLYWITHUS — EXPRESS SERVER
   ═══════════════════════════════════════════════════════════════ */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (parent of server/)
dotenv.config({ path: join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';

// Route imports
import airportRoutes from './routes/airports.js';
import flightRoutes from './routes/flights.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';
import openskyRoutes from './routes/opensky.js';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/airports', airportRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/opensky', openskyRoutes);

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FlyWithUS API',
    timestamp: new Date().toISOString()
  });
});

// ─── Production: Serve Vite build ───
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    // Check if it's an HTML request (not API)
    if (!req.path.startsWith('/api')) {
      const file = req.path.endsWith('.html') ? req.path : '/index.html';
      res.sendFile(join(distPath, file));
    }
  });
}

// ─── Start Server ───
const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`  ✈  FlyWithUS API Server`);
    console.log(`  🌐 http://localhost:${PORT}`);
    console.log(`  📡 API: http://localhost:${PORT}/api`);
    console.log(`═══════════════════════════════════════════════\n`);
  });
};

start();
