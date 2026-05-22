// client/src/pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { workflowAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Plus, Trash2, Workflow, LogOut, Clock } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import AvatarCropper from "../components/AvatarCropper";

// ── AvatarEditModal ────────────────────────────────────────────────────────────
function AvatarEditModal({ currentUrl, onClose, onSave }) {
  return (
    <div style={m.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={m.box}>
        <p style={m.title}>Update Profile Picture</p>
        <AvatarCropper
          initialImage={currentUrl || null}
          onCrop={(b64) => { onSave(b64); onClose(); }}
        />
        <button style={m.cancelBtn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

const m = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 },
  box:     { background: "#13132a", border: "1px solid #2d2d4e", borderRadius: 14, padding: "28px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  title:   { margin: 0, fontSize: 15, fontWeight: 600, color: "#e8e8f0" },
  cancelBtn:{ background: "none", border: "1px solid #2d2d4e", borderRadius: 6, padding: "6px 18px", fontSize: 12, color: "#666", cursor: "pointer", marginTop: 4 },
};

// ── Avatar Component ─────────────────────────────────────────────────────────
function Avatar({ url, onClick }) {
  return (
    <img
      src={url || `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><circle cx='20' cy='20' r='20' fill='%231a1a2e'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%23e06c3a'>?</text></svg>`}
      alt="avatar"
      onClick={onClick}
      title="Click to change avatar"
      style={{ 
        width: 32, 
        height: 32, 
        borderRadius: "50%", 
        objectFit: "cover", 
        border: "2px solid #2d2d4e", 
        cursor: "pointer", 
        transition: "border-color 0.15s" 
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#e06c3a"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "#2d2d4e"}
    />
  );
}

export default function DashboardPage({ onOpen }) {
  const { user, logout, updateAvatar } = useAuth();
  const { ui } = useTheme();
  
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  useEffect(() => {
    workflowAPI.list()
      .then((r) => setWorkflows(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await workflowAPI.create({ name: "New Workflow", data: { nodes: [], edges: [] } });
      onOpen(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this workflow?")) return;
    await workflowAPI.delete(id);
    setWorkflows((wf) => wf.filter((w) => w._id !== id));
  };

  const handleAvatarSave = async (b64) => {
    if (avatarSaving) return;
    setAvatarSaving(true);
    try {
      await updateAvatar(b64);
    } catch (err) {
      alert("Failed to update avatar. Please try again.");
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <div style={{ ...s.page, background: ui.bg, color: ui.text }}>
      <header style={{ ...s.bar, background: ui.topbar, borderBottom: `1px solid ${ui.border}` }}>
        <div style={s.barLeft}>
          <div style={s.logoIcon}><Workflow size={18} color="#e06c3a" /></div>
          <span style={{ ...s.logoText, color: ui.text }}>FlowForge</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar url={user?.avatarUrl} onClick={() => setEditingAvatar(true)} />
          <span style={{ fontSize: 13, color: ui.textMuted }}>@{user?.username}</span>
          <button style={{ ...s.iconBtn, color: ui.textMuted }} onClick={logout} title="Log out">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main style={s.main}>
        <div style={s.topRow}>
          <h1 style={{ ...s.heading, color: ui.text }}>My Workflows</h1>
          <button style={s.createBtn} onClick={handleCreate} disabled={creating}>
            <Plus size={15} style={{ marginRight: 6 }} />
            {creating ? "Creating…" : "New Workflow"}
          </button>
        </div>

        {loading && <p style={{ color: ui.textMuted, fontSize: 13 }}>Loading…</p>}

        {!loading && workflows.length === 0 && (
          <div style={s.empty}>
            <Workflow size={40} color="#2d2d4e" />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: ui.textHint }}>No workflows yet</p>
            <p style={{ margin: 0, fontSize: 13, color: ui.textMuted }}>Create your first workflow.</p>
          </div>
        )}

        <div style={s.grid}>
          {workflows.map((wf) => (
            <div 
              key={wf._id}
              style={{ ...s.card, background: ui.surface, border: `1px solid ${ui.border}` }}
              onClick={() => onOpen(wf)}
            >
              <div style={s.cardIcon}><Workflow size={20} color="#e06c3a" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: ui.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {wf.name}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: ui.textMuted, display: "flex", alignItems: "center" }}>
                  <Clock size={11} style={{ marginRight: 4 }} />
                  {new Date(wf.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <button 
                style={{ background: "none", border: "none", cursor: "pointer", color: ui.textMuted, padding: 6, borderRadius: 6, display: "flex" }}
                onClick={(e) => handleDelete(wf._id, e)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </main>

      {editingAvatar && (
        <AvatarEditModal
          currentUrl={user?.avatarUrl}
          onClose={() => setEditingAvatar(false)}
          onSave={handleAvatarSave}
        />
      )}
    </div>
  );
}

const s = {
  page:    { minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", transition: "background 0.3s" },
  bar:     { height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" },
  barLeft: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon:{ width: 32, height: 32, borderRadius: 8, background: "#1a1a2e", border: "1px solid #2d2d4e", display: "flex", alignItems: "center", justifyContent: "center" },
  logoText:{ fontSize: 16, fontWeight: 700 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex", alignItems: "center" },
  main:    { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  topRow:  { display: "flex", justifyContent: "space-between", marginBottom: 28 },
  heading: { margin: 0, fontSize: 22, fontWeight: 700 },
  createBtn:{ display: "flex", alignItems: "center", background: "#e06c3a", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" },
  empty:   { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 0" },
  grid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 14 },
  card:    { borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all 0.2s" },
  cardIcon:{ width: 40, height: 40, borderRadius: 9, background: "#1a1a2e", border: "1px solid #2d2d4e", display: "flex", alignItems: "center", justifyContent: "center" },
};