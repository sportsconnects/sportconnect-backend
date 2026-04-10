// src/routes/auth.js
const router = require("express").Router()
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const AthleteProfile = require("../models/AthleteProfileTemp")
const RecruiterProfile = require("../models/RecruiterProfile")
const Post = require("../models/Post")
const Follow = require("../models/Follow")
const Conversation = require("../models/Conversation")
const Message = require("../models/Message")
const Shortlist = require("../models/ShortList")
const Offer = require("../models/Offer")
const Notification = require("../models/Notification")
const crypto = require("crypto")
const sendVerificationEmail = require("../utils/sendEmail")

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
    const verifyToken = crypto.randomBytes(32).toString("hex")
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    user.verificationToken = verifyToken
    user.verificationExpires = verifyExpires
    await user.save()

    sendVerificationEmail(user.email, user.firstName, verifyToken, "athlete").catch(err => {
      console.error("Verification email failed:", err.message)
      console.error("Full error:", err)
    })

    res.status(201).json({
      message: "Account created! Please check your email to verify your account.",
      emailSent: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        emailVerified: false,
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
    const verifyToken = crypto.randomBytes(32).toString("hex")
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    user.verificationToken = verifyToken
    user.verificationExpires = verifyExpires
    await user.save()

    sendVerificationEmail(user.email, user.firstName, verifyToken, "recruiter").catch(err =>
      console.error("Verification email failed:", err.message)
    )

    res.status(201).json({
      message: "Account created! Please check your email to verify your account.",
      emailSent: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organization: user.organization,
        emailVerified: false,
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

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before signing in. Check your inbox.",
        emailNotVerified: true,
        email: user.email,
      })
    }

    // 5. Return token + user info
    res.json({
      message: "Login successful",
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
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
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      role: req.user.role,
    }
  })
})

// DELETE /api/auth/account — permanently delete account
router.delete("/account", protect, async (req, res) => {
  try {
    const userId = req.user._id

    await Promise.all([
      AthleteProfile.deleteMany({ user: userId }),
      RecruiterProfile.deleteMany({ user: userId }),
      Post.deleteMany({ author: userId }),
      Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
      Shortlist.deleteMany({ $or: [{ recruiter: userId }, { athlete: userId }] }),
      Offer.deleteMany({ $or: [{ recruiter: userId }, { athlete: userId }] }),
      Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }),
    ])

    // Handle conversations
    const convos = await Conversation.find({ participants: userId })
    for (const convo of convos) {
      convo.participants = convo.participants.filter(p => p.toString() !== userId.toString())
      if (convo.participants.length === 0) {
        await Message.deleteMany({ conversation: convo._id })
        await convo.deleteOne()
      } else {
        await convo.save()
      }
    }

    await User.findByIdAndDelete(userId)
    res.json({ message: "Account deleted successfully" })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// GET /api/auth/verify-email?token=xxx
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ message: "Token is required" })

    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({
        message: "Verification link is invalid or has expired. Please request a new one.",
        expired: true,
      })
    }

    user.emailVerified = true
    user.verificationToken = null
    user.verificationExpires = null
    await user.save()

    res.json({
      message: "Email verified successfully! Welcome to SportsConnect.",
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        emailVerified: true,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// POST /api/auth/resend-verification
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: "Email is required" })

    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ message: "No account found with this email" })
    if (user.emailVerified) return res.status(400).json({ message: "This email is already verified" })

    const verifyToken = crypto.randomBytes(32).toString("hex")
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    user.verificationToken = verifyToken
    user.verificationExpires = verifyExpires
    await user.save()

 await sendVerificationEmail(user.email, user.firstName, verifyToken, user.role)

    res.json({ message: "Verification email resent. Please check your inbox." })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router