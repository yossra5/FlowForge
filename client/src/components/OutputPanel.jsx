// client/src/components/OutputPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// RIGHT panel inside any node's config modal.
// Shows the result of THIS node's last execution.
//
// Three display modes (tabs, like n8n):
//   Schema — field names + types in a tree view
//   Table  — if the response is an array, shows rows/columns
//   JSON   — raw JSON output, always available
//
// Also shows: HTTP status, duration, "Execute step" button
//
// PROPS:
//   nodeId     string    — to look up this node's output
//   onExecute  function  — called when user clicks "Execute step"
//   executing  boolean   — true while the single-node execution is in flight
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { Play, Loader, CheckCircle, XCircle, Clock } from "lucide-react";
import { useNodeExecution } from "../context/NodeExecutionContext";

// ── Schema view — tree of field names + types ─────────────────────────────────
function SchemaView({ data }) {
  if (!data || typeof data !== "object") {
    return <p style={sv.scalar}>{String(data)}</p>;
  }

  const entries = Array.isArray(data)
    ? data.slice(0, 5).map((item, i) => [String(i), item])
    : Object.entries(data);

  return (
    <div style={sv.tree}>
      {entries.map(([key, val]) => (
        <div key={key} style={sv.row}>
          <span style={sv.key}>{key}</span>
          <span style={sv.type}>
            {Array.isArray(val) ? `array[${val.length}]` : typeof val}
          </span>
          {typeof val !== "object" && (
            <span style={sv.val}>{String(val)}</span>
          )}
          {typeof val === "object" && val !== null && (
            <div style={sv.nested}>
              <SchemaView data={val} />
            </div>
          )}
        </div>
      ))}
      {Array.isArray(data) && data.length > 5 && (
        <p style={sv.more}>…and {data.length - 5} more items</p>
      )}
    </div>
  );
}

const sv = {
  tree:   { paddingLeft: 8 },
  row:    { marginBottom: 4 },
  key:    { fontSize: 11, fontWeight: 600, color: "#89b4fa", fontFamily: "monospace", marginRight: 6 },
  type:   { fontSize: 10, color: "#555", marginRight: 6, fontStyle: "italic" },
  val:    { fontSize: 11, color: "#e8e8f0", fontFamily: "monospace" },
  nested: { paddingLeft: 12, borderLeft: "1px solid #2d2d4e", marginTop: 2 },
  scalar: { margin: 0, fontSize: 11, color: "#e8e8f0", fontFamily: "monospace" },
  more:   { margin: "4px 0 0", fontSize: 10, color: "#444" },
};

// ── Table view — array of objects → rows + columns ────────────────────────────
function TableView({ data }) {
  const rows = Array.isArray(data) ? data : [data];
  if (!rows.length || typeof rows[0] !== "object") {
    return <p style={{ margin: 0, fontSize: 11, color: "#555" }}>Not tabular data.</p>;
  }

  const cols = Object.keys(rows[0] || {}).slice(0, 8); // max 8 columns

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tv.table}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} style={tv.th}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row, i) => (
            <tr key={i} style={i % 2 === 0 ? tv.rowEven : tv.rowOdd}>
              {cols.map((c) => (
                <td key={c} style={tv.td}>
                  {typeof row[c] === "object"
                    ? JSON.stringify(row[c])
                    : String(row[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 20 && (
        <p style={{ margin: "6px 0 0", fontSize: 10, color: "#444" }}>
          Showing 20 of {rows.length} rows
        </p>
      )}
    </div>
  );
}

const tv = {
  table:   { width: "100%", borderCollapse: "collapse", fontSize: 11 },
  th:      { padding: "5px 8px", textAlign: "left", background: "#1a1a2e", color: "#89b4fa", fontWeight: 600, borderBottom: "1px solid #2d2d4e", whiteSpace: "nowrap" },
  td:      { padding: "4px 8px", color: "#e8e8f0", borderBottom: "1px solid #1a1a2e", fontFamily: "monospace", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowEven: { background: "transparent" },
  rowOdd:  { background: "#0d0d1e" },
};

// ── Main OutputPanel ──────────────────────────────────────────────────────────
export default function OutputPanel({ nodeId, onExecute, executing }) {
  const { nodeOutputs } = useNodeExecution();
  const output = nodeOutputs[nodeId];
  const [view, setView] = useState("schema"); // "schema" | "table" | "json"

  const isArray = output?.data && Array.isArray(output.data);
  const isOk    = output?.status >= 200 && output?.status < 300;

  return (
    <div style={s.panel}>
      {/* Header with Execute button */}
      <div style={s.header}>
        <p style={s.title}>OUTPUT</p>
        <button
          style={{ ...s.execBtn, opacity: executing ? 0.6 : 1 }}
          onClick={onExecute}
          disabled={executing}
          title="Execute this node only"
        >
          {executing
            ? <><Loader size={12} style={{ marginRight: 5 }} />Running…</>
            : <><Play   size={12} style={{ marginRight: 5 }} />Execute step</>}
        </button>
      </div>

      {/* Status bar */}
      {output && (
        <div style={s.statusBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isOk
              ? <CheckCircle size={13} color="#4ade80" />
              : <XCircle    size={13} color="#f38ba8" />}
            <span style={{ fontSize: 12, fontWeight: 600, color: isOk ? "#4ade80" : "#f38ba8" }}>
              {output.status}
            </span>
            {output.duration && (
              <span style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 3 }}>
                <Clock size={10} /> {output.duration}ms
              </span>
            )}
            {isArray && (
              <span style={{ fontSize: 11, color: "#666" }}>
                · {output.data.length} item{output.data.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* View tabs */}
          <div style={s.viewTabs}>
            {["schema", "table", "json"].map((v) => (
              <button
                key={v}
                style={{ ...s.viewTab, ...(view === v ? s.viewTabActive : {}) }}
                onClick={() => setView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={s.body}>
        {!output && (
          <div style={s.empty}>
            <Play size={24} color="#333" />
            <p style={s.emptyTitle}>No output yet</p>
            <p style={s.emptyHint}>
              Click "Execute step" above to run this node and see its output here.
            </p>
          </div>
        )}

        {output?.error && output?.status === "error" && (
          <div style={s.errorBox}>
            <p style={s.errorLabel}>Error</p>
            <p style={s.errorText}>{output.error}</p>
          </div>
        )}

        {output?.data !== undefined && output?.data !== null && view === "schema" && (
          <SchemaView data={output.data} />
        )}

        {output?.data !== undefined && output?.data !== null && view === "table" && (
          <TableView data={output.data} />
        )}

        {output?.data !== undefined && output?.data !== null && view === "json" && (
          <pre style={s.json}>
            {JSON.stringify(output.data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

const s = {
  panel: {
    width: 280, borderLeft: "1px solid #2d2d4e",
    display: "flex", flexDirection: "column",
    background: "#0d0d1e", flexShrink: 0,
    height: "100%",
  },
  header: {
    padding: "10px 12px",
    borderBottom: "1px solid #2d2d4e",
    display: "flex", alignItems: "center",
    justifyContent: "space-between", flexShrink: 0,
  },
  title: { margin: 0, fontSize: 11, fontWeight: 700, color: "#e8e8f0", letterSpacing: "0.08em" },
  execBtn: {
    display: "flex", alignItems: "center",
    background: "#e06c3a", border: "none",
    borderRadius: 6, padding: "6px 12px",
    fontSize: 11, color: "#fff", fontWeight: 600,
    cursor: "pointer", transition: "opacity 0.15s",
  },
  statusBar: {
    padding: "8px 12px",
    borderBottom: "1px solid #2d2d4e",
    display: "flex", flexDirection: "column", gap: 6, flexShrink: 0,
  },
  viewTabs: { display: "flex", gap: 4 },
  viewTab: {
    background: "none", border: "1px solid #2d2d4e",
    borderRadius: 5, padding: "3px 8px",
    fontSize: 10, color: "#555", cursor: "pointer",
    transition: "all 0.12s",
  },
  viewTabActive: { background: "#1a1a2e", color: "#e8e8f0", borderColor: "#e06c3a" },
  body: { flex: 1, overflowY: "auto", padding: "12px" },
  empty: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8,
    padding: "24px 8px", textAlign: "center",
  },
  emptyTitle: { margin: 0, fontSize: 12, color: "#555", fontWeight: 500 },
  emptyHint:  { margin: 0, fontSize: 10, color: "#333", lineHeight: 1.5 },
  errorBox:   { background: "#1f0d0d", border: "1px solid #5c1e1e", borderRadius: 8, padding: "10px 12px" },
  errorLabel: { margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#f38ba8" },
  errorText:  { margin: 0, fontSize: 11, color: "#e8e8f0" },
  json: {
    margin: 0, fontSize: 11, color: "#89b4fa",
    fontFamily: "monospace", whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
};
