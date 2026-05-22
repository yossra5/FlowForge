import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  X, ChevronDown, ChevronUp, Clock,
  CheckCircle, AlertCircle, XCircle
} from "lucide-react";

// Status colors
function getStatusStyle(status) {
  if (status === "error") return { color: "#f38ba8", icon: XCircle, label: "Error" };
  if (status === "skipped") return { color: "#888", icon: AlertCircle, label: "Skipped" };
  if (status === "not_configured") return { color: "#e06c3a", icon: AlertCircle, label: "Not Configured" };
  if (status >= 200 && status < 300) return { color: "#4ade80", icon: CheckCircle, label: String(status) };
  if (status >= 400 && status < 500) return { color: "#e06c3a", icon: AlertCircle, label: String(status) };
  return { color: "#f38ba8", icon: XCircle, label: String(status) };
}

function ResultCard({ result, ui }) {
  const [expanded, setExpanded] = useState(true);
  const style = getStatusStyle(result.status);
  const Icon = style.icon;

  const needsConfig = result.type === "LLMCall" || result.type === "AIAgent";
  const isNotConfigured = result.status === "not_configured" || (needsConfig && !result.data);

  return (
    <div
      style={{
        ...s.card,
        background: ui.surface,
        borderColor: ui.border,
      }}
    >
      <div style={s.cardHeader} onClick={() => setExpanded(v => !v)}>
        <div style={s.cardLeft}>
          <Icon size={15} color={style.color} />
          <span style={{ ...s.cardLabel, color: style.color }}>
            {style.label}
          </span>
          <span style={{ ...s.cardName, color: ui.text }}>
            {result.label}
          </span>
          <span style={{ ...s.cardType, color: ui.textHint }}>
            {result.type}
          </span>
        </div>
        <div style={s.cardRight}>
          {result.duration !== undefined && (
            <span style={{ ...s.duration, color: ui.textMuted }}>
              <Clock size={11} style={{ marginRight: 3 }} />
              {result.duration}ms
            </span>
          )}
          {expanded
            ? <ChevronUp size={14} color={ui.textMuted} />
            : <ChevronDown size={14} color={ui.textMuted} />
          }
        </div>
      </div>

      {expanded && (
        <div
          style={{
            ...s.cardBody,
            borderTop: `1px solid ${ui.border}`,
          }}
        >
          {result.error ? (
            <p style={s.errorText}>{result.error}</p>
          ) : isNotConfigured ? (
            <div>
              <p style={{ margin: 0, fontSize: 12, color: "#e06c3a" }}>
                ⚠️ This node is not fully configured
              </p>
              <p style={{ margin: "8px 0 0 0", fontSize: 10, color: ui.textMuted }}>
                Please double-click the node and complete its configuration.
              </p>
            </div>
          ) : result.data ? (
            <pre style={s.json}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          ) : (
            <p style={{ margin: 0, fontSize: 11, color: ui.textMuted, fontStyle: "italic" }}>
              No output yet. Run the workflow to see results.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RunResultsPanel({ results, onClose }) {
  const { ui, isDark } = useTheme();

  if (!results) return null;

  const filteredResults = results.filter(
    r => r.type !== "ManualTrigger" && r.type !== "ScheduleTrigger"
  );

  if (filteredResults.length === 0) return null;

  const successCount = filteredResults.filter(r => r.status >= 200 && r.status < 300).length;
  const errorCount = filteredResults.filter(r => r.status === "error" || r.status >= 400).length;
  const notConfiguredCount = filteredResults.filter(r => r.status === "not_configured").length;

  return (
    <div
      style={{
        ...s.panel,
        background: ui.surface,
        borderLeft: `1px solid ${ui.border}`,
      }}
    >
      {/* Header - Fixed */}
      <div
        style={{
          ...s.header,
          borderBottom: `1px solid ${ui.border}`,
        }}
      >
        <div style={s.headerLeft}>
          <span style={{ ...s.title, color: ui.text }}>
            Run Results
          </span>

          <span
            style={{
              ...s.badge,
              background: ui.surface2,
              color: ui.textMuted,
              border: `1px solid ${ui.border}`,
            }}
          >
            {filteredResults.length} node{filteredResults.length !== 1 ? "s" : ""}
          </span>

          {successCount > 0 && (
            <span
              style={{
                ...s.badge,
                background: isDark ? "#1a3a2a" : "#dcfce7",
                color: "#4ade80",
                border: `1px solid ${isDark ? "#1a3a2a" : "#bbf7d0"}`
              }}
            >
              {successCount} ok
            </span>
          )}

          {errorCount > 0 && (
            <span
              style={{
                ...s.badge,
                background: isDark ? "#3a1a1a" : "#fee2e2",
                color: "#ef4444",
                border: `1px solid ${isDark ? "#3a1a1a" : "#fecaca"}`
              }}
            >
              {errorCount} failed
            </span>
          )}

          {notConfiguredCount > 0 && (
            <span
              style={{
                ...s.badge,
                background: isDark ? "#3a2a1a" : "#fef3c7",
                color: "#e06c3a",
                border: `1px solid ${isDark ? "#3a2a1a" : "#fde68a"}`
              }}
            >
              {notConfiguredCount} not configured
            </span>
          )}
        </div>

        <button
          style={{ ...s.closeBtn, color: ui.textMuted }}
          onClick={onClose}
        >
          <X size={15} />
        </button>
      </div>

      {/* Scrollable List */}
      <div style={s.list}>
        {filteredResults.map(r => (
          <ResultCard key={r.nodeId} result={r} ui={ui} />
        ))}
      </div>
    </div>
  );
}

const s = {
  panel: {
    width: 380,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    flexShrink: 0,
    overflow: "hidden", // Prevents panel overflow
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    flexShrink: 0, // Header stays fixed
  },

  headerLeft: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },

  title: { fontSize: 13, fontWeight: 600 },

  badge: {
    fontSize: 11,
    padding: "2px 7px",
    borderRadius: 5,
  },

  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 3,
    display: "flex",
    alignItems: "center",
  },

  list: {
    flex: 1,
    overflowY: "auto",  // Makes the list scrollable
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    // Custom scrollbar styling
    scrollbarWidth: "thin",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "#1a1a2e",
      borderRadius: "3px",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#2d2d4e",
      borderRadius: "3px",
    },
  },

  card: {
    border: "1px solid",
    borderRadius: 8,
    overflow: "hidden",
    flexShrink: 0, // Cards don't shrink
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "9px 12px",
    cursor: "pointer",
  },

  cardLeft: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" },

  cardRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },

  cardLabel: { fontSize: 12, fontWeight: 700 },

  cardName: { fontSize: 12, fontWeight: 500 },

  cardType: { fontSize: 10 },

  duration: {
    fontSize: 10,
    display: "flex",
    alignItems: "center",
  },

  cardBody: {
    padding: "10px 12px",
    maxHeight: 250,  // Limits body height, scrolls internally if too long
    overflowY: "auto",
  },

  json: {
    margin: 0,
    fontSize: 11,
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    color: "#89b4fa", // Blue text for JSON
  },

  errorText: {
    margin: 0,
    fontSize: 12,
    color: "#f38ba8",
  },
};