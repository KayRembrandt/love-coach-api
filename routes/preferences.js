const express = require("express");
const router = express.Router();

const preferences = {};

router.post("/", (req, res) => {
  const { userId, mustHaves, niceToHaves, hardLimits, connectionTypes } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  preferences[userId] = {
    mustHaves: mustHaves || [],
    niceToHaves: niceToHaves || [],
    hardLimits: hardLimits || [],
    connectionTypes: connectionTypes || [],
  };

  res.json({ success: true, preferences: preferences[userId] });
});

router.get("/:userId", (req, res) => {
  const pref = preferences[req.params.userId];
  if (!pref) return res.status(404).json({ error: "No preferences found" });
  res.json(pref);
});

module.exports = router;
