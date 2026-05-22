// client/src/pages/AuthPage.jsx
// Login + Register. After success, App.jsx reads user from AuthContext
// and shows WelcomePage automatically — no window.location needed.

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Workflow } from "lucide-react";
import AvatarCropper from "../components/AvatarCropper";

export default function AuthPage() {
  const { login, register } = useAuth();

  const [tab,          setTab]          = useState("login");
  const [form,         setForm]         = useState({ username: "", email: "", password: "" });
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(form.username, form.password);
        // AuthContext.user is now set → App.jsx renders WelcomePage
      } else {
        if (!form.email) { setError("Email is required."); setLoading(false); return; }
        await register(form.username, form.email, form.password, avatarBase64);
        // Same — App.jsx takes over
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logo}>
          <div style={s.logoIcon}><Workflow size={22} color="#e06c3a" /></div>
          <span style={s.logoText}>FlowForge</span>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {["login", "register"].map((t) => (
            <button key={t}
              style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
              onClick={() => { setTab(t); setError(""); setAvatarBase64(null); }}>
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Avatar upload — register only */}
        {tab === "register" && (
          <div style={s.avatarSection}>
            <p style={s.avatarLabel}>Profile Picture (Optional)</p>
            {avatarBase64 ? (
              <div style={s.previewContainer}>
                <img src={avatarBase64} alt="Preview" style={s.previewImage} />
                <button style={s.changeBtn} onClick={() => setAvatarBase64(null)}>
                  Change Photo
                </button>
              </div>
            ) : (
              <AvatarCropper onCrop={(b64) => setAvatarBase64(b64)} />
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input style={s.input} placeholder="your_username"
              value={form.username} onChange={setField("username")} required />
          </div>

          {tab === "register" && (
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" placeholder="you@example.com"
                value={form.email} onChange={setField("email")} required />
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>
              Password{" "}
              {tab === "register" && <span style={{ fontWeight: 400, color: "#555" }}>(min 6 chars)</span>}
            </label>
            <input style={s.input} type="password" placeholder="••••••••"
              value={form.password} onChange={setField("password")} required minLength={6} />
          </div>

          {error && <p style={s.error}>{error}</p>}

          <button style={{ ...s.submit, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p style={s.switchText}>
          {tab === "login" ? "No account? " : "Already registered? "}
          <span style={s.switchLink}
            onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(""); setAvatarBase64(null); }}>
            {tab === "login" ? "Register" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

const s = {
  page:    { minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  card:    { background: "#13132a", border: "1px solid #2d2d4e", borderRadius: 16, padding: "32px 36px", width: 420, maxWidth: "94vw", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" },
  logo:    { display: "flex", alignItems: "center", gap: 10, marginBottom: 26, justifyContent: "center" },
  logoIcon:{ width: 40, height: 40, borderRadius: 10, background: "#1a1a2e", border: "1px solid #2d2d4e", display: "flex", alignItems: "center", justifyContent: "center" },
  logoText:{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" },
  tabs:    { display: "flex", background: "#0d0d20", border: "1px solid #2d2d4e", borderRadius: 8, overflow: "hidden", marginBottom: 20 },
  tab:     { flex: 1, background: "none", border: "none", padding: "9px 0", fontSize: 13, cursor: "pointer", color: "#666", transition: "all 0.15s" },
  tabActive:{ background: "#1a1a2e", color: "#e06c3a", fontWeight: 600 },
  avatarSection:   { marginBottom: 20, textAlign: "center" },
  avatarLabel:     { margin: "0 0 8px 0", fontSize: 11, fontWeight: 500, color: "#888" },
  previewContainer:{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  previewImage:    { width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "2px solid #e06c3a" },
  changeBtn:       { background: "none", border: "1px solid #2d2d4e", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: "#89b4fa", cursor: "pointer" },
  form:    { display: "flex", flexDirection: "column", gap: 14 },
  field:   { display: "flex", flexDirection: "column", gap: 6 },
  label:   { fontSize: 12, fontWeight: 500, color: "#888" },
  input:   { background: "#0d0d20", border: "1px solid #2d2d4e", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#e8e8f0", outline: "none", fontFamily: "inherit" },
  error:   { margin: 0, fontSize: 12, color: "#f38ba8", background: "rgba(243,139,168,0.08)", border: "1px solid rgba(243,139,168,0.2)", borderRadius: 6, padding: "8px 12px" },
  submit:  { background: "linear-gradient(135deg,#e06c3a,#ff8a4c)", border: "none", borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", marginTop: 4, boxShadow: "0 6px 20px rgba(224,108,58,0.25)" },
  switchText:{ margin: "16px 0 0", fontSize: 12, color: "#555", textAlign: "center" },
  switchLink:{ color: "#e06c3a", cursor: "pointer", fontWeight: 500 },
};