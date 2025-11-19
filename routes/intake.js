const express = require("express");
const router = express.Router();

const intakes = {};

router.post("/", (req, res) => {
  const { userId, answers } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: "answers must be an array" });
  }

  intakes[userId] = { answers }; // later: add tags, scores, etc.
  res.json({ success: true });
});

router.get("/:userId", (req, res) => {
  const data = intakes[userId];
  if (!data) return res.status(404).json({ error: "No intake found" });
  res.json(data);
});

module.exports = router;
