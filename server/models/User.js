/* ═══════════════════════════════════════════════════════════════
   USER MODEL — Customers & Admins with Google + Email auth
   ═══════════════════════════════════════════════════════════════ */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    // Not required for Google-only users
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  googleId: {
    type: String,
    sparse: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  verified: {
    type: Boolean,
    default: false,
  },
  verificationCode: String,
  verificationExpiry: Date,
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Remove sensitive fields from JSON
userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    verified: this.verified,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
