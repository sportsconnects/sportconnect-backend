// src/routes/recruiters.js
const router           = require("express").Router()
const RecruiterProfile = require("../models/RecruiterProfile")
const User = require("../models/User")
const { protect, restrictTo } = require("../middleware/auth")

// ── POST /api/recruiters/profile ──────────────────────────────
// Protected — recruiter creates their profile after signup
router.post("/profile", protect, restrictTo("recruiter"), async (req, res) => {
  try {
    const existing = await RecruiterProfile.findOne({ user: req.user._id })
    if (existing) {
      return res.status(400).json({ message: "Profile already exists. Use PUT to update." })
    }

    const profile = await RecruiterProfile.create({
      user: req.user._id,
      ...req.body,
    })

    res.status(201).json({
      message: "Recruiter profile created successfully",
      profile,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Replace the GET /:id handler:
router.get("/:id", async (req, res) => {
  try {
    const User = require("../models/User")
    const user = await User.findById(req.params.id).select("-password")
    if (!user) return res.status(404).json({ message: "User not found" })

    let profile = await RecruiterProfile.findOne({ user: req.params.id })
      .populate("user", "firstName lastName email phone")

    if (!profile) {
      profile = await RecruiterProfile.create({ user: req.params.id })
    } else {

      profile.profileViews += 1
      await profile.save()
    }

    res.json({ user, profile })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── PUT /api/recruiters/profile 
// Protected — recruiter updates their own profile
router.put("/profile", protect, restrictTo("recruiter"), async (req, res) => {
  try {
    const profile = await RecruiterProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("user", "firstName lastName email")

    if (!profile) {
      return res.status(404).json({ message: "Profile not found. Create one first." })
    }

    res.json({
      message: "Profile updated successfully",
      profile,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})


// GET /api/recruiters — browse/search all recruiters
// Public — athletes use this to find and message recruiters
router.get("/", protect, async (req, res) => {
  try {
    const { search, sport, page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    // Find all recruiter users
    let userFilter = { role: "recruiter" }

    // If searching by name, find matching users first
    if (search) {
      const searchRegex = new RegExp(search, "i")
      const matchingUsers = await User.find({
        role: "recruiter",
        $or: [
          { firstName: searchRegex },
          { lastName:  searchRegex },
        ]
      }).select("_id")
      userFilter._id = { $in: matchingUsers.map(u => u._id) }
    }

    // Find recruiter profiles
    let profileFilter = {}
    if (sport) profileFilter.sport = { $in: [sport] }

    // If searching by organization/school
    if (search) {
      const searchRegex = new RegExp(search, "i")
      const byOrg = await RecruiterProfile.find({
        organization: searchRegex
      }).select("user")
      const orgUserIds = byOrg.map(p => p.user.toString())

      // Merge with name matches
      if (userFilter._id) {
        const nameIds = userFilter._id.$in.map(id => id.toString())
        const allIds  = [...new Set([...nameIds, ...orgUserIds])]
        profileFilter.user = { $in: allIds }
      } else if (orgUserIds.length > 0) {
        profileFilter.user = { $in: orgUserIds }
      }
    }

    const profiles = await RecruiterProfile.find(profileFilter)
      .populate("user", "firstName lastName email role")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })

    // Filter out profiles where user doesn't match role filter
    const results = profiles
      .filter(p => p.user?.role === "recruiter")
      .map(p => ({
        id:           p.user._id,
        firstName:    p.user.firstName,
        lastName:     p.user.lastName,
        organization: p.organization || "—",
        role:         p.role         || "Recruiter",
        location:     p.location     || "—",
        sports:       p.sports       || [],
        experience:   p.experience   || "—",
        verified:     p.verified     || false,
        bio:          p.bio          || null,
      }))

    res.json({ count: results.length, recruiters: results })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router