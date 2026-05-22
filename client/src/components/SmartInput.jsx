// client/src/components/SmartInput.jsx
// ONE COMPONENT to rule them all
// - Fixed/Expression mode toggle
// - AI suggestions when typing {{ in Expression mode
// - Drag-and-drop support
// - Syntax highlighting (orange text, blue {{expressions}})

import React, { useState, useRef, useEffect } from "react";
import AISuggestions from "./AISuggestions";

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

// Helper to make any input droppable
function makeDroppable(setter, currentValue) {
  return {
    onDrop: (e) => {
      e.preventDefault();
      const expr = e.dataTransfer.getData("text/expression");
      console.log("📦 Dropped:", expr);
      if (!expr) return;

      const input = e.currentTarget;
      const start = input.selectionStart ?? currentValue.length;
      const end = input.selectionEnd ?? currentValue.length;
      const newValue = currentValue.slice(0, start) + expr + currentValue.slice(end);
      setter(newValue);
    },
    onDragOver: (e) => e.preventDefault(),
  };
}

export default function SmartInput({
  value,
  onChange,
  placeholder,
  label,
  mode = "fixed",
  onModeChange,
  showModeToggle = true,
  style = {},
  required = false,
  nodeType = "APICall",
  fieldName = "unknown",
  workflowId = null,
  currentNodeId = null,
  contextVariables = [],
  nodes = [],
  isTextarea = false,
  rows = 3,
}) {
  const [internalMode, setInternalMode] = useState(mode);
  const currentMode = onModeChange ? mode : internalMode;
  const handleModeChange = onModeChange || setInternalMode;

  // AI suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [triggerText, setTriggerText] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef(null);

  // Syntax highlighting: orange normal text, blue expressions
  const hasExpression = currentMode === "expression" && typeof value === "string" && /\{\{.*?\}\}/.test(value);
  const expressionStyle = hasExpression
    ? {
        color: "#89b4fa",
        fontFamily: "monospace",
        borderLeft: "3px solid #89b4fa",
        background: "#0a0a1e",
        fontWeight: "500",
      }
    : currentMode === "expression"
    ? { color: "#e06c3a" }  // Orange for expression mode normal text
    : {};

  // Handle key up to detect {{ for suggestions (ONLY in expression mode)
  const handleKeyUp = (e) => {
    if (currentMode !== "expression") return;
    
    const input = e.currentTarget;
    const cursorPos = input.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    
    const lastDoubleBrace = textBeforeCursor.lastIndexOf("{{");
    const lastClosingBrace = textBeforeCursor.lastIndexOf("}}");
    
    if (lastDoubleBrace > lastClosingBrace) {
      const searchText = textBeforeCursor.substring(lastDoubleBrace + 2);
      setTriggerText(searchText);
      setShowSuggestions(true);
      setCursorPosition(cursorPos);
      
      const rect = input.getBoundingClientRect();
      setSuggestionPosition({
        top: rect.bottom + 5,
        left: rect.left + (cursorPos / (value.length || 1)) * rect.width,
      });
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    let cleanSuggestion = suggestion;
    if (suggestion.startsWith("$json.")) cleanSuggestion = suggestion.substring(6);
    else if (suggestion.startsWith("$var.")) cleanSuggestion = suggestion.substring(5);
    else if (suggestion.startsWith("$workflow.")) cleanSuggestion = suggestion.substring(10);

    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastDoubleBrace = textBeforeCursor.lastIndexOf("{{");
    
    if (lastDoubleBrace !== -1) {
      const newValue = value.substring(0, lastDoubleBrace + 2) + cleanSuggestion + value.substring(cursorPosition);
      onChange(newValue);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const droppableProps = makeDroppable(onChange, value);

  const commonProps = {
    ref: inputRef,
    value: value || "",
    onChange: (e) => onChange(e.target.value),
    onKeyUp: handleKeyUp,
    placeholder,
    style: {
      ...style,
      ...expressionStyle,
      transition: "all 0.15s ease",
    },
    onDrop: droppableProps.onDrop,
    onDragOver: droppableProps.onDragOver,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Label and Mode Toggle */}
      {(label || showModeToggle) && (
        <div style={s.labelRow}>
          {label && (
            <label style={s.label}>
              {label}
              {required && <span style={{ color: "#f38ba8", marginLeft: 4 }}>*</span>}
            </label>
          )}
          {showModeToggle && <ModeToggle mode={currentMode} onChange={handleModeChange} />}
        </div>
      )}

      {/* Input field */}
      {isTextarea ? (
        <textarea {...commonProps} rows={rows} />
      ) : (
        <input type="text" {...commonProps} />
      )}

      {/* AI Suggestions (only show in expression mode) */}
      {currentMode === "expression" && (
        <AISuggestions
          isOpen={showSuggestions}
          onClose={() => setShowSuggestions(false)}
          onSelect={handleSelectSuggestion}
          triggerText={triggerText}
          position={suggestionPosition}
          nodeType={nodeType}
          fieldName={fieldName}
          workflowId={workflowId}
          currentNodeId={currentNodeId}
          contextVariables={contextVariables}
          nodes={nodes}
        />
      )}
    </div>
  );
}

const s = {
  labelRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 11, fontWeight: 500, color: "#999" },
};