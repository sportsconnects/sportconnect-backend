// src/models/Follow.js
const mongoose = require("mongoose")

const followSchema = new mongoose.Schema(
  {
    // The user who is following
    follower: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // The user being followed
    following: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
  },
  { timestamps: true }
)

// Prevent duplicate follows
followSchema.index({ follower: 1, following: 1 }, { unique: true })

module.exports = mongoose.model("Follow", followSchema)