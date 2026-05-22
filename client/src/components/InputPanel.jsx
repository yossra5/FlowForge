// client/src/components/InputPanel.jsx
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Variable, Database, Grip } from "lucide-react";
import { useVariables } from "../context/VariablesContext";
import { useNodeExecution } from "../context/NodeExecutionContext";

// ── Helper Functions ────────────────────────────────────────────────────────
function hasAnyInput(nodeId, edges) {
  return edges.some((e) => e.target === nodeId);
}

function isConnectedToTrigger(nodeId, nodes, edges) {
  const manualTriggerIds = nodes
    .filter(n => n?.data?.type === "ManualTrigger")
    .map(n => n.id);

  if (manualTriggerIds.length === 0) return false;

  const graph = new Map();
  for (const edge of edges) {
    if (!graph.has(edge.source)) graph.set(edge.source, []);
    graph.get(edge.source).push(edge.target);
  }

  const visited = new Set();
  const queue = [...manualTriggerIds];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    if (current === nodeId) return true;

    const neighbors = graph.get(current) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) queue.push(next);
    }
  }
  return false;
}

// NEW: Find ALL previous nodes (any node that can reach the current node)
function getAllPreviousNodes(nodeId, nodes, edges) {
  // Build reverse graph (target -> sources)
  const reverseGraph = new Map();
  for (const edge of edges) {
    if (!reverseGraph.has(edge.target)) {
      reverseGraph.set(edge.target, []);
    }
    reverseGraph.get(edge.target).push(edge.source);
  }

  // BFS to find all nodes that can reach the current node
  const visited = new Set();
  const queue = [nodeId];
  const previousNodes = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const sources = reverseGraph.get(current) || [];
    for (const source of sources) {
      if (!visited.has(source)) {
        queue.push(source);
        const sourceNode = nodes.find(n => n.id === source);
        if (sourceNode && !previousNodes.includes(sourceNode)) {
          previousNodes.push(sourceNode);
        }
      }
    }
  }

  return previousNodes;
}

// ── DraggableToken ────────────────────────────────────────────────────────────
function DraggableToken({ expression, label, value, color = "#89b4fa" }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/expression", expression);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      title={`Drag to insert: ${expression}`}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 8px", borderRadius: 6,
        background: color + "15",
        border: `1px solid ${color}33`,
        cursor: "grab", marginBottom: 4,
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = color + "25"}
      onMouseLeave={(e) => e.currentTarget.style.background = color + "15"}
    >
      <Grip size={10} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color, fontFamily: "monospace" }}>
          {label}
        </p>
        {value !== undefined && value !== null && (
          <p style={{
            margin: 0, fontSize: 10, color: "#666",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </p>
        )}
      </div>
      <span style={{ fontSize: 9, color: "#444", flexShrink: 0 }}>
        {typeof value === "object" ? "obj" : typeof value}
      </span>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          padding: "4px 0", marginBottom: open ? 8 : 0,
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown size={12} color="#555" /> : <ChevronRight size={12} color="#555" />}
        <Icon size={12} color={color} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ── Flatten Object ────────────────────────────────────────────────────────────
function flattenObject(obj, prefix = "") {
  const entries = [];
  for (const [key, val] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      entries.push(...flattenObject(val, path));
    } else {
      entries.push([path, val]);
    }
  }
  return entries;
}

export default function InputPanel({ nodeId, nodes, edges }) {
  const { variables } = useVariables();
  const { nodeOutputs } = useNodeExecution();

  const hasInputConnection = hasAnyInput(nodeId, edges);
  const connectedToTrigger = isConnectedToTrigger(nodeId, nodes, edges);

  // Get ALL previous nodes (not just direct parents)
  const allPreviousNodes = getAllPreviousNodes(nodeId, nodes, edges);

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <p style={s.title}>INPUT</p>
        <p style={s.subtitle}>Drag fields from any previous node</p>
      </div>

      <div style={s.body}>
        {!hasInputConnection && (
          <div style={s.noInput}>
            <div style={s.noInputIcon}>🔌</div>
            <p style={s.noInputTitle}>No input connected</p>
            <p style={s.noInputHint}>
              Connect this node to another node to see variables and outputs
            </p>
          </div>
        )}

        {/* ALL Previous Node Outputs */}
        {allPreviousNodes.map((parentNode) => {
          const output = nodeOutputs[parentNode.id];
          const displayLabel = parentNode.data?.label || parentNode.id;
  const varName = parentNode.data?.variableName || displayLabel.replace(/\s+/g, '_');
  const data = output?.data;
  const isManualTrigger = parentNode.data?.type === "ManualTrigger";

          return (
            <Section
              key={parentNode.id}
              title={displayLabel}  // Show display name with spaces in UI
              icon={Database}
              color="#89b4fa"
              defaultOpen={true}
            >
              {!output && (
                <p style={s.noOutput}>
                  Run the workflow to see {displayLabel}'s output here.
                </p>
              )}

              {output?.error && (
                <p style={{ ...s.noOutput, color: "#f38ba8" }}>
                  Last run failed: {output.error}
                </p>
              )}

              {data && typeof data === "object" && !Array.isArray(data) && (
                <>
                  {flattenObject(data).map(([path, val]) => (
                    <DraggableToken
                      key={path}
                       expression={isManualTrigger 
          ? `{{Input.${path}}}` 
          : `{{${varName}.${path}}}`}  // ← use varName (with underscores) // ← Changed: {{NODENAME.id}}
                      label={path}
                      value={val}
                      color="#89b4fa"
                    />
                  ))}
                </>
              )}

              {data && Array.isArray(data) && (
                <>
                  <p style={s.arrayHint}>Array ({data.length} items) — first item:</p>
                  {data[0] && typeof data[0] === "object" &&
                    flattenObject(data[0]).map(([path, val]) => (
                      <DraggableToken
                        key={path}
                        expression={isManualTrigger 
  ? `{{Input.${path}}}` 
  : `{{${varName}.${path}}}`}  // ← use varName (with underscores) // ← Changed: {{NODENAME.id}}
                        label={path}
                        value={val}
                        color="#89b4fa"
                      />
                    ))}
                </>
              )}
            </Section>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  panel: {
    width: 240, borderRight: "1px solid #2d2d4e",
    display: "flex", flexDirection: "column",
    background: "#0d0d1e", flexShrink: 0,
    height: "100%",
  },
  header: {
    padding: "12px 14px 8px",
    borderBottom: "1px solid #2d2d4e",
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: 11, fontWeight: 700, color: "#e8e8f0", letterSpacing: "0.08em" },
  subtitle: { margin: "2px 0 0", fontSize: 10, color: "#444" },
  body: { flex: 1, overflowY: "auto", padding: "12px 10px" },
  noInput: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#555",
  },
  noInputIcon: {
    fontSize: 42,
    marginBottom: 12,
    opacity: 0.6,
  },
  noInputTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#777",
    margin: "0 0 8px 0",
  },
  noInputHint: {
    fontSize: 11,
    lineHeight: 1.4,
    maxWidth: 180,
    margin: "0 auto",
  },
  noOutput: { margin: 0, fontSize: 10, color: "#444", fontStyle: "italic", padding: "4px 0 8px" },
  arrayHint: { margin: "0 0 4px", fontSize: 10, color: "#555" },
};