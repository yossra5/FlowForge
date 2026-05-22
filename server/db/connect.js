// server/db/connect.js
// Connects to MongoDB via Mongoose and exports the User + Workflow models.

const mongoose = require("mongoose");

// ─── Connect ──────────────────────────────────────────────────────────────────

async function connectDB() {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/flowforge";
    try {
        await mongoose.connect(uri);
        console.log("[DB] Connected to MongoDB:", uri);
    } catch (err) {
        console.error("[DB] Connection failed:", err.message);
        process.exit(1); // crash fast if DB is unreachable
    }
}

// ─── User Model ───────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
        username: { type: String, required: true, unique: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        password: { type: String, required: true }, // bcrypt hash
        avatarUrl: {
            type: String,
            default: null
        },
    }, { timestamps: true } // adds createdAt + updatedAt automatically
);

const User = mongoose.model("User", userSchema);

// ─── Workflow Model ───────────────────────────────────────────────────────────
// "data" stores the full workflow JSON (nodes, edges, metadata).
// It's stored as a plain JS object — MongoDB handles JSON natively,
// no need to stringify/parse like we did with SQLite.

const workflowSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, default: "My Workflow" },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const Workflow = mongoose.model("Workflow", workflowSchema);

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { connectDB, User, Workflow };