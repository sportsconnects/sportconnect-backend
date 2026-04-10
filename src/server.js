// src/server.js
const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const connectDB = require("./config/db")
const http = require("http")
const { Server } = require("socket.io")


dotenv.config()
connectDB()

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://sportsconnectz.netlify.app"
    ],
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
  transports:   ["polling", "websocket"], 
  allowUpgrades: true,
})

// ── Middleware 
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://sportsconnectz.netlify.app"
  ],
  credentials: true
}))

app.use(express.json())

app.use((req, res, next) => {
  res.setHeader("X-Accel-Buffering", "no")
  next()
})

app.use(require("helmet")())

app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key]
      } else if (typeof obj[key] === "object") {
        sanitize(obj[key])
      }
    }
  }
  sanitize(req.body)
  sanitize(req.params)
  next()
})

const rateLimit = require("express-rate-limit")
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }))

app.set("io", io)

// ── Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/athletes", require("./routes/athletes"))
app.use("/api/recruiters", require("./routes/recruiters"))
app.use("/api/shortlists", require("./routes/shortlist"))
app.use("/api/messages", require("./routes/messages"))
app.use("/api/offers", require("./routes/offers"))
app.use("/api/posts", require("./routes/posts"))
app.use("/api/follows", require("./routes/follows"))
app.use("/api/ai", require("./routes/ai"))
app.use("/api/notifications", require("./routes/notifications"))

// ── Health check 
app.get("/", (req, res) => {
  res.json({ message: "SportConnect API is running 🚀" })
})

// ── 404 handler 
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// ── Global error handler 
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: "Something went wrong", error: err.message })
})


// ── Socket.io
require("./socket")(io)


if (process.env.NODE_ENV === "production" && process.env.RENDER_EXTERNAL_URL) {
  const https = require("https")
  setInterval(() => {
    https.get(process.env.RENDER_EXTERNAL_URL, (res) => {
      console.log("Keep-alive ping:", res.statusCode)
    }).on("error", () => {})
  }, 14 * 60 * 1000)
}

// ── Start server 
const PORT = process.env.PORT || 5000
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`)
// })
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})