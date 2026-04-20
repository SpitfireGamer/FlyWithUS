/* ═══════════════════════════════════════════════════════════════
   MONGODB CONNECTION
   ═══════════════════════════════════════════════════════════════ */
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection Error: ${error.message}`);
    console.error('\n════════════════════════════════════════════════');
    console.error('  Make sure you have set your MONGO_URI in .env');
    console.error('  See .env file for setup instructions');
    console.error('════════════════════════════════════════════════\n');
    process.exit(1);
  }
};

export default connectDB;
