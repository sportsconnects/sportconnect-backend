// src/utils/notify.js
// Call this from any route to create a notification
// Usage: await notify({ recipient, sender, type, message, refId, refModel, io })

const Notification = require("../models/Notification")

async function notify({ recipient, sender, type, message, refId, refModel, io }) {
  try {
    // Don't notify yourself
    if (recipient?.toString() === sender?.toString()) return

    const notif = await Notification.create({
      recipient,
      sender,
      type,
      message,
      refId:    refId    || null,
      refModel: refModel || null,
    })

    // Push real-time notification via Socket.io if available
    if (io) {
      const onlineUsers = io.getOnlineUsers?.()
      const socketId    = onlineUsers?.get(recipient.toString())
      if (socketId) {
        // Send the new notification to the recipient's socket
        io.to(socketId).emit("new_notification", {
          _id:       notif._id,
          type:      notif.type,
          message:   notif.message,
          sender,
          refId,
          refModel,
          createdAt: notif.createdAt,
          read:      false,
        })

        // Also send updated unread count
        const unreadCount = await Notification.countDocuments({
          recipient,
          read: false,
        })
        io.to(socketId).emit("notification_count", { count: unreadCount })
      }
    }

    return notif
  } catch (err) {
    // Never crash a route because a notification failed
    console.error("Notification error:", err.message)
  }
}

module.exports = notify