// Simple in-memory sessions
const sessions = {};

function buildSystemPrompt(profile, preferences) {
  const displayName = profile?.name || "my friend";
  const goal = profile?.goal || "healthy, self-respecting relationships";
  const tone = preferences?.tone || "gentle";

  const toneLine =
    tone === "direct"
      ? "Be clear, honest, and no-nonsense but still kind."
      : tone === "playful"
      ? "Be warm, a bit playful, but never mocking or dismissive."
      : "Be soft, validating, and encouraging.";

  return `
You are Love Coach, a compassionate, practical relationship coach.
User prefers to be addressed as ${displayName}.
Primary focus: Help them move toward ${goal}.
${toneLine}
Always be supportive, boundary-respecting, and actionable.
Never claim to be a therapist or attorney. Encourage professional help if needed.
  `.trim();
}

app.post("/coach", async (req, res) => {
  try {
    const { userId, message, profile, preferences } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const key = userId || "anonymous";
    if (!sessions[key]) {
      sessions[key] = [];
    }

    const systemPrompt = buildSystemPrompt(profile, preferences);

    const history = [
      { role: "system", content: systemPrompt },
      ...sessions[key],
      { role: "user", content: message },
    ];

    // 🔴 THIS is the important part: real AI call instead of the hard-coded reply
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // or whichever model you were using
      messages: history,
      temperature: 0.8,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I’m here with you. Can you say that one more time?";

    // Save history for this user
    sessions[key].push({ role: "user", content: message });
    sessions[key].push({ role: "assistant", content: reply });

    return res.json({ reply });
  } catch (err) {
    console.error("Coach error:", err);
    return res.status(500).json({
      error:
        "Love Coach had a little hiccup trying to respond. Please try again in a moment.",
    });
  }
});
