require("dotenv/config");
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv/config");
const app = express();
app.use(cors());
app.use(express.json());

// OpenAI client (we'll wire this in soon)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔑 Use our local routes folder
const router = require("./routes");

// Mount all routes under /api
app.use("/api", router);
// Health check
app.get("/", (req, res) => {
  res.send("Love Coach API is running ❤️");});
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
 console.log(`Love Coach API running on http://localhost:${PORT}`);
});


app.post("/coach", async (req, res) => {
  try {
    const { message, history = [], toneProfile } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    console.log("📝 Incoming /coach message:", message);

    // Recent user messages from history for context
    const userMessages = (history || [])
      .filter(
        (m) =>
          m &&
          m.from === "user" &&
          typeof m.text === "string" &&
          m.text.trim().length > 0
      )
      .map((m) => m.text.trim())
      .slice(-6);

    const styleHint =
      toneProfileToText(toneProfile) || buildStyleHint(userMessages);

    const messages = [
      {
        role: "system",
        content:
          "You are a warm, emotionally intelligent dating coach. " +
          "You are kind, concise, practical, and always support the user's self-worth. " +
          "You never shame, manipulate, blame, or pressure. " +
          "You help them honor their boundaries, notice red and green flags, and choose connections that feel safe and mutual.",
      },
      {
        role: "system",
        content:
          "Adapt your writing style slightly to feel natural for this user: " +
          (styleHint ||
            "use a friendly, human, conversational tone that doesn't sound generic."),
      },
      {
        role: "system",
        content:
          "If drafting messages for them to send to others, keep it aligned with their tone and values, " +
          "clear, kind, and honest. Avoid being overly formal or pushy.",
      },
    ];

    // Add a bit of recent context (optional, lightweight)
    userMessages.forEach((text) => {
      messages.push({
        role: "user",
        content: text,
      });
    });

    // Current message last
    messages.push({
      role: "user",
      content: message,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const text =
      (completion.choices &&
        completion.choices[0] &&
        completion.choices[0].message &&
        completion.choices[0].message.content &&
        completion.choices[0].message.content.trim()) ||
      "I’m here with you in this. ❤️";

    console.log("🤖 Coach reply:", text);

    res.json({ reply: text });
  } catch (err) {
    console.error(
      "❌ Coach error:",
      err?.response?.data || err.message || err
    );
    res.status(500).json({
      error: "Something went wrong talking to your coach.",
    });
  }
});

function toneProfileToText(p) {
  if (!p) return "";
  const traits = [];
  if (p.concise) traits.push("short and to the point");
  if (p.reflective) traits.push("thoughtful and reflective");
  if (p.usesEmojis) traits.push("comfortable with emojis");
  if (p.expressive) traits.push("expressive and enthusiastic");

  if (!traits.length) return "";
  return (
    "match a tone that feels " +
    traits.join(", ") +
    ", while staying emotionally grounded, kind, and clear."
  );
}

function buildStyleHint(userMessages) {
  if (!userMessages || userMessages.length === 0) return "";

  const all = userMessages.join(" ");
  const avgLength = all.length / userMessages.length;
  const exclaims = (all.match(/!/g) || []).length;
  const questionMarks = (all.match(/\?/g) || []).length;

  const traits = [];
  if (avgLength < 40) traits.push("brief and direct");
  if (avgLength > 120) traits.push("reflective and detailed");
  if (exclaims > 3) traits.push("emotionally expressive");
  if (questionMarks > 2) traits.push("curious and introspective");

  if (!traits.length) return "";
  return (
    "lean slightly toward a style that feels " +
    traits.join(", ") +
    ", without overdoing it."
  );
}


