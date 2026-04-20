/* ═══════════════════════════════════════════════════════════════
   ADMIN AUTH MIDDLEWARE — Simple token-based authentication
   ═══════════════════════════════════════════════════════════════ */

const adminAuth = (req, res, next) => {
  const token = req.headers['x-admin-secret'];

  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized — Invalid admin credentials'
    });
  }

  next();
};

export default adminAuth;
