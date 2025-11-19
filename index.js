require("dotenv").config(); // <-- must come first
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;

// In-memory session store (swap to Redis/DB later)
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
       const { userId, message, profile, preferences, userName } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }
    const displayName =
      userName && typeof userName === "string" && userName.trim().length > 0
        ? userName.trim()
        : "friend";

    const key = userId || "anonymous";
    if (!sessions[key]) {
      sessions[key] = [];
    }

    // Build conversation history
   // const systemPrompt = buildSystemPrompt(profile, preferences);
const baseSystemPrompt = buildSystemPrompt(profile, preferences);

const systemPrompt = `
The user's preferred name is "${displayName}".
Always greet and refer to the user by this name at least once in each response.
Do NOT call the user "friend" or "my friend" unless they explicitly ask for that. Use their name instead.

${baseSystemPrompt}
`;


    const history = [
      { role: "system", content: systemPrompt },
      ...sessions[key],
      { role: "user", content: message },
    ];

    // Call your model here (pseudo-code):
    /*
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: history,
      temperature: 0.8,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "";
    */

    // For now, stub for testing:
    const completion = await openai.chat.completions.create({
  model: "gpt-4.1-mini", // or another model you prefer
  messages: history,
  temperature: 0.8,
});

const reply =
  completion.choices?.[0]?.message?.content?.trim() ||
  "I’m here with you. Can you say that one more time?";

    // Save to session
    sessions[key].push({ role: "user", content: message });
    sessions[key].push({ role: "assistant", content: reply });

    return res.json({ reply });
  } catch (err) {
    console.error("Coach error:", err);
    // Soft, safe error response
    return res.status(500).json({
      error: "Love Coach had a hiccup. Please try again.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
