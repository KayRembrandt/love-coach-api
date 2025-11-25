require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
// 👇 Add this line:
console.log("Supabase URL in API:", process.env.SUPABASE_URL);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.get("/health", (_, res) => res.json({ ok: true }));

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

    // Build prompt
    const baseSystemPrompt = buildSystemPrompt(profile, preferences);

    const systemPrompt = `
The user's preferred name is "${displayName}".
Always greet and refer to the user by this name at least once in each response.
Do NOT call the user "friend" or "my friend" unless they explicitly ask for that.

${baseSystemPrompt}
`;


    const history = [
      { role: "system", content: systemPrompt },
      ...sessions[key],
      { role: "user", content: message },
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: history,
      temperature: 0.8,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I’m here with you. Can you say that one more time?";

    // Save to session
    sessions[key].push({ role: "user", content: message });
    sessions[key].push({ role: "assistant", content: reply });

    // Save to Supabase
    const userKey = userId || "anonymous";

    const { error: insertError } = await supabase
      .from("chat_messages")
      .insert([
        {
          user_id: userKey,
          role: "user",
          content: message,
        },
        {
          user_id: userKey,
          role: "assistant",
          content: reply,
        },
      ]);

    if (insertError) {
      console.error("Error saving chat messages to Supabase:", insertError);
    }

    // Reply to app
    return res.json({ reply });
  } catch (err) {
    console.error("Coach error:", err);
    // Soft, safe error response
    return res.status(500).json({
      error: "Love Coach had a hiccup. Please try again.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.post("/waitlist", async (req, res) => {
  try {
    console.log("➡️ Incoming /waitlist payload:", req.body);

    // Try to catch different possible field names
    const { email, first_name, firstName, name } = req.body;

    if (!email) {
      console.error("❌ Missing email");
      return res.status(400).json({ error: "Email is required" });
    }

    const finalFirstName = firstName || first_name || name || null;

    const { data, error } = await supabase
      .from("waitlist")
      .insert([
        {
          email: email.trim().toLowerCase(),
          first_name: finalFirstName,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase Waitlist Insert Error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        body: req.body,
      });
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Waitlist row inserted:", data);
    res.json({ success: true, data });
  } catch (err) {
    console.error("💥 Waitlist route error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
