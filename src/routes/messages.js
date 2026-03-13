const router       = require("express").Router()
const Conversation = require("../models/Conversation")
const Message      = require("../models/Message")
const User         = require("../models/User")
const { protect }  = require("../middleware/auth")

// ── All routes require authentication
router.use(protect)

// ─────────────────────────────────────────────
// POST /api/messages/conversations
// Start a new conversation or return existing one
// Body: { recipientId }
// ─────────────────────────────────────────────
router.post("/conversations", async (req, res) => {
  try {
    const { recipientId } = req.body
    const senderId = req.user._id

    if (!recipientId) {
      return res.status(400).json({ message: "recipientId is required" })
    }

    if (recipientId === senderId.toString()) {
      return res.status(400).json({ message: "You cannot message yourself" })
    }

    // Check recipient exists
    const recipient = await User.findById(recipientId)
    if (!recipient) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if conversation already exists between these two users
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] }
    })
    .populate("participants", "firstName lastName role")
    .populate("lastMessage")

    if (conversation) {
      return res.json({ conversation, created: false })
    }

    // Create new conversation
    conversation = await Conversation.create({
      participants:  [senderId, recipientId],
      unreadCount:   { [recipientId]: 0, [senderId.toString()]: 0 },
    })

    conversation = await conversation.populate("participants", "firstName lastName role")

    res.status(201).json({ conversation, created: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/messages/conversations
// Get all conversations for the logged-in user
// ─────────────────────────────────────────────
router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user._id

    const conversations = await Conversation.find({
      participants: userId
    })
    .populate("participants", "firstName lastName role")
    .populate({
      path:    "lastMessage",
      select:  "text sender createdAt readBy",
      populate: { path: "sender", select: "firstName lastName" }
    })
    .sort({ lastMessageAt: -1 })

    // Add unread count and other participant for each conversation
    const formatted = conversations.map(convo => {
      const other = convo.participants.find(
        p => p._id.toString() !== userId.toString()
      )
      const unread = convo.unreadCount?.get(userId.toString()) || 0

      return {
        _id:           convo._id,
        other,
        lastMessage:   convo.lastMessage,
        lastMessageAt: convo.lastMessageAt,
        unread,
      }
    })

    res.json({ conversations: formatted })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/messages/conversations/:id/messages
// Get all messages in a conversation
// Marks all messages as read
// ─────────────────────────────────────────────
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const userId         = req.user._id
    const conversationId = req.params.id

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id:          conversationId,
      participants: userId,
    })

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" })
    }

    // Fetch messages
    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "firstName lastName role")
      .sort({ createdAt: 1 })

    // Mark unread messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender:       { $ne: userId },
        readBy:       { $nin: [userId] },
      },
      { $addToSet: { readBy: userId } }
    )

    // Reset unread count for this user
    conversation.unreadCount.set(userId.toString(), 0)
    await conversation.save()

    res.json({ messages })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// ─────────────────────────────────────────────
// POST /api/messages/conversations/:id/messages
// Send a message in a conversation
// Body: { text }
// ─────────────────────────────────────────────
router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const userId         = req.user._id
    const conversationId = req.params.id
    const { text }       = req.body

    if (!text?.trim()) {
      return res.status(400).json({ message: "Message text is required" })
    }

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id:          conversationId,
      participants: userId,
    })

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" })
    }

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender:       userId,
      text:         text.trim(),
      readBy:       [userId], // sender has already read it
    })

    const populated = await message.populate("sender", "firstName lastName role")

    // Update conversation's lastMessage and lastMessageAt
    conversation.lastMessage   = message._id
    conversation.lastMessageAt = new Date()

    // Increment unread count for all other participants
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== userId.toString()) {
        const current = conversation.unreadCount.get(participantId.toString()) || 0
        conversation.unreadCount.set(participantId.toString(), current + 1)
      }
    })

    await conversation.save()

    res.status(201).json({ message: populated })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/messages/conversations/unread
// Get total unread count for the logged-in user
// ─────────────────────────────────────────────
router.get("/unread", async (req, res) => {
  try {
    const userId = req.user._id

    const conversations = await Conversation.find({ participants: userId })

    const total = conversations.reduce((sum, convo) => {
      return sum + (convo.unreadCount?.get(userId.toString()) || 0)
    }, 0)

    res.json({ unread: total })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router