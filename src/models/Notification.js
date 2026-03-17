// src/models/Notification.js
const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },

    // Who triggered it
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    // Type of notification
    type: {
      type:     String,
      required: true,
      enum: [
        "offer_received",     
        "offer_accepted",     
        "offer_declined",     
        "post_liked",         
        "post_commented",     
        "post_shared",        
        "new_follower",      
        "new_message",        
      ],
    },

    // Human-readable message
    message: {
      type:     String,
      required: true,
    },

    // Optional reference to related resource
    refId:   { type: mongoose.Schema.Types.ObjectId },  
    refModel:{ type: String },                           

    // Read state
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
)

// Compound index for fast unread count queries
notificationSchema.index({ recipient: 1, read: 1 })

module.exports = mongoose.model("Notification", notificationSchema)