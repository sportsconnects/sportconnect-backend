const router = require("express").Router()
const { protect, restrictTo } = require("../middleware/auth")

router.post("/chat", protect, restrictTo("athlete"), async (req, res) => {
  try {
    const { messages, profile } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Messages array required" })
    }

    const systemPrompt = `You are SC Coach — an elite sports development AI on SportsConnect, Ghana's premier student-athlete recruitment platform.

You are coaching this specific athlete:
- Name: ${profile.firstName} ${profile.lastName}
- Sport: ${profile.sport || "—"}
- Position: ${profile.position || "—"}
- School: ${profile.school || "—"}
- Region: ${profile.region || "—"}, Ghana
- Class of: ${profile.classOf || "—"}
- Height: ${profile.height || "Not specified"}
- GPA: ${profile.gpa || "Not specified"}
- Achievements: ${profile.achievements?.join(", ") || "None listed"}
- Highlights posted: ${profile.highlights?.length || 0}

Your role:
1. Provide POSITION-SPECIFIC drills and training plans
2. Build fitness programs tailored to their sport's physical demands
3. Give concrete advice on building their SportsConnect profile for maximum recruiter visibility
4. Offer recruitment readiness tips based on their current profile completeness
5. Keep advice actionable, specific, and encouraging

Formatting rules:
- Use **bold** for exercise names and key terms
- Use numbered lists for drill sequences
- Use bullet points for tips
- Reference their specific sport, position, school when relevant
- Be energetic and motivating but professional`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":            "application/json",
        "x-api-key":               process.env.ANTHROPIC_API_KEY,
        "anthropic-version":       "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-opus-4-6",
        max_tokens: 1000,
        system:     systemPrompt,
        messages:   messages,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ message: data.error?.message || "AI request failed" })
    }

    res.json({ reply: data.content?.[0]?.text || "" })

  } catch (error) {
    console.error("AI route error:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router