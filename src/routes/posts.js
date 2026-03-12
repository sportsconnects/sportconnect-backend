// src/routes/posts.js
const router         = require("express").Router()
const Post           = require("../models/Post")
const AthleteProfile = require("../models/AthleteProfileTemp")
const Follow         = require("../models/Follow")
const { protect, restrictTo } = require("../middleware/auth")

// ── GET /api/posts/feed 
router.get("/feed", protect, async (req, res) => {
  try {
    const { sport, page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    // Who does this user follow?
    const followDocs = await Follow.find({ follower: req.user._id })
    const followingIds = followDocs.map(f => f.following)

    // Build filter
    let filter = {}

    if (followingIds.length > 0) {
      filter.author = { $in: [...followingIds, req.user._id] }
    }

    // Sport filter
    if (sport) filter.sport = sport

    const posts = await Post.find(filter)
      .populate("author", "firstName lastName role")
      .populate("comments.user", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    // For each post, also get the author's athlete profile
    const enriched = await Promise.all(
      posts.map(async (post) => {
        const profile = await AthleteProfile.findOne({ user: post.author._id })
          .select("sport position school region classOf verified avatar highlights")
        
        return {
          _id:       post._id,
          caption:   post.caption,
          videoId:   post.videoId,
          videoTitle: post.videoTitle,
          sport:     post.sport,
          views:     post.views,
          likes:     post.likes.length,
          liked:     post.likes.map(id => id.toString()).includes(req.user._id.toString()),
          commentsCount: post.comments.length,
          comments:  post.comments.slice(0, 3), 
          createdAt: post.createdAt,
          author: {
            id:        post.author._id,
            firstName: post.author.firstName,
            lastName:  post.author.lastName,
            role:      post.author.role,
            sport:     profile?.sport     || "—",
            position:  profile?.position  || "—",
            school:    profile?.school    || "—",
            region:    profile?.region    || "—",
            classOf:   profile?.classOf   || "—",
            verified:  profile?.verified  || false,
          }
        }
      })
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

// ── GET /api/posts/athlete/:userId 
router.get("/athlete/:userId", async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate("author", "firstName lastName")
      .sort({ createdAt: -1 })

    res.json({
      count: posts.length,
      posts,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── POST /api/posts
router.post("/", protect, restrictTo("athlete"), async (req, res) => {
  try {
    const { caption, videoId, videoTitle, sport } = req.body

    if (!caption && !videoId) {
      return res.status(400).json({ message: "Post must have a caption or a highlight video" })
    }

    const post = await Post.create({
      author:     req.user._id,
      caption:    caption || "",
      videoId:    videoId || null,
      videoTitle: videoTitle || null,
      sport:      sport || null,
    })

    await post.populate("author", "firstName lastName")

    res.status(201).json({
      message: "Post created successfully",
      post,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── PATCH /api/posts/:id/like 
router.patch("/:id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    const alreadyLiked = post.likes.map(id => id.toString()).includes(req.user._id.toString())

    if (alreadyLiked) {
      // Unlike
      post.likes = post.likes.filter(id => id.toString() !== req.user._id.toString())
    } else {
      // Like
      post.likes.push(req.user._id)
    }

    await post.save()

    res.json({
      liked:  !alreadyLiked,
      likes:  post.likes.length,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── POST /api/posts/:id/comment 
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const { text } = req.body

    if (!text?.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty" })
    }

    const post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    post.comments.push({
      user: req.user._id,
      text: text.trim(),
    })

    await post.save()
    await post.populate("comments.user", "firstName lastName")

    res.status(201).json({
      message:  "Comment added",
      comment:  post.comments[post.comments.length - 1],
      commentsCount: post.comments.length,
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// ── DELETE /api/posts/:id 
router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id:    req.params.id,
      author: req.user._id,
    })

    if (!post) {
      return res.status(404).json({ message: "Post not found or not yours" })
    }

    await post.deleteOne()

    res.json({ message: "Post deleted successfully" })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router