// src/routes/offers.js
const router  = require("express").Router()
const Offer   = require("../models/Offer")
const notify  = require("../utils/notify")
const { protect, restrictTo } = require("../middleware/auth")

// ── POST /api/offers — recruiter sends an offer
router.post("/", protect, restrictTo("recruiter"), async (req, res) => {
  try {
    const { athleteId, type, institution, sport, message, deadline } = req.body

    if (!athleteId || !type || !institution) {
      return res.status(400).json({
        message: "Athlete ID, offer type and institution are required",
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
        message: "You already have a pending offer of this type with this athlete",
      })
    }

    const offer = await Offer.create({
      recruiter: req.user._id,
      athlete:   athleteId,
      type,
      institution,
      sport,
      message,
      deadline,
    })

    await offer.populate("recruiter", "firstName lastName")
    await offer.populate("athlete",   "firstName lastName")

    // ── Notify the athlete
    const io = req.app.get("io")
    await notify({
      recipient: athleteId,
      sender:    req.user._id,
      type:      "offer_received",
      message:   `${req.user.firstName} ${req.user.lastName} from ${institution} sent you a ${type} offer`,
      refId:     offer._id,
      refModel:  "Offer",
      io,
    })

    res.status(201).json({ message: "Offer sent successfully", offer })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── GET /api/offers
router.get("/", protect, async (req, res) => {
  try {
    let offers

    if (req.user.role === "athlete") {
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

    res.json({ count: offers.length, offers })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── GET /api/offers/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate("recruiter", "firstName lastName")
      .populate("athlete",   "firstName lastName")

    if (!offer) return res.status(404).json({ message: "Offer not found" })

    const isInvolved =
      offer.recruiter._id.toString() === req.user._id.toString() ||
      offer.athlete._id.toString()   === req.user._id.toString()

    if (!isInvolved) return res.status(403).json({ message: "Not authorized" })

    res.json({ offer })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── PATCH /api/offers/:id — athlete accepts or declines
router.patch("/:id", protect, restrictTo("athlete"), async (req, res) => {
  try {
    const { status, responseMessage } = req.body

    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ message: "Status must be accepted or declined" })
    }

    const offer = await Offer.findOne({ _id: req.params.id, athlete: req.user._id })
    if (!offer) return res.status(404).json({ message: "Offer not found" })

    if (["accepted", "declined"].includes(offer.status)) {
      return res.status(400).json({ message: `Offer has already been ${offer.status}` })
    }

    offer.status          = status
    offer.respondedAt     = new Date()
    offer.responseMessage = responseMessage || ""
    await offer.save()

    await offer.populate("recruiter", "firstName lastName")
    await offer.populate("athlete",   "firstName lastName")

    // ── Notify the recruiter
    const io = req.app.get("io")
    await notify({
      recipient: offer.recruiter._id,
      sender:    req.user._id,
      type:      status === "accepted" ? "offer_accepted" : "offer_declined",
      message:   `${req.user.firstName} ${req.user.lastName} ${status} your offer`,
      refId:     offer._id,
      refModel:  "Offer",
      io,
    })

    res.json({ message: `Offer ${status} successfully`, offer })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── DELETE /api/offers/:id — recruiter withdraws
router.delete("/:id", protect, restrictTo("recruiter"), async (req, res) => {
  try {
    const offer = await Offer.findOne({ _id: req.params.id, recruiter: req.user._id })
    if (!offer) return res.status(404).json({ message: "Offer not found" })

    if (["accepted", "declined"].includes(offer.status)) {
      return res.status(400).json({
        message: `Cannot withdraw an offer that has been ${offer.status}`,
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