// client/src/components/HttpRequestModal.jsx

import React, { useState } from "react";
import { X, Plus, Trash2, Globe, ChevronDown, Play, Loader, Pencil, Check } from "lucide-react";
import { executeAPI } from "../services/api";
import { useNodeExecution } from "../context/NodeExecutionContext";
import InputPanel  from "./InputPanel";
import OutputPanel from "./OutputPanel";
import SmartInput from "./SmartInput";  


const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const TABS    = ["Parameters", "Authentication", "Settings"];
const ACCENT = "#e06c3a";

// Helper to collect available variables from workflow
function getAvailableVariablesFromWorkflow(nodes, workflow) {
  const vars = [];
  
  // ONLY add user-defined ManualTrigger variables (clean names, no prefixes)
  if (nodes && nodes.length) {
    for (const canvasNode of nodes) {
      if (canvasNode.data?.type === "ManualTrigger" && canvasNode.data?.parameters?.variables) {
        for (const v of canvasNode.data.parameters.variables) {
          if (v.name && !vars.includes(v.name)) {
            vars.push(v.name);
          }
        }
      }
    }
  }
  
  return vars;
}

// ── makeDroppable ─────────────────────────────────────────────────────────────
function makeDroppable(setter, currentValue) {
  return {
    onDrop: (e) => {
      e.preventDefault();
      const expr = e.dataTransfer.getData("text/expression");
      if (!expr) return;

      const input = e.currentTarget;
      const start = input.selectionStart ?? currentValue.length;
      const end   = input.selectionEnd   ?? currentValue.length;
      const newValue = currentValue.slice(0, start) + expr + currentValue.slice(end);
      setter(newValue);
    },
    onDragOver: (e) => e.preventDefault(),
  };
}

// ModeToggle component
function ModeToggle({ mode, onChange }) {
  return (
    <div style={{
      display: "inline-flex",
      background: "#0d0d20",
      border: "1px solid #2d2d4e",
      borderRadius: 999,
      overflow: "hidden",
    }}>
      {["fixed", "expression"].map((option) => (
        <button
          key={option}
          type="button"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            fontSize: 10,
            color: mode === option ? "#e06c3a" : "#888",
            fontWeight: mode === option ? 600 : 400,
            background: mode === option ? "#2d2d4e" : "none",
          }}
          onClick={() => onChange(option)}
        >
          {option === "fixed" ? "Fixed" : "Expr"}
        </button>
      ))}
    </div>
  );
}

export default function HttpRequestModal({ node, onSave, onClose, onRename, nodes, edges, workflow }) {
  const p = node.data.parameters || {};
  const { setRunResults: setGlobalResults } = useNodeExecution();

  // ── Local state ───────────────────────────────────────────────────────────
  const [baseUrl,      setBaseUrl]      = useState(p.base_url || "");
  const [baseUrlMode,  setBaseUrlMode]  = useState(p.base_url_mode || "fixed");
  const [endpoint,     setEndpoint]     = useState(p.endpoint || "");
  const [endpointMode, setEndpointMode] = useState(p.endpoint_mode || "fixed");
  const [method,       setMethod]       = useState(p.method || "GET");
  const [payloadType,  setPayloadType]  = useState(p.payload?.type || "keypair");
  const [payloadFields, setPayloadFields] = useState(
    p.payload?.fields?.length
      ? p.payload.fields.map((f) => ({ ...f, valueType: f.valueType || "string", valueMode: f.valueMode || "fixed" }))
      : [{ key: "", value: "", valueType: "string", valueMode: "fixed" }]
  );
  const [payloadJson, setPayloadJson]   = useState(p.payload?.json || "");
  const [payloadJsonMode, setPayloadJsonMode] = useState(p.payload?.jsonMode || "fixed");
  const [auth,        setAuth]          = useState(() => {
    const initialAuth = p.authentication ? { ...p.authentication } : { type: "none" };
    if (initialAuth.bearerToken) {
      initialAuth.bearerToken.mode = initialAuth.bearerToken.mode || "fixed";
    }
    if (initialAuth.apiKey) {
      initialAuth.apiKey.nameMode = initialAuth.apiKey.nameMode || "fixed";
      initialAuth.apiKey.valueMode = initialAuth.apiKey.valueMode || "fixed";
    }
    if (initialAuth.basicAuth) {
      initialAuth.basicAuth.usernameMode = initialAuth.basicAuth.usernameMode || "fixed";
      initialAuth.basicAuth.passwordMode = initialAuth.basicAuth.passwordMode || "fixed";
    }
    return initialAuth;
  });
  const [tab,         setTab]           = useState("Parameters");
  const [executing,   setExecuting]     = useState(false);

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
  React.useEffect(() => {
    setDraftTitle(node.data.label);
  }, [node.data.label]);

  const hasBody = ["POST", "PUT", "PATCH"].includes(method);
  
  // Get available variables for AI suggestions
  const availableVariables = getAvailableVariablesFromWorkflow(nodes, workflow);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    onSave({
      base_url: baseUrl.trim(),
      base_url_mode: baseUrlMode,
      endpoint: endpoint.trim(),
      endpoint_mode: endpointMode,
      method,
      payload: {
        type:   payloadType,
        fields: payloadFields,
        json:   payloadType === "json" ? payloadJson : "",
        jsonMode: payloadJsonMode,
      },
      authentication: auth,
      settings: p.settings || {},
    });
  };

  // ── Execute single node ────────────────────────────────────────────────────
  const handleExecuteStep = async () => {
    setExecuting(true);
    try {
      const res = await executeAPI.runNode({
        base_url: baseUrl.trim(),
        endpoint: endpoint.trim(),
        method,
        payload: { type: payloadType, fields: payloadFields, json: payloadJson, jsonMode: payloadJsonMode },
        authentication: auth,
      });
      setGlobalResults([{
        nodeId:   node.id,
        label:    node.data.label,
        type:     node.data.type,
        status:   res.data.status,
        data:     res.data.data,
        error:    null,
        duration: 0,
      }]);
    } catch (err) {
      setGlobalResults([{
        nodeId:   node.id,
        label:    node.data.label,
        type:     node.data.type,
        status:   "error",
        data:     null,
        error:    err.response?.data?.error || err.message,
        duration: 0,
      }]);
    } finally {
      setExecuting(false);
    }
  };

  // ── Payload field helpers ─────────────────────────────────────────────────
  const addField    = () => setPayloadFields([...payloadFields, { key: "", value: "", valueType: "string", valueMode: "fixed" }]);
  const removeField = (i) => setPayloadFields(payloadFields.filter((_, idx) => idx !== i));
  const updateField = (i, f, v) =>
    setPayloadFields(payloadFields.map((x, idx) => idx === i ? { ...x, [f]: v } : x));

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>

        {/* Header with Rename */}
        <div style={s.header}>
          <div style={s.hLeft}>
            <div style={{ ...s.nodeIcon, background: ACCENT }}>
              <Globe size={15} color="#fff" />
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
              <p style={s.hSub}>APICall Node</p>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}><X size={17} /></button>
        </div>

        {/* 3-panel body */}
        <div style={s.threePanel}>

          {/* LEFT — Input panel */}
          <InputPanel nodeId={node.id} nodes={nodes} edges={edges} />

          {/* CENTER — Config */}
          <div style={s.center}>
            <div style={s.tabs}>
              {TABS.map((t) => (
                <button key={t}
                  style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
                  onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>

            <div style={s.centerBody}>
              {/* PARAMETERS */}
              {tab === "Parameters" && <>

                {/* Method */}
                <div style={s.field}>
                  <label style={s.label}>Method</label>
                  <div style={s.selWrap}>
                    <select value={method} onChange={(e) => setMethod(e.target.value)} style={s.select}>
                      {METHODS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={12} style={s.selIcon} />
                  </div>
                </div>

                {/* Base URL */}
                 <SmartInput
                  label="Base URL"
                  value={baseUrl}
                  onChange={setBaseUrl}
                  placeholder="https://api.example.com"
                  mode={baseUrlMode}
                  onModeChange={setBaseUrlMode}
                  nodeType="APICall"
                  fieldName="base_url"
                  workflowId={workflow?._id || workflow?.id}
                  currentNodeId={node.id}
                  contextVariables={availableVariables}
                  nodes={nodes}
                  style={s.input}
                />

                {/* Endpoint - USING SMARTINPUT */}
                <SmartInput
                  label="Endpoint"
                  value={endpoint}
                  onChange={setEndpoint}
                  placeholder="/users/{{userId}}"
                  mode={endpointMode}
                  onModeChange={setEndpointMode}
                  nodeType="APICall"
                  fieldName="endpoint"
                  workflowId={workflow?._id || workflow?.id}
                  currentNodeId={node.id}
                  contextVariables={availableVariables}
                  nodes={nodes}
                  style={s.input}
                />

                {/* Body section */}
                {hasBody && (
                  <div style={s.field}>
                    <div style={s.labelRow}>
                      <label style={s.label}>Body</label>
                      <div style={s.toggle}>
                        {["keypair", "json"].map((m) => (
                          <button key={m}
                            style={{ ...s.toggleBtn, ...(payloadType === m ? s.toggleActive : {}) }}
                            onClick={() => setPayloadType(m)}>
                            {m === "keypair" ? "Key / Value" : "JSON"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {payloadType === "keypair" && (
                      <div style={s.kvList}>
                        <div style={s.kvHeader}>
                          <span style={{ flex: 2, color: "#888", fontSize: 10 }}>Key</span>
                          <span style={{ flex: 1, color: "#888", fontSize: 10 }}>Type</span>
                          <span style={{ flex: 2, color: "#888", fontSize: 10 }}>Value</span>
                          <span style={{ width: 32 }} />
                        </div>
                        {payloadFields.map((f, i) => (
                          <div key={i} style={s.kvRow}>
                            <input placeholder="Key" style={{ ...s.input, flex: 2 }}
                              value={f.key} onChange={(e) => updateField(i, "key", e.target.value)}
                              {...makeDroppable((v) => updateField(i, "key", v), f.key)} />
                            <div style={{ flex: 1 }}>
                              <select value={f.valueType || "string"}
                                onChange={(e) => updateField(i, "valueType", e.target.value)}
                                style={s.select}>
                                {['string', 'number', 'boolean', 'object', 'list'].map((type) => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ flex: 2 }}>
                              <input placeholder="Value" style={s.input}
                                value={f.value} onChange={(e) => updateField(i, "value", e.target.value)}
                                {...makeDroppable((v) => updateField(i, "value", v), f.value)} />
                            </div>
                            <button style={s.iconBtn} onClick={() => removeField(i)}><Trash2 size={12} /></button>
                          </div>
                        ))}
                        <button style={s.addBtn} onClick={addField}>
                          <Plus size={12} style={{ marginRight: 4 }} />Add field
                        </button>
                      </div>
                    )}

                    {payloadType === "json" && (
                      <div>
                        <div style={{ ...s.labelRow, marginBottom: 6 }}>
                          <label style={s.label}>JSON Body</label>
                          <ModeToggle mode={payloadJsonMode} onChange={setPayloadJsonMode} />
                        </div>
                        <ExpressionAwareInput
                          isTextarea={true}
                          rows={5}
                          placeholder={'{\n  "key": "{{value}}"\n}'}
                          value={payloadJson}
                          onChange={setPayloadJson}
                          style={s.textarea}
                          nodeType="APICall"
                          fieldName="payload_json"
                          workflowId={workflow?._id || workflow?.id}
                          currentNodeId={node.id}
                          contextVariables={availableVariables}
                          nodes={nodes}
                          onDrop={(e) => {
                            const expr = e.dataTransfer.getData("text/expression");
                            if (expr) {
                              e.preventDefault();
                              setPayloadJson(payloadJson + expr);
                            }
                          }}
                          onDragOver={(e) => e.preventDefault()}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>}

              {/* AUTHENTICATION */}
              {tab === "Authentication" && (
                <div style={s.field}>
                  <label style={s.label}>Auth Type</label>
                  <div style={s.selWrap}>
                    <select value={auth.type} onChange={(e) => setAuth({ type: e.target.value })} style={s.select}>
                      <option value="none">None</option>
                      <option value="bearerToken">Bearer Token</option>
                      <option value="apiKey">API Key</option>
                      <option value="basicAuth">Basic Auth</option>
                    </select>
                    <ChevronDown size={12} style={s.selIcon} />
                  </div>
                  {auth.type === "bearerToken" && (
                    <div style={{ marginTop: 12 }}>
                      <input style={s.input} placeholder="Bearer Token"
                        value={auth.bearerToken?.token || ""}
                        onChange={(e) => setAuth({ type: "bearerToken", bearerToken: { token: e.target.value } })} />
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS */}
              {tab === "Settings" && (
                <div style={s.placeholder}>
                  <p style={s.placeholderText}>Settings — coming soon</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={s.footer}>
              <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
              <button style={s.saveBtn} onClick={handleSave}>Save Node</button>
            </div>
          </div>

          {/* RIGHT — Output panel */}
          <OutputPanel
            nodeId={node.id}
            onExecute={handleExecuteStep}
            executing={executing}
          />
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#13132a", border: "1px solid #2d2d4e", borderRadius: 12, width: "90vw", maxWidth: 1100, height: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #2d2d4e", flexShrink: 0 },
  hLeft: { display: "flex", alignItems: "center", gap: 10 },
  nodeIcon: { width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" },
  hTitle: { margin: 0, fontSize: 13, fontWeight: 600, color: "#e8e8f0" },
  hSub: { margin: 0, fontSize: 10, color: "#555" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#555", padding: 4, display: "flex" },
  threePanel: { display: "flex", flex: 1, overflow: "hidden" },
  center: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  tabs: { display: "flex", borderBottom: "1px solid #2d2d4e", padding: "0 16px", flexShrink: 0 },
  tab: { background: "none", border: "none", cursor: "pointer", padding: "8px 12px", fontSize: 11, color: "#666", borderBottom: "2px solid transparent", transition: "all 0.15s" },
  tabActive: { color: "#e06c3a", borderBottom: "2px solid #e06c3a" },
  centerBody: { flex: 1, overflowY: "auto", padding: "16px" },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  labelRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 11, fontWeight: 500, color: "#999" },
  selWrap: { position: "relative", display: "inline-flex", alignItems: "center" },
  select: { appearance: "none", background: "#0d0d20", border: "1px solid #2d2d4e", borderRadius: 6, padding: "6px 28px 6px 9px", fontSize: 11, color: "#e8e8f0", cursor: "pointer", minWidth: 110 },
  selIcon: { position: "absolute", right: 8, color: "#666", pointerEvents: "none" },
  input: { background: "#0d0d20", border: "1px solid #2d2d4e", borderRadius: 6, padding: "6px 9px", fontSize: 11, color: "#e8e8f0", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" },
  toggle: { display: "flex", background: "#0d0d20", border: "1px solid #2d2d4e", borderRadius: 6, overflow: "hidden" },
  toggleBtn: { background: "none", border: "none", cursor: "pointer", padding: "3px 10px", fontSize: 10, color: "#666", transition: "all 0.12s" },
  toggleActive: { background: "#2d2d4e", color: "#e06c3a", fontWeight: 600 },
  kvList: { display: "flex", flexDirection: "column", gap: 5 },
  kvHeader: { display: "flex", gap: 5, alignItems: "center", padding: "6px 8px", borderBottom: "1px solid #1e1e3a", color: "#555" },
  kvRow: { display: "flex", gap: 5, alignItems: "center" },
  iconBtn: { background: "none", border: "1px solid #2d2d4e", borderRadius: 5, padding: 6, cursor: "pointer", color: "#555", display: "flex", alignItems: "center" },
  addBtn: { background: "none", border: "1px dashed #2d2d4e", borderRadius: 5, padding: "5px 9px", fontSize: 10, color: "#666", cursor: "pointer", display: "flex", alignItems: "center" },
  textarea: { background: "#0d0d1a", border: "1px solid #2d2d4e", borderRadius: 6, padding: "8px 9px", fontSize: 11, color: "#89b4fa", fontFamily: "monospace", resize: "vertical", width: "100%", boxSizing: "border-box", outline: "none" },
  placeholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "30px 0", textAlign: "center" },
  placeholderText: { margin: 0, fontSize: 12, color: "#444" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 16px", borderTop: "1px solid #2d2d4e", flexShrink: 0 },
  cancelBtn: { background: "none", border: "1px solid #2d2d4e", borderRadius: 6, padding: "6px 16px", fontSize: 11, color: "#666", cursor: "pointer" },
  saveBtn: { background: "#e06c3a", border: "none", borderRadius: 6, padding: "6px 20px", fontSize: 11, color: "#fff", fontWeight: 600, cursor: "pointer" },
  
  // Rename styles
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