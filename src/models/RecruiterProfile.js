// src/models/RecruiterProfile.js
const mongoose = require("mongoose")

const recruiterProfileSchema = new mongoose.Schema(
  {
    // Link to User
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,
    },

    // Institution info
    organization:  { type:String, trim:true },
    role:          { type:String, trim:true },
    location:      { type:String, trim:true },
    website:       { type:String, trim:true },
    bio:           { type:String, trim:true },
    experience:    { type:String, trim:true },
    handle:        { type:String, trim:true },

    // Sports they scout
    sports: [{ type:String }],

    // Stats
    profileViews:     { type:Number, default:0 },
    offersGiven:      { type:Number, default:0 },
    athletesSigned:   { type:Number, default:0 },
    verified:         { type:Boolean, default:false },

    // Media
    avatar:     { type:String },
    coverImage: { type:String },

    // Achievements
    achievements: [
      {
        title: { type:String },
        year:  { type:String },
        icon:  { type:String },
      }
    ],

    // Recent signings
    recentSignings: [
      {
        name:    { type:String },
        sport:   { type:String },
        year:    { type:String },
      }
    ],
  },
  { timestamps: true }
)

module.exports = mongoose.model("RecruiterProfile", recruiterProfileSchema)