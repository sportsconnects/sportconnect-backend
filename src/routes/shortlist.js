// src/routes/shortlists.js
const router         = require("express").Router()
const Shortlist      = require("../models/ShortList")
const AthleteProfile = require("../models/Athleteprofile")
const { protect, restrictTo } = require("../middleware/auth")

// ── GET /api/shortlists ───────────────────────────────────────
// Protected — recruiter gets their full shortlist
router.get("/", protect, restrictTo("recruiter"), async (req, res) => {
  try {
    const shortlist = await Shortlist.find({ recruiter: req.user._id })
      .populate({
        path:     "athlete",
        select:   "firstName lastName email",
      })
      .populate({
        path:     "athlete",
        select:   "firstName lastName email",
      })
      .sort({ createdAt: -1 })

    // For each shortlisted user pull their athlete profile too
    const enriched = await Promise.all(
      shortlist.map(async (item) => {
        const profile = await AthleteProfile.findOne({ user: item.athlete._id })
        return {
          _id:      item._id,
          note:     item.note,
          priority: item.priority,
          list:     item.list,
          savedAt:  item.createdAt,
          athlete: {
            id:        item.athlete._id,
            firstName: item.athlete.firstName,
            lastName:  item.athlete.lastName,
            email:     item.athlete.email,
            sport:     profile?.sport     || null,
            position:  profile?.position  || null,
            region:    profile?.region    || null,
            classOf:   profile?.classOf   || null,
            gpa:       profile?.gpa       || null,
            verified:  profile?.verified  || false,
          }
        }
      })
    )

    res.json({
      count: enriched.length,
      shortlist: enriched,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── POST /api/shortlists ──────────────────────────────────────
// Protected — recruiter adds an athlete to their shortlist
router.post("/", protect, restrictTo("recruiter"), async (req, res) => {
  try {
    const { athleteId, note, list } = req.body

    if (!athleteId) {
      return res.status(400).json({ message: "Athlete ID is required" })
    }

    // Check athlete exists
    const athleteProfile = await AthleteProfile.findOne({ user: athleteId })
    if (!athleteProfile) {
      return res.status(404).json({ message: "Athlete not found" })
    }

    const entry = await Shortlist.create({
      recruiter: req.user._id,
      athlete:   athleteId,
      note:      note || "",
      list:      list || "General",
    })

    // Increment recruiter views on athlete profile
    athleteProfile.recruiterViews += 1
    await athleteProfile.save()

    res.status(201).json({
      message: "Athlete added to shortlist",
      entry,
    })

  } catch (error) {
    // Duplicate entry — already shortlisted
    if (error.code === 11000) {
      return res.status(400).json({ message: "Athlete is already in your shortlist" })
    }
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── PATCH /api/shortlists/:athleteId ─────────────────────────
// Protected — recruiter updates note or priority on a shortlisted athlete
router.patch("/:athleteId", protect, restrictTo("recruiter"), async (req, res) => {
  try {
    const { note, priority, list } = req.body

    const entry = await Shortlist.findOneAndUpdate(
      {
        recruiter: req.user._id,
        athlete:   req.params.athleteId,
      },
      { $set: { note, priority, list } },
      { new: true }
    )

    if (!entry) {
      return res.status(404).json({ message: "Shortlist entry not found" })
    }

    res.json({
      message: "Shortlist entry updated",
      entry,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── DELETE /api/shortlists/:athleteId ────────────────────────
// Protected — recruiter removes athlete from shortlist
router.delete("/:athleteId", protect, restrictTo("recruiter"), async (req, res) => {
  try {
    const entry = await Shortlist.findOneAndDelete({
      recruiter: req.user._id,
      athlete:   req.params.athleteId,
    })

    if (!entry) {
      return res.status(404).json({ message: "Shortlist entry not found" })
    }

    res.json({ message: "Athlete removed from shortlist" })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router