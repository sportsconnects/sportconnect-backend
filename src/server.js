// src/server.js
const express   = require("express")
const cors      = require("cors")
const dotenv    = require("dotenv")
const connectDB = require("./config/db")

// Load .env variables first
dotenv.config()

// Connect to database
connectDB()

const app = express()

// ── Middleware ──────────────────────────────────────────────
app.use(express.json())
app.use(cors({
 origin: [
    "http://localhost:5173",
    "http://localhost:5174",                   
    "https://sportsconnectz.netlify.app"        
  ],
  credentials: true
}))

// ── Routes
app.use("/api/auth",       require("./routes/auth"))
app.use("/api/athletes",   require("./routes/athletes"))
app.use("/api/recruiters", require("./routes/recruiters"))
app.use("/api/shortlists", require("./routes/shortlist"))
app.use("/api/messages",   require("./routes/messages"))
app.use("/api/offers",     require("./routes/offers"))
app.use("/api/posts",      require("./routes/posts"))
app.use("/api/follows",    require("./routes/follows"))

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

// ── Start server 
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})