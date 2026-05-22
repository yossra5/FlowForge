// server/index.js

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");

const { connectDB } = require("./db/connect");
const authRoutes = require("./routes/auth");
const workflowRoutes = require("./routes/workflows");
const executeRoutes = require("./routes/execute");
const aiRoutes = require("./routes/ai"); // ← ADD THIS
const app = express();
const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGO_URI || "mongodb://localhost:27017/flowforge";
const isProd = process.env.NODE_ENV === "production";

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json({ limit: "5mb" }));

app.use(cors({
    origin: isProd ? false : "http://localhost:3000",
    credentials: true,
}));

// Sessions stored in MongoDB (same DB, "sessions" collection)
app.use(session({
    store: MongoStore.create({
        mongoUrl: MONGO,
        collectionName: "sessions",
        ttl: 7 * 24 * 60 * 60, // 7 days in seconds
    }),
    secret: process.env.SESSION_SECRET || "change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
    },
}));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/ai", aiRoutes); // ← ADD THIS

app.get("/api/health", (req, res) => res.json({ ok: true, db: "mongodb" }));

// ─── Serve React in production ────────────────────────────────────────────────

if (isProd) {
    const buildPath = path.join(__dirname, "../client/build");
    app.use(express.static(buildPath));
    app.get("*", (req, res) =>
        res.sendFile(path.join(buildPath, "index.html"))
    );
}

// ─── Start (connect DB first, then listen) ────────────────────────────────────

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`[server] Running on http://localhost:${PORT}`);
        console.log(`[server] Mode: ${isProd ? "production" : "development"}`);
    });
});