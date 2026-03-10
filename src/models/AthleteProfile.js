// src/models/AthleteProfile.js
const mongoose = require("mongoose")

const athleteProfileSchema = new mongoose.Schema(
  {
    // Link to the User model
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,
    },

    // Basic info
    sport:      { type:String, trim:true },
    position:   { type:String, trim:true },
    school:     { type:String, trim:true },
    region:     { type:String, trim:true },
    classOf:    { type:String, trim:true },
    bio:        { type:String, trim:true },
    handle:     { type:String, trim:true },

    // Physical stats
    height:     { type:String, trim:true },
    weight:     { type:String, trim:true },

    // Academic
    gpa:        { type:Number, min:0, max:4 },

    // Social
    followers:  { type:Number, default:0 },
    following:  { type:Number, default:0 },
    verified:   { type:Boolean, default:false },

    // Media
    avatar:     { type:String }, 
    coverImage: { type:String }, 

    // Achievements
    achievements: [
      {
        title: { type:String },
        year:  { type:String },
      }
    ],

    // Highlight videos
    highlights: [
      {
        title:       { type:String },
        videoUrl:    { type:String },
        videoId:     { type:String }, 
        sport:       { type:String },
        featured:    { type:Boolean, default:false },
        likes:       { type:Number,  default:0 },
        views:       { type:Number,  default:0 },
        createdAt:   { type:Date,    default:Date.now },
      }
    ],

    // Stats
    performanceStats: [
      {
        label: { type:String },
        value: { type:String },
      }
    ],

    // Recruiter interest tracking
    profileViews:     { type:Number, default:0 },
    recruiterViews:   { type:Number, default:0 },

  },
  { timestamps: true }
)

module.exports = mongoose.model("AthleteProfile", athleteProfileSchema)