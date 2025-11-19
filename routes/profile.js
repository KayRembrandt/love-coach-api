const express = require("express");
const router = express.Router();

// TEMP in-memory store (later: real DB)
const profiles = {};

router.post("/", (req, res) => {
  const { userId, name, ageRange, pronouns, goals, tonePreference } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  profiles[userId] = {
    name,
    ageRange,
    pronouns,
    goals,
    tonePreference,
  };

  res.json({ success: true, profile: profiles[userId] });
});

router.get("/:userId", (req, res) => {
  const profile = profiles[req.params.userId];
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
});

module.exports = router;
