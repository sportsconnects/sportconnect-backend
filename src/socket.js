const jwt  = require("jsonwebtoken")
const User = require("./models/User")

const onlineUsers = new Map()

module.exports = (io) => {

  // Auth middleware
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

    onlineUsers.set(userId, socket.id)
    io.emit("user_online", { userId })

    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId)
    })

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(conversationId)
    })

    // ── Handle ping from client to keep connection alive
    socket.on("ping_keep_alive", () => {
      socket.emit("pong_keep_alive")
    })

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.user.firstName} — reason: ${reason}`)
      onlineUsers.delete(userId)
      io.emit("user_offline", { userId })
    })
  })

  io.getOnlineUsers = () => onlineUsers
}