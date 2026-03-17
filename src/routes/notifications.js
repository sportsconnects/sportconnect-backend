// src/routes/notifications.js
const router       = require("express").Router()
const Notification = require("../models/Notification")
const { protect }  = require("../middleware/auth")

// ── GET /api/notifications
// Get all notifications for the logged-in user + unread count
router.get("/", protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .populate("sender", "firstName lastName role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
    ])

    res.json({
      unreadCount,
      count:         notifications.length,
      notifications,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// ── GET /api/notifications/count
// Just the unread count — used for badge polling
router.get("/count", protect, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read:      false,
    })
    res.json({ unreadCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// ── PATCH /api/notifications/read
// Mark ALL notifications as read — call when user opens the notification panel
router.patch("/read", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    )
    res.json({ message: "All notifications marked as read" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// ── PATCH /api/notifications/:id/read
// Mark a single notification as read
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { read: true } },
      { new: true }
    )
    if (!notif) return res.status(404).json({ message: "Notification not found" })

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read:      false,
    })

    res.json({ notification: notif, unreadCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// ── DELETE /api/notifications/:id
// Delete a single notification
router.delete("/:id", protect, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id:       req.params.id,
      recipient: req.user._id,
    })
    res.json({ message: "Notification deleted" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router