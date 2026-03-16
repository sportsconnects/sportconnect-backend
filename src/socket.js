const jwt  = require("jsonwebtoken")
const User = require("./models/User")

// Track online users: { userId: socketId }
const onlineUsers = new Map()

module.exports = (io) => {

  // ── Auth middleware — verify JWT on every socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error("Authentication required"))

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user    = await User.findById(decoded.id).select("-password")
      if (!user) return next(new Error("User not found"))

      socket.user = user
      next()
    } catch {
      next(new Error("Invalid token"))
    }
  })

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString()
    console.log(`Socket connected: ${socket.user.firstName} (${userId})`)

    // ── Mark user as online
    onlineUsers.set(userId, socket.id)
    io.emit("user_online", { userId })

    // ── Join a conversation room
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId)
    })

    // ── Leave a conversation room
    socket.on("leave_conversation", (conversationId) => {
      socket.leave(conversationId)
    })

    // ── Disconnect
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.user.firstName}`)
      onlineUsers.delete(userId)
      io.emit("user_offline", { userId })
    })
  })

  // ── Export online check helper for use in routes
  io.getOnlineUsers = () => onlineUsers
}