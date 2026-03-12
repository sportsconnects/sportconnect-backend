// src/models/Post.js
const mongoose = require("mongoose")

const postSchema = new mongoose.Schema(
  {
    // Who posted it
    author: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    // Post content
    caption: {
      type:    String,
      trim:    true,
      default: "",
    },

    // Optional YouTube highlight attached to the post
    videoId: {
      type:  String,
      trim:  true,
    },

    videoTitle: {
      type:  String,
      trim:  true,
    },

    // Sport tag
    sport: {
      type:  String,
      trim:  true,
    },

    // Likes — array of user IDs who liked it
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "User",
      }
    ],

    // Comment count (we keep comments simple for now)
    comments: [
      {
        user:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text:      { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      }
    ],

    // View count
    views: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Post", postSchema)