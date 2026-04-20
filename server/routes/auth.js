/* ═══════════════════════════════════════════════════════════════
   AUTH ROUTES — Registration, Login, Google OAuth, Email Verify
   ═══════════════════════════════════════════════════════════════ */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { generateCode, sendVerificationEmail } from '../utils/mailer.js';
import { requireAuth } from '../middleware/userAuth.js';

const router = Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ─── POST /api/auth/register — Email + Password registration ───
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.verified) {
        return res.status(409).json({ success: false, message: 'Email already registered. Please sign in.' });
      }
      // Re-send verification code
      const code = generateCode();
      existing.verificationCode = code;
      existing.verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);
      existing.name = name;
      existing.password = password;
      await existing.save();
      await sendVerificationEmail(email, code, name);
      return res.json({ success: true, message: 'Verification code re-sent to your email', needsVerification: true });
    }

    // Create user
    const code = generateCode();
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      verificationCode: code,
      verificationExpiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendVerificationEmail(email, code, name);

    res.status(201).json({
      success: true,
      message: 'Account created! Check your email for the verification code.',
      needsVerification: true,
    });
  } catch (error) {
    console.error('[Auth Register]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/auth/verify — Verify email with OTP code ───
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.verified) {
      return res.json({ success: true, message: 'Email already verified' });
    }
    if (user.verificationCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }
    if (user.verificationExpiry && user.verificationExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Code expired. Please register again.' });
    }

    user.verified = true;
    user.verificationCode = undefined;
    user.verificationExpiry = undefined;
    await user.save();

    const token = signToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully!',
      token,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/auth/login — Email + Password login ───
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.password) {
      return res.status(401).json({ success: false, message: 'This account uses Google Sign-In. Please sign in with Google.' });
    }
    if (!user.verified) {
      // Re-send verification
      const code = generateCode();
      user.verificationCode = code;
      user.verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await sendVerificationEmail(email, code, user.name);
      return res.status(403).json({ success: false, message: 'Email not verified. New code sent.', needsVerification: true });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/auth/google — Google Sign-In ───
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ success: false, message: 'Google OAuth not configured on server' });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (user) {
      // Link Google ID if missing
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = picture || user.avatar;
        user.verified = true;
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar: picture || '',
        verified: true,
        role: 'user',
      });
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      message: 'Google sign-in successful',
      token,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Auth Google]', error);
    res.status(401).json({ success: false, message: 'Google authentication failed' });
  }
});

// ─── GET /api/auth/me — Get current user ───
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON() });
});

// ─── POST /api/auth/resend — Resend verification code ───
router.post('/resend', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.verified) return res.json({ success: true, message: 'Already verified' });

    const code = generateCode();
    user.verificationCode = code;
    user.verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(email, code, user.name);
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/auth/google-client-id — Provide client ID to frontend ───
router.get('/google-client-id', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
});

export default router;
