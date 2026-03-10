// src/routes/auth.js
const router = require("express").Router()
const jwt    = require("jsonwebtoken")
const User   = require("../models/User")

// generate token
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "10d" }
  )
}

// POST /api/auth/register/athlete
router.post("/register/athlete", async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, phone, dateOfBirth } = req.body

    // 1. Check all required fields are present
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "Please fill in all required fields" })
    }

    // 2. Check passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" })
    }

    // 3. Check if email already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" })
    }

    // 4. Create the user (password gets hashed automatically by the model)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      role: "athlete",
    })

    // 5. Return token + user info (never return the password)
    res.status(201).json({
      message: "Athlete account created successfully",
      token: generateToken(user._id, user.role),
      user: {
        id:        user._id,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        role:      user.role,
      },
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── POST /api/auth/register/recruiter ───────────────────────
router.post("/register/recruiter", async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, phone, organization, position } = req.body

    // 1. Check required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword || !organization) {
      return res.status(400).json({ message: "Please fill in all required fields" })
    }

    // 2. Check passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" })
    }

    // 3. Check email not already taken
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" })
    }

    // 4. Create the recruiter
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      organization,
      recruiterPosition: position,
      role: "recruiter",
    })

    // 5. Return token + user info
    res.status(201).json({
      message: "Recruiter account created successfully",
      token: generateToken(user._id, user.role),
      user: {
        id:           user._id,
        firstName:    user.firstName,
        lastName:     user.lastName,
        email:        user.email,
        role:         user.role,
        organization: user.organization,
      },
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body

    // 1. Check fields present
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" })
    }

    // 2. Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // 3. Check role matches — prevents athlete logging in as recruiter and vice versa
    if (role && user.role !== role) {
      return res.status(401).json({ 
        message: `No ${role} account found with this email` 
      })
    }

    // 4. Check password
    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // 5. Return token + user info
    res.json({
      message: "Login successful",
      token: generateToken(user._id, user.role),
      user: {
        id:           user._id,
        firstName:    user.firstName,
        lastName:     user.lastName,
        email:        user.email,
        role:         user.role,
        organization: user.organization || null,
      },
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})


// ── GET /api/auth/me — test protected route ──────────────────
const { protect } = require("../middleware/auth")

router.get("/me", protect, async (req, res) => {
  res.json({
    message: "Token is valid",
    user: {
      id:        req.user._id,
      firstName: req.user.firstName,
      lastName:  req.user.lastName,
      email:     req.user.email,
      role:      req.user.role,
    }
  })
})

module.exports = router