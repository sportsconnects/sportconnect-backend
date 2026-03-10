// src/middleware/auth.js
const jwt  = require("jsonwebtoken")
const User = require("../models/User")

// ── Protect route — must be logged in ────────────────────────
const protect = async (req, res, next) => {
  try {
    let token

    // Check if token exists in the Authorization header
    // Frontend sends it as: "Bearer eyJhbGc..."
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1]
    }

    // No token found
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token provided" })
    }

    // Verify the token is valid and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Attach the user to the request object (without password)
    req.user = await User.findById(decoded.id).select("-password")

    if (!req.user) {
      return res.status(401).json({ message: "User no longer exists" })
    }

    next() // move on to the actual route handler

  } catch (error) {
    // Token is invalid or expired
    res.status(401).json({ message: "Not authorized, token failed" })
  }
}

// ── Restrict to specific roles ────────────────────────────────
// Usage: restrictTo("recruiter") or restrictTo("athlete")
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Only ${roles.join(" or ")} can do this.`
      })
    }
    next()
  }
}

module.exports = { protect, restrictTo }