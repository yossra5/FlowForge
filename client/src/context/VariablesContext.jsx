// client/src/context/VariablesContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Global workflow variables — defined once in the ManualTrigger node config,
// available to every node's INPUT panel via drag-and-drop.
//
// A variable looks like:
//   { id: "uuid", name: "userId", type: "string", value: "" }
//
// When dragged into a URL field or body field, it inserts: {{$var.userId}}
// The executor resolves these at runtime by replacing with the variable's value.
//
// WHY in ManualTrigger?
//   Your supervisor wants the workflow to accept named inputs when triggered manually.
//   Think of it like: "before this workflow runs, define userId = 42".
//   Any downstream node can then use {{$var.userId}} in its URL or body.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState } from "react";

const VariablesContext = createContext(null);

export function VariablesProvider({ children }) {
  // variables: [{ id, name, type, value }]
  const [variables, setVariables] = useState([]);

  const addVariable = () => {
    const id = Math.random().toString(36).slice(2);
    setVariables((v) => [...v, { id, name: "", type: "string", value: "" }]);
  };

  const updateVariable = (id, field, val) => {
    setVariables((v) =>
      v.map((vr) => (vr.id === id ? { ...vr, [field]: val } : vr))
    );
  };

  const removeVariable = (id) => {
    setVariables((v) => v.filter((vr) => vr.id !== id));
  };

  // Returns the expression string to insert into a field
  // e.g. variable named "userId" → "{{$var.userId}}"
  const getExpression = (variable) => `{{$var.${variable.name}}}`;

  return (
    <VariablesContext.Provider value={{
      variables,
      setVariables,
      addVariable,
      updateVariable,
      removeVariable,
      getExpression,
    }}>
      {children}
    </VariablesContext.Provider>
  );
}

export function useVariables() {
  const ctx = useContext(VariablesContext);
  if (!ctx) throw new Error("useVariables must be inside VariablesProvider");
  return ctx;
}
