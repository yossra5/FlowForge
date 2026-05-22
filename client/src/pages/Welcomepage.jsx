// client/src/pages/WelcomePage.jsx
// Shows after login or register.
// Displays the user's avatar + username for 3 seconds, then calls onContinue().

import React, { useEffect, useState } from "react";
import { ArrowRight, Workflow } from "lucide-react";

export default function WelcomePage({ user, onContinue }) {
  const [count, setCount] = useState(3);

  // Countdown + auto-redirect
  useEffect(() => {
    if (count <= 0) { onContinue(); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onContinue]);

  // Fallback initials avatar if no photo
  const hasAvatar = !!user?.avatarUrl;

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* FlowForge logo top */}
        <div style={s.brand}>
          <div style={s.brandIcon}><Workflow size={18} color="#e06c3a" /></div>
          <span style={s.brandName}>FlowForge</span>
        </div>

        {/* Avatar */}
        <div style={s.avatarWrap}>
          {hasAvatar ? (
            <img src={user.avatarUrl} alt="avatar" style={s.avatar} />
          ) : (
            <div style={s.avatarFallback}>
              <span style={s.avatarInitial}>
                {(user?.username?.[0] || "?").toUpperCase()}
              </span>
            </div>
          )}
          {/* Animated ring */}
          <div style={s.ring} />
        </div>

        {/* Text */}
        <p style={s.welcome}>Welcome back,</p>
        <p style={s.username}>@{user?.username}</p>

        {/* Progress bar */}
        <div style={s.progressTrack}>
          <div
            style={{
              ...s.progressBar,
              width: `${((3 - count) / 3) * 100}%`,
              transition: count < 3 ? "width 1s linear" : "none",
            }}
          />
        </div>
        <p style={s.hint}>Redirecting in {count}s…</p>

        {/* Skip button */}
        <button style={s.skipBtn} onClick={onContinue}>
          Continue <ArrowRight size={14} style={{ marginLeft: 6 }} />
        </button>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#0a0a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    background: "#13132a",
    border: "1px solid #2d2d4e",
    borderRadius: 24,
    padding: "50px 44px",
    textAlign: "center",
    width: 380,
    maxWidth: "92vw",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0,
    animation: "fadeIn 0.4s ease",
  },

  // Brand
  brand: { display: "flex", alignItems: "center", gap: 8, marginBottom: 36 },
  brandIcon: {
    width: 32, height: 32, borderRadius: 8,
    background: "#1a1a2e", border: "1px solid #2d2d4e",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  brandName: { fontSize: 16, fontWeight: 700, color: "#e8e8f0" },

  // Avatar
  avatarWrap: { position: "relative", marginBottom: 24 },
  avatar: {
    width: 110, height: 110,
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #e06c3a",
    display: "block",
    position: "relative",
    zIndex: 2,
  },
  avatarFallback: {
    width: 110, height: 110,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1a1a2e, #2d2d4e)",
    border: "4px solid #e06c3a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  avatarInitial: { fontSize: 44, fontWeight: 700, color: "#e06c3a" },
  ring: {
    position: "absolute",
    top: -8, left: -8, right: -8, bottom: -8,
    borderRadius: "50%",
    border: "2px solid #e06c3a33",
    animation: "pulse 2s ease-in-out infinite",
    zIndex: 1,
  },

  // Text
  welcome: { margin: "0 0 4px", fontSize: 15, color: "#888", fontWeight: 400 },
  username:{ margin: "0 0 28px", fontSize: 26, fontWeight: 700, color: "#e8e8f0" },

  // Progress
  progressTrack: {
    width: "100%", height: 3,
    background: "#2d2d4e",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, #e06c3a, #ff8a4c)",
    borderRadius: 2,
  },
  hint: { margin: "0 0 24px", fontSize: 12, color: "#555" },

  // Button
  skipBtn: {
    display: "flex",
    alignItems: "center",
    background: "none",
    border: "1px solid #2d2d4e",
    borderRadius: 8,
    padding: "9px 20px",
    fontSize: 13,
    color: "#888",
    cursor: "pointer",
    transition: "all 0.15s",
  },
};