// src/routes/offers.js
const router  = require("express").Router()
const Offer   = require("../models/Offer")
const { protect, restrictTo } = require("../middleware/auth")

// ── POST /api/offers 
// Protected — recruiter sends an offer to an athlete
router.post("/", protect, restrictTo("recruiter"), async (req, res) => {
  try {
    const { athleteId, type, institution, sport, message, deadline } = req.body

    // Validate required fields
    if (!athleteId || !type || !institution) {
      return res.status(400).json({
        message: "Athlete ID, offer type and institution are required"
      })
    }
    const existing = await Offer.findOne({
      recruiter: req.user._id,
      athlete:   athleteId,
      type,
      status:    { $in: ["pending", "viewed"] },
    })

    if (existing) {
      return res.status(400).json({
        message: "You already have a pending offer of this type with this athlete"
      })
    }

    const offer = await Offer.create({
      recruiter:   req.user._id,
      athlete:     athleteId,
      type,
      institution,
      sport,
      message,
      deadline,
    })

    await offer.populate("recruiter", "firstName lastName")
    await offer.populate("athlete",   "firstName lastName")

    res.status(201).json({
      message: "Offer sent successfully",
      offer,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── GET /api/offers 
// Protected — athlete sees received offers, recruiter sees sent offers
router.get("/", protect, async (req, res) => {
  try {
    let offers

    if (req.user.role === "athlete") {
      // Athlete sees all offers sent to them
      offers = await Offer.find({ athlete: req.user._id })
        .populate("recruiter", "firstName lastName")
        .sort({ createdAt: -1 })

      await Offer.updateMany(
        { athlete: req.user._id, status: "pending" },
        { $set: { status: "viewed" } }
      )

    } else {
      offers = await Offer.find({ recruiter: req.user._id })
        .populate("athlete", "firstName lastName")
        .sort({ createdAt: -1 })
    }

    res.json({
      count: offers.length,
      offers,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── GET /api/offers/:id 
// Protected — get a single offer detail
router.get("/:id", protect, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate("recruiter", "firstName lastName")
      .populate("athlete",   "firstName lastName")

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" })
    }

    const isInvolved =
      offer.recruiter._id.toString() === req.user._id.toString() ||
      offer.athlete._id.toString()   === req.user._id.toString()

    if (!isInvolved) {
      return res.status(403).json({ message: "Not authorized to view this offer" })
    }

    res.json({ offer })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── PATCH /api/offers/:id 
// Protected — athlete accepts or declines an offer
router.patch("/:id", protect, restrictTo("athlete"), async (req, res) => {
  try {
    const { status, responseMessage } = req.body

    // Only allow accepted or declined
    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({
        message: "Status must be either accepted or declined"
      })
    }

    const offer = await Offer.findOne({
      _id:    req.params.id,
      athlete: req.user._id,
    })

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" })
    }
    if (["accepted", "declined"].includes(offer.status)) {
      return res.status(400).json({
        message: `Offer has already been ${offer.status}`
      })
    }

    offer.status          = status
    offer.respondedAt     = new Date()
    offer.responseMessage = responseMessage || ""
    await offer.save()

    await offer.populate("recruiter", "firstName lastName")
    await offer.populate("athlete",   "firstName lastName")

    res.json({
      message: `Offer ${status} successfully`,
      offer,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── DELETE /api/offers/:id
// Protected — recruiter cancels/withdraws a pending offer
router.delete("/:id", protect, restrictTo("recruiter"), async (req, res) => {
  try {
    const offer = await Offer.findOne({
      _id:       req.params.id,
      recruiter: req.user._id,
    })

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" })
    }

    if (["accepted", "declined"].includes(offer.status)) {
      return res.status(400).json({
        message: `Cannot withdraw an offer that has been ${offer.status}`
      })
    }

    await offer.deleteOne()

    res.json({ message: "Offer withdrawn successfully" })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router