// src/routes/athletes.js
const router         = require("express").Router()
const User           = require("../models/User")
const AthleteProfile = require("../models/AthleteProfileTemp")
const { protect, restrictTo } = require("../middleware/auth")

// ── GET /api/athletes 
// Public — anyone can browse athletes (recruiters use this)
router.get("/", async (req, res) => {
  try {
    const { sport, region, classOf, search, sort } = req.query


    let filter = {}
    if (sport)   filter.sport   = sport
    if (region)  filter.region  = region
    if (classOf) filter.classOf = classOf

    let sortBy = {}
    if (sort === "gpa")       sortBy = { gpa: -1 }
    else if (sort === "views") sortBy = { profileViews: -1 }
    else                       sortBy = { createdAt: -1 }

    // Get all athlete profiles with matching filters
    let athletes = await AthleteProfile.find(filter)
      .populate("user", "firstName lastName email") 
      .sort(sortBy)

    // If search query, filter by name
    if (search) {
      const q = search.toLowerCase()
      athletes = athletes.filter(a => {
        const fullName = `${a.user.firstName} ${a.user.lastName}`.toLowerCase()
        return (
          fullName.includes(q) ||
          a.sport?.toLowerCase().includes(q) ||
          a.position?.toLowerCase().includes(q) ||
          a.school?.toLowerCase().includes(q)
        )
      })
    }

    res.json({
      count:    athletes.length,
      athletes,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── GET /api/athletes/:id 
// Public — view a single athlete profile
router.get("/:id", async (req, res) => {
  try {
    const profile = await AthleteProfile.findOne({ user: req.params.id })
      .populate("user", "firstName lastName email phone")

    if (!profile) {
      return res.status(404).json({ message: "Athlete profile not found" })
    }

    profile.profileViews += 1
    await profile.save()

    res.json({ profile })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── POST /api/athletes/profile 
// Protected — athlete creates their profile after signup
router.post("/profile", protect, restrictTo("athlete"), async (req, res) => {
  try {
    // Check if profile already exists
    const existing = await AthleteProfile.findOne({ user: req.user._id })
    if (existing) {
      return res.status(400).json({ message: "Profile already exists. Use PUT to update." })
    }

    const profile = await AthleteProfile.create({
      user: req.user._id,
      ...req.body,
    })

    res.status(201).json({
      message: "Profile created successfully",
      profile,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── PUT /api/athletes/profile 
// Protected — athlete updates their own profile
router.put("/profile", protect, restrictTo("athlete"), async (req, res) => {
  try {
    const profile = await AthleteProfile.findOneAndUpdate(
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

// POST /api/athletes/profile/setup
router.post("/profile/setup", protect, restrictTo("athlete"), async (req, res) => {
  try {
    const { sport, position, region, classOf, school, gpa, height, weight, bio, achievements } = req.body

    if (!sport || !position || !region || !classOf || !school) {
      return res.status(400).json({ message: "Sport, position, region, class year and school are required" })
    }

    const profile = await AthleteProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        sport, position, region, classOf, school,
        gpa:          gpa          || null,
        height:       height       || null,
        weight:       weight       || null,
        bio:          bio          || null,
        achievements: achievements || [],
        profileComplete: true,
      },
      { upsert: true, new: true, runValidators: true }
    )

    res.json({ message: "Profile setup complete", profile })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Failed to setup profile", error: err.message })
  }
})

module.exports = router