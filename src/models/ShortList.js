// src/models/Shortlist.js
const mongoose = require("mongoose")

const shortlistSchema = new mongoose.Schema(
  {
    // The recruiter who saved this athlete
    recruiter: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // The athlete who was saved
    athlete: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // Recruiter's private note on this athlete
    note: {
      type:    String,
      trim:    true,
      default: "",
    },

    // Priority flag
    priority: {
      type:    Boolean,
      default: false,
    },

    // Which list they belong to
    list: {
      type:    String,
      trim:    true,
      default: "General",
    },
  },
  { timestamps: true }
)

// Prevent recruiter from saving same athlete twice
shortlistSchema.index({ recruiter:1, athlete:1 }, { unique:true })

module.exports = mongoose.model("Shortlist", shortlistSchema)