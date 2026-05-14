const express = require("express");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//----------- Register ----------

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    //validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email }); //email : email

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    //bcrypt hashing

    const hashedPassword = await bcrypt.hash(password, 10);

    //create user
    const user = await User.create({
      name,
      email: email.trim(),
      password: hashedPassword,
      authProvider: "local",
    });
    //alternative is user = new User({name,emai}) await user.save() shortcut is better

    const token = jwt.sign(
      { userId: user.userId, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "4h" },
    );
    const safeUser = {
      userId: user.userId,
      name: user.name,
      email: user.email,
    };
    //response
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      //   error: error.message,
    });
    console.log("Server error : ", error);
  }
});
// --------- End of Register -----------

// -------- Login -------------------

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    //Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findOne({ email: email.trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    const isPasswordMatches = await bcrypt.compare(password, user.password);

    if (!isPasswordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "4h" },
    );

    const safeUser = {
      userId: user.userId,
      name: user.name,
      email: user.email,
    };
    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      //   error: error.message hide error in production
    });
  }
});

//-------- End of Login -----------------

// ------------- Current User ------------
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select(
      "-password",
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch current user",
    });
    console.log("Server error: ", error);
  }
});

// Google login
/*
========================================
GOOGLE LOGIN
========================================
*/

router.post(
  "/google-login",

  async (req, res) => {
    try {
      const { credential } = req.body;

      /*
      ========================================
      Verify Google Token
      ========================================
      */

      const ticket = await client.verifyIdToken({
        idToken: credential,

        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      /*
      ========================================
      Extract User Data
      ========================================
      */

      const email = payload.email.trim();

      const name = payload.name;

      /*
      ========================================
      Find Existing User
      ========================================
      */

      let user = await User.findOne({
        email,
      });

      /*
      ========================================
      Create User
      ========================================
      */

      if (!user) {
        user = await User.create({
          name,

          email,

          authProvider: "google",

          password: "GOOGLE_AUTH_USER",
        });
      }

      /*
      ========================================
      Generate JWT
      ========================================
      */

      const token = jwt.sign(
        {
          userId: user.userId,

          email: user.email,

          name: user.name,
        },

        process.env.JWT_SECRET,

        {
          expiresIn: "4h",
        },
      );

      /*
      ========================================
      Safe User
      ========================================
      */

      const safeUser = {
        userId: user.userId,

        name: user.name,

        email: user.email,
      };

      res.status(200).json({
        success: true,

        message: "Google login successful",

        token,

        user: safeUser,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,

        message: "Google authentication failed",
      });
    }
  },
);

module.exports = router;
