// server/routes/auth.js

const express = require("express");
const bcrypt = require("bcryptjs");
const { User } = require("../db/connect");

const router = express.Router();

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", async(req, res) => {
    const { username, email, password, avatarBase64 } = req.body;

    if (!username || !email || !password)
        return res.status(400).json({ error: "username, email and password are required." });

    if (password.length < 6)
        return res.status(400).json({ error: "Password must be at least 6 characters." });

    try {
        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing)
            return res.status(409).json({ error: "Username or email already taken." });

        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            email,
            password: hash,
            avatarUrl: avatarBase64 || null
        });

        req.session.userId = user._id.toString();
        req.session.username = user.username;

        return res.status(201).json({
            id: user._id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl
        });
    } catch (err) {
        console.error("[register]", err);
        return res.status(500).json({ error: "Server error." });
    }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async(req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: "username and password are required." });

    try {
        const user = await User.findOne({ username });
        if (!user)
            return res.status(401).json({ error: "Invalid username or password." });

        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(401).json({ error: "Invalid username or password." });

        req.session.userId = user._id.toString();
        req.session.username = user.username;

        return res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl
        });
    } catch (err) {
        console.error("[login]", err);
        return res.status(500).json({ error: "Server error." });
    }
});

// ─── PUT /api/auth/avatar ─────────────────────────────────────────────────────
router.put("/avatar", async(req, res) => {
    const { avatarBase64 } = req.body;

    if (!avatarBase64) {
        return res.status(400).json({ error: "avatarBase64 is required" });
    }

    if (!req.session.userId) {
        return res.status(401).json({ error: "Not logged in." });
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.avatarUrl = avatarBase64;
        await user.save();

        res.json({
            success: true,
            avatarUrl: avatarBase64,
            message: "Avatar updated successfully"
        });
    } catch (err) {
        console.error("[avatar update]", err);
        res.status(500).json({ error: "Failed to update avatar" });
    }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: "Could not log out." });
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out." });
    });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", async(req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Not logged in." });

    try {
        const user = await User.findById(req.session.userId).select("-password");
        if (!user) return res.status(404).json({ error: "User not found." });

        return res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl
        });
    } catch (err) {
        return res.status(500).json({ error: "Server error." });
    }
});

module.exports = router;