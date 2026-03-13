const mongoose = require("mongoose")

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      "User",
        required: true,
      }
    ],
    lastMessage: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Message",
      default: null,
    },
    lastMessageAt: {
      type:    Date,
      default: Date.now,
    },
    // Track unread count per participant
    unreadCount: {
      type:    Map,
      of:      Number,
      default: {},
    },
  },
  { timestamps: true }
)

// Ensure only one conversation exists between two users
conversationSchema.index({ participants: 1 })

module.exports = mongoose.model("Conversation", conversationSchema)