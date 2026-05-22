// client/src/components/TriggerConfigModal.jsx
// ManualTrigger → shows variable definition form + config
// ScheduleTrigger → shows schedule config (unchanged)

import React, { useState, useEffect } from "react";
import { X, Clock, Zap, Plus, Trash2, Variable, Pencil, Check } from "lucide-react";
import { useVariables } from "../context/VariablesContext";

const ICON_MAP  = { ScheduleTrigger: Clock, ManualTrigger: Zap };
const COLOR_MAP = { ScheduleTrigger: "#3b82f6", ManualTrigger: "#10b981" };

const VAR_TYPES = ["string", "number", "boolean", "object"];

export default function TriggerConfigModal({ node, onSave, onClose, onRename }) {
  const p = node.data.parameters || {};
  const [config, setConfig] = useState({ ...p });
  const { variables, addVariable, updateVariable, removeVariable } = useVariables();

  // ── Title Rename State ─────────────────────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(node.data.label);

  const commitTitleRename = () => {
    if (draftTitle.trim() && onRename) {
      onRename(node.id, draftTitle.trim());
    }
    setEditingTitle(false);
  };

  // Sync draft when node label changes
  useEffect(() => {
    setDraftTitle(node.data.label);
  }, [node.data.label]);

  const set = (key, val) => setConfig((c) => ({ ...c, [key]: val }));
  const Icon  = ICON_MAP[node.data.type]  || Zap;
  const color = COLOR_MAP[node.data.type] || "#10b981";

  const handleSave = () => {
    if (node.data.type === "ManualTrigger") {
      onSave({ ...config, variables });
    } else {
      onSave(config);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>

        {/* Header with Rename Support */}
        <div style={s.header}>
          <div style={s.hLeft}>
            <div style={{ ...s.icon, background: color }}>
              <Icon size={15} color="#fff" />
            </div>
            
            <div style={{ flex: 1 }}>
              {editingTitle ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    style={s.titleInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitTitleRename();
                      if (e.key === "Escape") {
                        setDraftTitle(node.data.label);
                        setEditingTitle(false);
                      }
                    }}
                    onBlur={commitTitleRename}
                    autoFocus
                  />
                  <button onClick={commitTitleRename} style={s.smallIconBtn}>
                    <Check size={14} />
                  </button>
                  <button 
                    onClick={() => { 
                      setDraftTitle(node.data.label); 
                      setEditingTitle(false); 
                    }} 
                    style={s.smallIconBtn}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={s.hTitle}>{node.data.label}</p>
                  <button
                    onClick={() => setEditingTitle(true)}
                    style={s.editTitleBtn}
                    title="Rename node"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )}
              <p style={s.hSub}>{node.data.type}</p>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}><X size={17} /></button>
        </div>

        <div style={s.body}>

          {/* ── Schedule Trigger config ── */}
          {node.data.type === "ScheduleTrigger" && <>
            <div style={s.field}>
              <label style={s.label}>Interval</label>
              <select style={s.select} value={config.interval || "hourly"}
                onChange={(e) => set("interval", e.target.value)}>
                <option value="every-minute">Every minute</option>
                <option value="every-5-minutes">Every 5 minutes</option>
                <option value="every-15-minutes">Every 15 minutes</option>
                <option value="every-30-minutes">Every 30 minutes</option>
                <option value="hourly">Every hour</option>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
            </div>
            {config.interval === "daily" && (
              <div style={s.field}>
                <label style={s.label}>Time (UTC)</label>
                <input type="time" style={s.input} value={config.time || "09:00"}
                  onChange={(e) => set("time", e.target.value)} />
              </div>
            )}
            <div style={s.field}>
              <label style={s.checkRow}>
                <input type="checkbox" checked={config.enabled !== false}
                  onChange={(e) => set("enabled", e.target.checked)} />
                <span style={s.label}>Enabled</span>
              </label>
            </div>
            <div style={s.summary}>
              <p style={s.summaryText}>
                Runs <strong>{config.interval || "hourly"}</strong>
                {config.interval === "daily" ? ` at ${config.time || "09:00"} UTC` : ""}.
                Status: <span style={{ color: config.enabled !== false ? "#4ade80" : "#f38ba8" }}>
                  {config.enabled !== false ? "Active" : "Disabled"}
                </span>
              </p>
            </div>
          </>}

          {/* ── Manual Trigger config ── */}
          {node.data.type === "ManualTrigger" && <>
            <div style={s.field}>
              <label style={s.label}>Button Label</label>
              <input type="text" style={s.input} value={config.buttonLabel || "Run Workflow"}
                onChange={(e) => set("buttonLabel", e.target.value)} placeholder="Run Workflow" />
            </div>
            
            {/* ── CONFIRMATION CHECKBOX ── */}
            <div style={s.field}>
              <label style={s.checkRow}>
                <input 
                  type="checkbox" 
                  checked={config.requiresConfirmation !== false}
                  onChange={(e) => set("requiresConfirmation", e.target.checked)} 
                />
                <span style={s.label}>Ask for confirmation before running</span>
              </label>
            </div>

            {/* ── WORKFLOW VARIABLES ── */}
            <div style={s.varSection}>
              <div style={s.varHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Variable size={14} color="#a78bfa" />
                  <span style={s.varTitle}>Workflow Variables</span>
                </div>
                <button style={s.addVarBtn} onClick={addVariable}>
                  <Plus size={12} style={{ marginRight: 4 }} />Add Variable
                </button>
              </div>
              <p style={s.varHint}>
                Define named variables here. Use them in any node with{" "}
                <span style={{ color: "#a78bfa", fontFamily: "monospace" }}>{"{{$var.name}}"}</span>.
                Drag them from the INPUT panel into any field.
              </p>

              {variables.length === 0 && (
                <p style={s.noVars}>No variables yet. Click "Add Variable" to define one.</p>
              )}

              {variables.map((v) => (
                <div key={v.id} style={s.varRow}>
                  <input
                    style={{ ...s.varInput, flex: 2 }}
                    placeholder="variableName"
                    value={v.name}
                    onChange={(e) => updateVariable(v.id, "name", e.target.value.replace(/\s/g, ""))}
                  />
                  <select style={{ ...s.varSelect, flex: 1 }}
                    value={v.type}
                    onChange={(e) => updateVariable(v.id, "type", e.target.value)}>
                    {VAR_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <input
                    style={{ ...s.varInput, flex: 2 }}
                    placeholder="default value"
                    value={v.value}
                    onChange={(e) => updateVariable(v.id, "value", e.target.value)}
                  />
                  <span style={s.varExpr} title="Expression to use in nodes">
                    {v.name ? `{{$var.${v.name}}}` : "…"}
                  </span>
                  <button style={s.varDeleteBtn} onClick={() => removeVariable(v.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {variables.length > 0 && (
                <div style={s.varLegend}>
                  <span style={s.varLegendItem}>Name</span>
                  <span style={s.varLegendItem}>Type</span>
                  <span style={s.varLegendItem}>Default</span>
                  <span style={s.varLegendItem}>Expression</span>
                </div>
              )}
            </div>

            <div style={s.summary}>
              <p style={s.summaryText}>
                Starts when you click <strong>"{config.buttonLabel || "Run Workflow"}"</strong>.
                {config.requiresConfirmation !== false ? " Shows confirmation first." : " No confirmation shown."}
                {variables.length > 0 ? ` ${variables.length} variable${variables.length !== 1 ? "s" : ""} defined.` : ""}
              </p>
            </div>
          </>}
        </div>

        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={s.saveBtn} onClick={handleSave}>Save Node</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay:  { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:    { background: "#13132a", border: "1px solid #2d2d4e", borderRadius: 12, width: 600, maxWidth: "95vw", maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header:   { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #2d2d4e" },
  hLeft:    { display: "flex", alignItems: "center", gap: 11 },
  icon:     { width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  hTitle:   { margin: 0, fontSize: 13, fontWeight: 600, color: "#e8e8f0" },
  hSub:     { margin: 0, fontSize: 10, color: "#555" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#555", padding: 4, display: "flex" },
  body:     { flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: 16 },
  field:    { display: "flex", flexDirection: "column", gap: 6 },
  checkRow: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  label:    { fontSize: 12, fontWeight: 500, color: "#999" },
  input:    { background: "#0d0d20", border: "1px solid #2d2d4e", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "#e8e8f0", outline: "none", fontFamily: "inherit" },
  select:   { background: "#0d0d20", border: "1px solid #2d2d4e", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "#e8e8f0", outline: "none", cursor: "pointer" },
  summary:  { background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 8, padding: "10px 12px" },
  summaryText: { margin: 0, fontSize: 12, color: "#888", lineHeight: 1.6 },

  // Variables section
  varSection: { background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 10, padding: "14px" },
  varHeader:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  varTitle:   { fontSize: 13, fontWeight: 600, color: "#a78bfa" },
  varHint:    { margin: "0 0 12px", fontSize: 11, color: "#555", lineHeight: 1.5 },
  addVarBtn:  { display: "flex", alignItems: "center", background: "#1e1a3a", border: "1px solid #a78bfa44", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#a78bfa", cursor: "pointer" },
  noVars:     { margin: 0, fontSize: 11, color: "#444", textAlign: "center", padding: "12px 0" },
  varRow:     { display: "flex", gap: 6, alignItems: "center", marginBottom: 6 },
  varInput:   { background: "#13132a", border: "1px solid #2d2d4e", borderRadius: 5, padding: "5px 8px", fontSize: 11, color: "#e8e8f0", outline: "none", fontFamily: "inherit", minWidth: 0 },
  varSelect:  { background: "#13132a", border: "1px solid #2d2d4e", borderRadius: 5, padding: "5px 8px", fontSize: 11, color: "#e8e8f0", outline: "none", cursor: "pointer", minWidth: 0 },
  varExpr:    { fontSize: 10, color: "#a78bfa", fontFamily: "monospace", flexShrink: 0, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  varDeleteBtn: { background: "none", border: "none", cursor: "pointer", color: "#555", padding: 4, display: "flex", flexShrink: 0 },
  varLegend:  { display: "flex", gap: 6, marginTop: 4, paddingTop: 6, borderTop: "1px solid #1e1e3a" },
  varLegendItem: { fontSize: 9, color: "#333", textTransform: "uppercase", letterSpacing: "0.06em", flex: 1 },

  footer:    { display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 18px", borderTop: "1px solid #2d2d4e" },
  cancelBtn: { background: "none", border: "1px solid #2d2d4e", borderRadius: 7, padding: "7px 18px", fontSize: 12, color: "#666", cursor: "pointer" },
  saveBtn:   { background: "#e06c3a", border: "none", borderRadius: 7, padding: "7px 22px", fontSize: 12, color: "#fff", fontWeight: 600, cursor: "pointer" },

  titleInput: {
    fontSize: 15,
    fontWeight: 600,
    background: "#0d0d20",
    border: "1px solid #e06c3a",
    borderRadius: 6,
    padding: "4px 8px",
    color: "#e8e8f0",
    outline: "none",
    minWidth: 200,
  },

  editTitleBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#666",
    padding: 4,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
  },

  smallIconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#888",
    padding: 4,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
  },
};