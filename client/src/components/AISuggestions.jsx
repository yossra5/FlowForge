// client/src/components/AISuggestions.jsx
// Smart dropdown for ML-powered variable suggestions

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Loader, ChevronRight } from "lucide-react";

export default function AISuggestions({ 
  isOpen,
  onClose, 
  onSelect, 
  triggerText,
  position,
  nodeType,
  fieldName,
  workflowId,
  currentNodeId,
  contextVariables,
  nodes,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const mappedNodes = (nodes || []).map(function(n) {
          var nodeData = n.data || {};
          return {
            id: n.id,
            type: nodeData.type || "",
            name: nodeData.label || "",
            parameters: nodeData.parameters || {},
            nexts: nodeData.nexts || [],
          };
        });
        
        var response = await fetch("/api/ai/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow: { id: workflowId, nodes: mappedNodes },
            currentNodeId: currentNodeId,
            nodeType: nodeType,
            fieldName: fieldName,
            userInput: triggerText || "",
            contextVariables: contextVariables || [],
          }),
        });
        var data = await response.json();
        setSuggestions(data.suggestions || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [isOpen, triggerText, nodeType, fieldName, workflowId, currentNodeId, nodes, contextVariables]);

  useEffect(function() {
    function handleKeyDown(e) {
      if (!isOpen) return;
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(function(prev) {
          return Math.min(prev + 1, suggestions.length - 1);
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(function(prev) {
          return Math.max(prev - 1, 0);
        });
      } else if (e.key === "Enter" && suggestions[selectedIndex]) {
        e.preventDefault();
        onSelect(suggestions[selectedIndex].label);
        fetch("/api/ai/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow_id: workflowId,
            node_id: currentNodeId,
            node_type: nodeType,
            field_name: fieldName,
            user_input: triggerText,
            selected_variable: suggestions[selectedIndex].label,
            context_variables: contextVariables,
            was_manually_typed: false,
          }),
        });
      } else if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return function() {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, suggestions, selectedIndex, onSelect, onClose, triggerText, workflowId, currentNodeId, nodeType, fieldName, contextVariables]);

  if (!isOpen) return null;

  var categoryIcons = {
    "ML Recommendation": "🤖",
    "Context": "📊",
    "Variables": "📦",
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: position?.top,
        left: position?.left,
        zIndex: 2000,
        minWidth: 320,
        maxWidth: 450,
        background: "#1a1a2e",
        border: "1px solid #2d2d4e",
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderBottom: "1px solid #2d2d4e",
        background: "#0d0d1e",
      }}>
        <Sparkles size={14} color="#89b4fa" />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#e8e8f0" }}>
          Variable Suggestions
        </span>
        {loading && <Loader size={12} color="#89b4fa" style={{ marginLeft: "auto", animation: "spin 1s linear infinite" }} />}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#555" }}>
            <Loader size={18} style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ margin: "8px 0 0", fontSize: 11 }}>Analyzing workflow...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#555" }}>
            <p style={{ margin: 0, fontSize: 12 }}>No suggestions found</p>
            <p style={{ margin: "4px 0 0", fontSize: 10 }}>Type a different word or press Esc</p>
          </div>
        ) : (
          suggestions.map(function(s, idx) {
            return (
              <div
                key={s.label}
                onClick={function() { onSelect(s.label); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  background: idx === selectedIndex ? "#2d2d4e" : "transparent",
                  borderBottom: "1px solid #2d2d4e",
                  transition: "background 0.1s",
                }}
                onMouseEnter={function() { setSelectedIndex(idx); }}
              >
                <span style={{ fontSize: 18 }}>{categoryIcons[s.category] || "📊"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#89b4fa", fontFamily: "monospace" }}>
                      {s.label}
                    </span>
                    <span style={{ fontSize: 9, color: "#555", background: "#0d0d1e", padding: "2px 6px", borderRadius: 4 }}>
                      {s.category}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: "#888" }}>
                    {s.description}
                    {s.confidence && (
                      <span style={{ 
                        marginLeft: 8, 
                        padding: "2px 5px", 
                        background: s.confidence > 0.7 ? "#1a3a2a" : "#1a2a3a",
                        borderRadius: 4,
                        fontSize: 9,
                        color: s.confidence > 0.7 ? "#4ade80" : "#89b4fa"
                      }}>
                        {Math.round(s.confidence * 100)}% match
                      </span>
                    )}
                  </p>
                </div>
                <ChevronRight size={12} color="#555" />
              </div>
            );
          })
        )}
      </div>

      <div style={{
        padding: "8px 14px",
        borderTop: "1px solid #2d2d4e",
        fontSize: 9,
        color: "#555",
        display: "flex",
        justifyContent: "space-between",
      }}>
        <span>↑ ↓ navigate • Enter select • Esc close</span>
      </div>
    </div>
  );
}