// src/routes/posts.js
const router         = require("express").Router()
const Post           = require("../models/Post")
const AthleteProfile  = require("../models/AthleteProfileTemp")
const RecruiterProfile = require("../models/RecruiterProfile")
const Follow         = require("../models/Follow")
const User           = require("../models/User")
const { protect }    = require("../middleware/auth")

// ── Helper: enrich a post with author profile data
async function enrichPost(post, currentUserId) {
  const authorRole = post.author?.role

  let authorExtra = {}

  if (authorRole === "athlete") {
    const profile = await AthleteProfile.findOne({ user: post.author._id })
      .select("sport position school region classOf verified avatar")
    authorExtra = {
      sport:    profile?.sport    || "—",
      position: profile?.position || "—",
      school:   profile?.school   || "—",
      region:   profile?.region   || "—",
      classOf:  profile?.classOf  || "—",
      verified: profile?.verified || false,
      avatar:   profile?.avatar   || null,
    }
  } else if (authorRole === "recruiter") {
    const profile = await RecruiterProfile.findOne({ user: post.author._id })
      .select("organization role verified avatar")
    authorExtra = {
      sport:        "Recruiter",
      position:     profile?.role         || "Scout",
      school:       profile?.organization || "—",
      region:       "—",
      classOf:      "—",
      verified:     profile?.verified     || false,
      avatar:       profile?.avatar       || null,
      organization: profile?.organization || "—",
    }
  }

  return {
    _id:           post._id,
    caption:       post.caption,
    videoId:       post.videoId,
    videoTitle:    post.videoTitle,
    sport:         post.sport,
    views:         post.views || 0,
    likes:         post.likes.length,
    liked:         post.likes.map(id => id.toString()).includes(currentUserId.toString()),
    commentsCount: post.comments.length,
    comments:      post.comments.slice(0, 3),
    shares:        post.shares || 0,
    sharedFrom:    post.sharedFrom || null,
    createdAt:     post.createdAt,
    author: {
      id:        post.author._id,
      firstName: post.author.firstName,
      lastName:  post.author.lastName,
      role:      post.author.role,
      ...authorExtra,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/posts/feed
// Unified feed — shows posts from everyone (athletes + recruiters)
// Optional filters: ?sport= ?role=athlete|recruiter ?page= ?limit=
// ─────────────────────────────────────────────────────────────────────────────
router.get("/feed", protect, async (req, res) => {
  try {
    const { sport, role, page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    // Build filter — show ALL posts, no follow restriction
    let filter = {}

    // Optional sport filter
    if (sport) filter.sport = sport

    // Optional role filter (athlete posts only or recruiter posts only)
    if (role === "athlete" || role === "recruiter") {
      // Find all users with this role
      const usersWithRole = await User.find({ role }).select("_id")
      const userIds = usersWithRole.map(u => u._id)
      filter.author = { $in: userIds }
    }

    const posts = await Post.find(filter)
      .populate("author", "firstName lastName role")
      .populate("comments.user", "firstName lastName role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const enriched = await Promise.all(
      posts.map(post => enrichPost(post, req.user._id))
    )

    res.json({
      page:  Number(page),
      count: enriched.length,
      posts: enriched,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/posts/user/:userId
// Get all posts by any user (athlete or recruiter)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/user/:userId", protect, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate("author", "firstName lastName role")
      .populate("comments.user", "firstName lastName role")
      .sort({ createdAt: -1 })

    const enriched = await Promise.all(
      posts.map(post => enrichPost(post, req.user._id))
    )

    res.json({ count: enriched.length, posts: enriched })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/posts/athlete/:userId
// Keep for backwards compatibility — same as /user/:userId
// ─────────────────────────────────────────────────────────────────────────────
router.get("/athlete/:userId", protect, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate("author", "firstName lastName role")
      .populate("comments.user", "firstName lastName role")
      .sort({ createdAt: -1 })

    const enriched = await Promise.all(
      posts.map(post => enrichPost(post, req.user._id))
    )

    res.json({ count: enriched.length, posts: enriched })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/posts
// Create a post — open to BOTH athletes and recruiters
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { caption, videoId, videoTitle, sport, lookingFor } = req.body

    if (!caption?.trim() && !videoId) {
      return res.status(400).json({ message: "Post must have a caption or a highlight video" })
    }

    const post = await Post.create({
      author:     req.user._id,
      caption:    caption?.trim() || "",
      videoId:    videoId    || null,
      videoTitle: videoTitle || null,
      sport:      sport      || null,
      lookingFor: lookingFor || null, // recruiters can tag what position they're looking for
    })

    await post.populate("author", "firstName lastName role")

    const enriched = await enrichPost(post, req.user._id)

    res.status(201).json({
      message: "Post created successfully",
      post:    enriched,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/posts/:id/like
// Toggle like — open to both roles
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ message: "Post not found" })

    const alreadyLiked = post.likes.map(id => id.toString()).includes(req.user._id.toString())

    if (alreadyLiked) {
      post.likes = post.likes.filter(id => id.toString() !== req.user._id.toString())
    } else {
      post.likes.push(req.user._id)
    }

    await post.save()

    res.json({ liked: !alreadyLiked, likes: post.likes.length })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/posts/:id/comment
// Add comment — open to both roles
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ message: "Comment cannot be empty" })

    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ message: "Post not found" })

    post.comments.push({ user: req.user._id, text: text.trim() })
    await post.save()
    await post.populate("comments.user", "firstName lastName role")

    const newComment = post.comments[post.comments.length - 1]

    res.status(201).json({
      message:       "Comment added",
      comment:       newComment,
      commentsCount: post.comments.length,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/posts/:id/share
// Share a post — creates a new post with sharedFrom reference
// Open to both roles
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/share", protect, async (req, res) => {
  try {
    const { caption } = req.body

    const originalPost = await Post.findById(req.params.id)
      .populate("author", "firstName lastName role")
    if (!originalPost) return res.status(404).json({ message: "Post not found" })

    // Increment share count on original
    originalPost.shares = (originalPost.shares || 0) + 1
    await originalPost.save()

    // Create a new shared post
    const sharedPost = await Post.create({
      author:     req.user._id,
      caption:    caption?.trim() || "",
      videoId:    originalPost.videoId    || null,
      videoTitle: originalPost.videoTitle || null,
      sport:      originalPost.sport      || null,
      sharedFrom: {
        postId:        originalPost._id,
        authorName:    `${originalPost.author.firstName} ${originalPost.author.lastName}`,
        authorRole:    originalPost.author.role,
        originalCaption: originalPost.caption,
      },
    })

    await sharedPost.populate("author", "firstName lastName role")
    const enriched = await enrichPost(sharedPost, req.user._id)

    res.status(201).json({
      message: "Post shared successfully",
      post:    enriched,
      originalShares: originalPost.shares,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/posts/:id
// Delete own post — works for both roles
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id })
    if (!post) return res.status(404).json({ message: "Post not found or not yours" })

    await post.deleteOne()
    res.json({ message: "Post deleted successfully" })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router