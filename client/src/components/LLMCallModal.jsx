    // client/src/components/LLMCallModal.jsx
    // Modal for configuring an LLMCall (Basic LLM Chain) node.
    //
    // Parameters handled (supervisor schema):llm_NODE_TYPE
    //   LLM_model              — dropdown: "gpt-4.1" | "gpt-4o-mini"
    //   system_prompt_template — textarea w/ expression support (default: "You are a helpful assistant")
    //   input_prompt_template  — ordered list of { type:"text", text:"…" }
    //                                          or { type:"image", image:"…" } objects
    //   response_format        — optional JSON dict (null = model default)

    // client/src/components/LLMCallModal.jsx
// Modal for configuring an LLMCall (Basic LLM Chain) node.

import React, { useState, useCallback } from "react";
import { X, Plus, Trash2, MessageSquare, ChevronDown, Image as ImageIcon, Type, MoveUp, MoveDown, Pencil, Check } from "lucide-react";
import InputPanel from "./InputPanel";
import OutputPanel from "./OutputPanel";
import SmartInput from "./SmartInput";  

import {
    LLM_MODELS,
    normalisePromptTemplate,
    makeTextPart,
    makeImagePart,
} from "../data/nodeTypes";

import { Brain } from 'lucide-react';

const TABS = ["Parameters"];
const ACCENT = "#e6b800";

function getAvailableVariables(nodes) {
    const vars = [];
    if (!nodes) return vars;
    for (const n of nodes) {
        if (n.data?.type === "ManualTrigger" && n.data?.parameters?.variables) {
            for (const v of n.data.parameters.variables) {
                if (v.name && !vars.includes(v.name)) vars.push(v.name);
            }
        }
    }
    return vars;
}

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

function PromptPart({ part, index, total, onChange, onRemove, onMoveUp, onMoveDown, nodes, workflow, node, availableVariables }) {
    const isText = part.type === "text";
    const isImage = part.type === "image";

    const handleTypeChange = (newType) => {
        if (newType === "text") onChange({ type: "text", text: part.text || "" });
        if (newType === "image") onChange({ type: "image", image: part.image || "" });
    };

    return (
        <div style={s.partCard}>
            <div style={s.partHeader}>
                <div style={s.partTypeRow}>
                    <div style={s.typeToggle}>
                        <button type="button" style={{ ...s.typeBtn, ...(isText ? s.typeBtnActive : {}) }} onClick={() => handleTypeChange("text")}>
                            <Type size={11} style={{ marginRight: 4 }} />text
                        </button>
                        <button type="button" style={{ ...s.typeBtn, ...(isImage ? s.typeBtnActive : {}) }} onClick={() => handleTypeChange("image")}>
                            <ImageIcon size={11} style={{ marginRight: 4 }} />image
                        </button>
                    </div>
                    <span style={s.partIndex}>#{index + 1}</span>
                </div>
                <div style={s.partActions}>
                    <button style={s.actionBtn} disabled={index === 0} onClick={onMoveUp}><MoveUp size={12} /></button>
                    <button style={s.actionBtn} disabled={index === total - 1} onClick={onMoveDown}><MoveDown size={12} /></button>
                    <button style={{ ...s.actionBtn, color: "#e06c3a" }} disabled={total === 1} onClick={onRemove}><Trash2 size={12} /></button>
                </div>
            </div>

            {isText && (
                <SmartInput
                    value={part.text || ""}
                    onChange={(val) => onChange({ ...part, text: val })}
                    placeholder="Enter text or use {{...}} to insert variables"
                    mode="expression"
                    nodeType="LLMCall"
                    fieldName={`input_prompt_text_${index}`}
                    workflowId={workflow?._id || workflow?.id}
                    currentNodeId={node?.id}
                    contextVariables={availableVariables}
                    nodes={nodes}
                    isTextarea={true}
                    rows={3}
                    style={s.partTextarea}
                    showModeToggle={false}
                />
            )}

            {isImage && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <SmartInput
                        value={part.image || ""}
                        onChange={(val) => onChange({ ...part, image: val })}
                        placeholder="Enter image URL or data URI"
                        mode="fixed"
                        nodeType="LLMCall"
                        fieldName={`input_prompt_image_${index}`}
                        workflowId={workflow?._id || workflow?.id}
                        currentNodeId={node?.id}
                        contextVariables={availableVariables}
                        nodes={nodes}
                        style={s.partInput}
                        showModeToggle={false}
                    />
                    {part.image && (
                        <div style={s.imagePreviewWrap}>
                            <img src={part.image} alt="preview" style={s.imagePreview} onError={(e) => { e.currentTarget.style.display = "none"; }} onLoad={(e) => { e.currentTarget.style.display = "block"; }} />
                            <span style={s.imagePreviewHint}>Preview (hidden if URL is invalid)</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function LLMCallModal({ node, onSave, onClose, onRename, nodes, edges, workflow, availableVariables = [] }) {
    const p = node.data.parameters || {};

    const [model, setModel] = useState(p.LLM_model || "gpt-4.1");
    const [systemPrompt, setSystemPrompt] = useState(p.system_prompt_template ?? "You are a helpful assistant");
    const [systemMode, setSystemMode] = useState("expression");
    const [parts, setParts] = useState(() => normalisePromptTemplate(p.input_prompt_template));
    const [responseFormat, setResponseFormat] = useState(p.response_format ? JSON.stringify(p.response_format, null, 2) : "");
    const [responseError, setResponseError] = useState("");
    const [tab, setTab] = useState("Parameters");
    const [editingTitle, setEditingTitle] = useState(false);
    const [draftTitle, setDraftTitle] = useState(node.data.label);

    const commitTitleRename = () => {
        if (draftTitle.trim() && onRename) onRename(node.id, draftTitle.trim());
        setEditingTitle(false);
    };

    React.useEffect(() => setDraftTitle(node.data.label), [node.data.label]);

    const updatePart = useCallback((i, updated) => setParts((prev) => prev.map((p, idx) => idx === i ? updated : p)), []);
    const removePart = useCallback((i) => setParts((prev) => prev.filter((_, idx) => idx !== i)), []);
    const movePart = useCallback((i, dir) => {
        setParts((prev) => {
            const next = [...prev];
            const target = i + dir;
            if (target < 0 || target >= next.length) return prev;
            [next[i], next[target]] = [next[target], next[i]];
            return next;
        });
    }, []);
    const addPart = useCallback((type) => setParts((prev) => [...prev, type === "image" ? makeImagePart() : makeTextPart()]), []);

    const handleResponseFormatChange = (val) => {
        setResponseFormat(val);
        if (!val.trim()) { setResponseError(""); return; }
        try { JSON.parse(val); setResponseError(""); }
        catch { setResponseError("Invalid JSON"); }
    };

    const handleSave = () => {
        let parsedFormat = null;
        if (responseFormat.trim()) {
            try { parsedFormat = JSON.parse(responseFormat); } catch { }
        }
        onSave({
            LLM_model: model,
            system_prompt_template: systemPrompt,
            input_prompt_template: parts,
            response_format: parsedFormat,
        });
    };

    const allAvailableVariables = availableVariables.length ? availableVariables : getAvailableVariables(nodes);

    return (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={s.modal}>

                {/* Header with Rename */}
                <div style={s.header}>
                    <div style={s.hLeft}>
                        <div style={{ ...s.nodeIcon, background: ACCENT }}>
                            <MessageSquare size={15} color="#000" />
                        </div>
                        <div style={{ flex: 1 }}>
                            {editingTitle ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} style={s.titleInput}
                                        onKeyDown={(e) => { if (e.key === "Enter") commitTitleRename(); if (e.key === "Escape") { setDraftTitle(node.data.label); setEditingTitle(false); } }}
                                        onBlur={commitTitleRename} autoFocus />
                                    <button onClick={commitTitleRename} style={s.smallIconBtn}><Check size={14} /></button>
                                    <button onClick={() => { setDraftTitle(node.data.label); setEditingTitle(false); }} style={s.smallIconBtn}><X size={14} /></button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <p style={s.hTitle}>{node.data.label}</p>
                                    <button onClick={() => setEditingTitle(true)} style={s.editTitleBtn}><Pencil size={13} /></button>
                                </div>
                            )}
                            <p style={s.hSub}>LLM Basic Chain</p>
                        </div>
                    </div>
                    <button style={s.closeBtn} onClick={onClose}><X size={17} /></button>
                </div>

                {/* 3-panel body */}
                <div style={s.threePanel}>
                    <InputPanel nodeId={node.id} nodes={nodes} edges={edges} />
                    <div style={s.center}>
                        <div style={s.tabs}>
                            {TABS.map((t) => (
                                <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>{t}</button>
                            ))}
                        </div>
                        <div style={s.centerBody}>
                            {tab === "Parameters" && (
                                <>
                                    {/* LLM Model */}
                                    <div style={s.field}>
                                        <div style={s.labelRow}>
                                            <label style={s.label}>LLM Model <span style={s.required}>*</span></label>
                                        </div>
                                        <div style={{ ...s.selWrap, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Brain size={16} style={{ color: '#bda3a3' }} />
                                            <select value={model} onChange={(e) => setModel(e.target.value)} style={s.select}>
                                                {LLM_MODELS.map((m) => (<option key={m} value={m}>{m}</option>))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* System Prompt - USING SMARTINPUT */}
                                    <div style={s.field}>
                                        <div style={s.labelRow}>
                                            <label style={s.label}>System Prompt</label>
                                            <ModeToggle mode={systemMode} onChange={setSystemMode} />
                                        </div>
                                        <SmartInput
                                            value={systemPrompt}
                                            onChange={setSystemPrompt}
                                            placeholder="You are a helpful assistant"
                                            mode={systemMode}
                                            nodeType="LLMCall"
                                            fieldName="system_prompt_template"
                                            workflowId={workflow?._id || workflow?.id}
                                            currentNodeId={node.id}
                                            contextVariables={allAvailableVariables}
                                            nodes={nodes}
                                            isTextarea={true}
                                            rows={3}
                                            style={s.textarea}
                                            showModeToggle={false}
                                        />
                                        {systemMode === "expression" && (
                                            <p style={s.hint}>
                                                💡 Type <span style={s.code}>{"{{"}</span> to see variable suggestions.
                                                Drag variables from the INPUT panel to insert them.
                                            </p>
                                        )}
                                    </div>

                                    {/* Input Prompt Template */}
                                    <div style={s.field}>
                                        <div style={s.labelRow}>
                                            <label style={s.label}>Input Prompt <span style={s.required}>*</span></label>
                                        </div>
                                        <div style={s.partList}>
                                            {parts.map((part, i) => (
                                                <PromptPart
                                                    key={i}
                                                    part={part}
                                                    index={i}
                                                    total={parts.length}
                                                    onChange={(updated) => updatePart(i, updated)}
                                                    onRemove={() => removePart(i)}
                                                    onMoveUp={() => movePart(i, -1)}
                                                    onMoveDown={() => movePart(i, +1)}
                                                    nodes={nodes}
                                                    workflow={workflow}
                                                    node={node}
                                                    availableVariables={allAvailableVariables}
                                                />
                                            ))}
                                        </div>
                                        <div style={s.addRow}>
                                            <button style={s.addBtn} onClick={() => addPart("text")}><Type size={11} style={{ marginRight: 5 }} />Add text block</button>
                                            <button style={s.addBtn} onClick={() => addPart("image")}><ImageIcon size={11} style={{ marginRight: 5 }} />Add image block</button>
                                        </div>
                                    </div>

                                    {/* Response Format */}
                                    <div style={s.field}>
                                        <div style={s.labelRow}>
                                            <label style={s.label}>Output Structure</label>
                                            {responseError && <span style={s.errorBadge}>{responseError}</span>}
                                        </div>
                                        <textarea rows={4} placeholder={'{\n \n}'} value={responseFormat} onChange={(e) => handleResponseFormatChange(e.target.value)} style={{ ...s.textarea, borderColor: responseError ? "#e06c3a" : "#2d2d4e" }} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div style={s.footer}>
                            <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
                            <button style={s.saveBtn} onClick={handleSave}>Save Node</button>
                        </div>
                    </div>
                    <OutputPanel nodeId={node.id} executing={false} />
                </div>
            </div>
            <style>{`
                .mode-active {
                    background: #2d2d4e !important;
                    color: #e06c3a !important;
                    font-weight: 600 !important;
                }
            `}</style>
        </div>
    );
}

const s = {
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    modal: { background: "#13132a", border: "1px solid #2d2d4e", borderRadius: 12, width: "90vw", maxWidth: 1100, height: "82vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    threePanel: { display: "flex", flex: 1, overflow: "hidden" },
    center: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
    centerBody: { flex: 1, overflowY: "auto", padding: "16px" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #2d2d4e", flexShrink: 0 },
    hLeft: { display: "flex", alignItems: "center", gap: 10 },
    nodeIcon: { width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" },
    hTitle: { margin: 0, fontSize: 13, fontWeight: 600, color: "#e8e8f0" },
    hSub: { margin: 0, fontSize: 10, color: "#555" },
    closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#555", padding: 4, display: "flex" },
    tabs: { display: "flex", borderBottom: "1px solid #2d2d4e", padding: "0 16px", flexShrink: 0 },
    tab: { background: "none", border: "none", cursor: "pointer", padding: "8px 12px", fontSize: 11, color: "#666", borderBottom: "2px solid transparent", transition: "all 0.15s" },
    tabActive: { color: ACCENT, borderBottom: `2px solid ${ACCENT}` },
    field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 },
    labelRow: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 },
    label: { fontSize: 11, fontWeight: 500, color: "#999" },
    required: { color: "#e06c3a" },
    errorBadge: { fontSize: 10, color: "#e06c3a", background: "rgba(224,108,58,0.12)", border: "1px solid rgba(224,108,58,0.3)", borderRadius: 4, padding: "2px 6px" },
    selWrap: { position: "relative", display: "inline-flex", alignItems: "center" },
    select: { appearance: "none", background: "#0d0d20", border: "1px solid #2d2d4e", borderRadius: 6, padding: "6px 28px 6px 9px", fontSize: 11, color: "#e8e8f0", cursor: "pointer", minWidth: 140 },
    textarea: { background: "#0d0d1a", border: "1px solid #2d2d4e", borderRadius: 6, padding: "8px 9px", fontSize: 11, color: "#89b4fa", fontFamily: "monospace", resize: "vertical", width: "100%", boxSizing: "border-box", outline: "none" },
    modeToggle: { display: "inline-flex", background: "#0d0d20", border: "1px solid #2d2d4e", borderRadius: 999, overflow: "hidden" },
    partList: { display: "flex", flexDirection: "column", gap: 10 },
    partCard: { background: "#0d0d1a", border: "1px solid #2d2d4e", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 },
    partHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    partTypeRow: { display: "flex", alignItems: "center", gap: 8 },
    partIndex: { fontSize: 10, color: "#444", fontFamily: "monospace" },
    partActions: { display: "flex", gap: 4 },
    actionBtn: { background: "none", border: "1px solid #2d2d4e", borderRadius: 5, padding: "4px 6px", cursor: "pointer", color: "#555", display: "flex", alignItems: "center" },
    typeToggle: { display: "flex", background: "#13132a", border: "1px solid #2d2d4e", borderRadius: 6, overflow: "hidden" },
    typeBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px 10px", fontSize: 10, color: "#555", display: "flex", alignItems: "center" },
    typeBtnActive: { background: "#2d2d4e", color: ACCENT, fontWeight: 600 },
    partTextarea: { background: "#13132a", border: "1px solid #1e1e3a", borderRadius: 6, padding: "7px 9px", fontSize: 11, color: "#89b4fa", fontFamily: "monospace", resize: "vertical", width: "100%", boxSizing: "border-box", outline: "none" },
    partInput: { background: "#13132a", border: "1px solid #1e1e3a", borderRadius: 6, padding: "6px 9px", fontSize: 11, color: "#e8e8f0", outline: "none", width: "100%", boxSizing: "border-box" },
    imagePreviewWrap: { display: "flex", flexDirection: "column", gap: 4 },
    imagePreview: { display: "none", maxHeight: 80, maxWidth: "100%", borderRadius: 5, border: "1px solid #2d2d4e", objectFit: "contain" },
    imagePreviewHint: { fontSize: 10, color: "#444" },
    addRow: { display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" },
    addBtn: { background: "none", border: "1px dashed #2d2d4e", borderRadius: 5, padding: "5px 11px", fontSize: 10, color: "#666", cursor: "pointer", display: "flex", alignItems: "center" },
    footer: { display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 16px", borderTop: "1px solid #2d2d4e", flexShrink: 0 },
    cancelBtn: { background: "none", border: "1px solid #2d2d4e", borderRadius: 6, padding: "6px 16px", fontSize: 11, color: "#666", cursor: "pointer" },
    saveBtn: { background: ACCENT, border: "none", borderRadius: 6, padding: "6px 20px", fontSize: 11, color: "#000", fontWeight: 700, cursor: "pointer" },
    titleInput: { fontSize: 15, fontWeight: 600, background: "#0d0d20", border: "1px solid #e06c3a", borderRadius: 6, padding: "4px 8px", color: "#e8e8f0", outline: "none", minWidth: 200 },
    editTitleBtn: { background: "none", border: "none", cursor: "pointer", color: "#666", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" },
    smallIconBtn: { background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" },
    hint: { margin: "3px 0 0", fontSize: 10, color: "#555" },
    code: { fontFamily: "monospace", color: "#89b4fa" },
};
