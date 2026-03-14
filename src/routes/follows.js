// src/routes/follows.js
const router         = require("express").Router()
const Follow         = require("../models/Follow")
const AthleteProfile = require("../models/AthleteProfileTemp")
const User           = require("../models/User")
const { protect }    = require("../middleware/auth")

// ── POST /api/follows/:userId
router.post("/:userId", protect, async (req, res) => {
  try {
    const targetId = req.params.userId

    // Can't follow yourself
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" })
    }

    // Check target user exists
    const target = await User.findById(targetId)
    if (!target) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if already following
    const existing = await Follow.findOne({
      follower:  req.user._id,
      following: targetId,
    })

    if (existing) {
      // Unfollow
      await existing.deleteOne()

      // Decrement follower count on target's athlete profile
      await AthleteProfile.findOneAndUpdate(
        { user: targetId },
        { $inc: { followers: -1 } }
      )

      // Decrement following count on current user's athlete profile
      await AthleteProfile.findOneAndUpdate(
        { user: req.user._id },
        { $inc: { following: -1 } }
      )

      return res.json({
        following: false,
        message:   `Unfollowed ${target.firstName} ${target.lastName}`,
      })
    }

    // Follow
    await Follow.create({
      follower:  req.user._id,
      following: targetId,
    })

    // Increment follower count on target's athlete profile
    await AthleteProfile.findOneAndUpdate(
      { user: targetId },
      { $inc: { followers: 1 } }
    )

    // Increment following count on current user's athlete profile
    await AthleteProfile.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { following: 1 } }
    )

    res.status(201).json({
      following: true,
      message:   `Now following ${target.firstName} ${target.lastName}`,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── GET /api/follows/status/:userId 
router.get("/status/:userId", protect, async (req, res) => {
  try {
    const exists = await Follow.findOne({
      follower:  req.user._id,
      following: req.params.userId,
    })

    res.json({ following: !!exists })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── GET /api/follows/following 
router.get("/following", protect, async (req, res) => {
  try {
    const docs = await Follow.find({ follower: req.user._id })
      .populate("following", "firstName lastName role")
      .sort({ createdAt: -1 })

    const list = await Promise.all(
      docs.map(async (doc) => {
        const profile = await AthleteProfile.findOne({ user: doc.following._id })
          .select("sport position school region verified avatar")
        return {
          id:        doc.following._id,
          firstName: doc.following.firstName,
          lastName:  doc.following.lastName,
          role:      doc.following.role,
          sport:     profile?.sport    || "—",
          position:  profile?.position || "—",
          school:    profile?.school   || "—",
          region:    profile?.region   || "—",
          verified:  profile?.verified || false,
          followedAt: doc.createdAt,
        }
      })
    )

    res.json({
      count: list.length,
      following: list,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── GET /api/follows/followers 
router.get("/followers", protect, async (req, res) => {
  try {
    const docs = await Follow.find({ following: req.user._id })
      .populate("follower", "firstName lastName role")
      .sort({ createdAt: -1 })

    const list = await Promise.all(
      docs.map(async (doc) => {
        const profile = await AthleteProfile.findOne({ user: doc.follower._id })
          .select("sport position school region verified avatar")
        return {
          id:        doc.follower._id,
          firstName: doc.follower.firstName,
          lastName:  doc.follower.lastName,
          role:      doc.follower.role,
          sport:     profile?.sport    || "—",
          position:  profile?.position || "—",
          school:    profile?.school   || "—",
          region:    profile?.region   || "—",
          verified:  profile?.verified || false,
          followedAt: doc.createdAt,
        }
      })
    )

    res.json({
      count: list.length,
      followers: list,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// GET /api/follows/following/:userId — get following list for any user
router.get("/following/:userId", protect, async (req, res) => {
  try {
    const docs = await Follow.find({ follower: req.params.userId })
      .populate("following", "firstName lastName role")
      .sort({ createdAt: -1 })

    res.json({ count: docs.length, following: docs })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// GET /api/follows/followers/:userId — get followers list for any user
router.get("/followers/:userId", protect, async (req, res) => {
  try {
    const docs = await Follow.find({ following: req.params.userId })
      .populate("follower", "firstName lastName role")
      .sort({ createdAt: -1 })

    res.json({ count: docs.length, followers: docs })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router