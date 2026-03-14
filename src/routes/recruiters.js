// src/routes/recruiters.js
const router           = require("express").Router()
const RecruiterProfile = require("../models/RecruiterProfile")
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

module.exports = router