const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const usersExceptSender = await User.find({
      userId: { $ne: req.user.userId },
    }).select("-password");

    res.status(200).json({
      success: true,
      users: usersExceptSender,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

module.exports = router;
