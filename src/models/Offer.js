// src/models/Offer.js
const mongoose = require("mongoose")

const offerSchema = new mongoose.Schema(
  {
    // Who sent the offer
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who received the offer
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Offer details
    type: {
      type: String,
      enum: ["Full Scholarship", "Partial Scholarship", "Trial Invitation", "Walk-on Offer"],
      required: [true, "Offer type is required"],
    },

    institution: {
      type: String,
      required: [true, "Institution name is required"],
      trim: true,
    },

    sport: {
      type: String,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },

    deadline: {
      type: Date,
    },

    // Offer status
    status: {
      type: String,
      enum: ["pending", "viewed", "accepted", "declined"],
      default: "pending",
    },

    respondedAt: {
      type: Date,
    },
    responseMessage: {
      type: String,
      trim: true,
    },

    // When athlete responded
    respondedAt: {
      type: Date,
    },

    // Athlete's response message
    responseMessage: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Offer", offerSchema)