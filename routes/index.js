const express = require("express");
const router = express.Router();

const loveCoachRouter = require("./loveCoach");

router.use("/love-coach", loveCoachRouter);

module.exports = router;
