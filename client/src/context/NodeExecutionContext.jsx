// client/src/context/NodeExecutionContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Stores the execution results of every node that has been run.
// The INPUT panel of any node reads from this to show what previous nodes
// produced, so the user can see what data is flowing through the workflow.
//
// Structure:
//   nodeOutputs: {
//     "node-uuid-1": { status: 200, data: { userId: 1, title: "..." }, duration: 245 },
//     "node-uuid-2": { status: 201, data: { id: 99 }, duration: 180 },
//   }
//
// The INPUT panel of a node shows outputs from nodes that connect TO it
// (its "parent" nodes in the graph), not all outputs.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState } from "react";

const NodeExecutionContext = createContext(null);

export function NodeExecutionProvider({ children }) {
  const [nodeOutputs, setNodeOutputs] = useState({});

  // Called after each run — replaces all outputs with fresh results
  const setRunResults = (results) => {
    const map = {};
    for (const r of (results || [])) {
      map[r.nodeId] = {
        status:   r.status,
        data:     r.data,
        error:    r.error,
        duration: r.duration,
        label:    r.label,
        type:     r.type,
      };
    }
    setNodeOutputs(map);
  };

  const clearResults = () => setNodeOutputs({});

  return (
    <NodeExecutionContext.Provider value={{ nodeOutputs, setRunResults, clearResults }}>
      {children}
    </NodeExecutionContext.Provider>
  );
}

export function useNodeExecution() {
  const ctx = useContext(NodeExecutionContext);
  if (!ctx) throw new Error("useNodeExecution must be inside NodeExecutionProvider");
  return ctx;
}
