// client/src/components/CustomEdge.jsx
import React, { useState, useCallback } from "react";
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from "reactflow";
import { Trash2 } from "lucide-react";

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) {
  const [showDelete, setShowDelete] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = useCallback((e) => {
    e.stopPropagation();
    setShowDelete((prev) => !prev);
  }, []);

  const onDeleteClick = useCallback((e) => {
    e.stopPropagation();
    data?.onDelete?.(id);
    setShowDelete(false);
  }, [data, id]);

  // Close when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = () => setShowDelete(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <>
      {/* Visible Edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: showDelete ? 3.5 : 2,
          transition: "stroke-width 0.25s ease",
        }}
      />

      {/* Clickable Area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onClick={onEdgeClick}
        style={{ cursor: "pointer" }}
      />

      {/* Delete Button - Square, Compact & Professional */}
      {showDelete && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 38}px)`, // Positioned above the edge
              pointerEvents: "all",
              zIndex: 1000,
            }}
          >
            <button
              onClick={onDeleteClick}
              title="Delete connection"
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                width: 26,
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: "scale(1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)";
              }}
            >
              <Trash2 size={15} strokeWidth={3} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}