// client/src/pages/EditorPage.jsx
// Changes from previous version:
//   1. Import useNodeExecution — run results stored in global context
//   2. Pass nodes + edges into HttpRequestModal (needed for InputPanel)
//   3. handleRun now calls setRunResults from context (so OUTPUT panels update)

import React, { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  ReactFlowProvider, useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import Toolbar             from "../components/Toolbar";
import Sidebar             from "../components/Sidebar";
import NodeCard            from "../components/NodeCard";
import HttpRequestModal    from "../components/HttpRequestModal";
import TriggerConfigModal  from "../components/TriggerConfigModal";
import RunResultsPanel     from "../components/RunResultsPanel";
import LLMCallModal        from "../components/LLMCallModal";

import { validateName, getOtherNames } from "../services/ValidateName";
import { saveWorkflow, downloadWorkflow, serializeWorkflow , readAndImportWorkflow } from "../services/WorkflowSerializer";
import { executeAPI }    from "../services/api";
import { getDefaultParams, NODE_COLORS, API_NODE_TYPES, TRIGGER_NODE_TYPES ,LLM_NODE_TYPES } from "../data/nodeTypes";
import { useTheme }      from "../context/ThemeContext";
import { useNodeExecution } from "../context/NodeExecutionContext";
import { useVariables }  from "../context/VariablesContext";
import { generateNodeId as uuid } from "../services/uuid";
import CustomEdge from "../components/CustomEdge";
import { getAvailableVariablesForNode } from "../services/WorkflowGraph";

const nodeTypes = { custom: NodeCard };
const edgeTypes = {
  'custom-edge': CustomEdge,
};

function getEdgeColor(sourceNodeId, nodes) {
  const node = nodes.find((n) => n.id === sourceNodeId);
  return node ? (NODE_COLORS[node.data?.type] || "#e06c3a") : "#e06c3a";
}

function hydrateNodes(savedNodes, onRename, onDoubleClick) {
  if (!savedNodes?.length) return [];
  return savedNodes.map((n) => {
    const displayName = n.name || n.label || "Node";
    const variableName = displayName.replace(/\s+/g, '_');
    
    return {
      id: n.uniq_id,
      type: "custom",
      position: n.position || { x: 100, y: 100 },
      data: {
        id: n.uniq_id,
        type: n.type,
        label: displayName,                    // Display name (with spaces)
        variableName: variableName,            // Variable name (underscores)
        description: n.description || "",
        parameters: n.parameters || {},
        nexts: n.nexts || [],
        onRename,
        onDoubleClick,
      },
    };
  });
}

function hydrateEdges(savedNodes, onDeleteEdge) {
  if (!savedNodes?.length) return [];
  const edges = [];
  for (const n of savedNodes) {
    const nodeColor = NODE_COLORS[n.type] || "#e06c3a";
    for (const targetId of (n.nexts || [])) {
      edges.push({
        id: `e-${n.uniq_id}-${targetId}`,
        source: n.uniq_id,
        target: targetId,
        type: "custom-edge",
        animated: false,
        markerEnd: { 
          type: "arrowclosed", 
          color: nodeColor
        },
        style: { 
          stroke: nodeColor,
          strokeWidth: 2,
          strokeDasharray: "5,5",
        },
        data: { onDelete: onDeleteEdge },
      });
    }
  }
  return edges;
}

export default function EditorPage({ workflow, onBack }) {
  return (
    <ReactFlowProvider>
      <EditorInner workflow={workflow} onBack={onBack} />
    </ReactFlowProvider>
  );
}

function EditorInner({ workflow, onBack }) {
  const { screenToFlowPosition } = useReactFlow();
  const { canvasTheme, ui } = useTheme();
  const { setRunResults: setGlobalResults, clearResults } = useNodeExecution();
  const { setVariables } = useVariables();

  const [wfName, setWfName] = useState(workflow.name || "My Workflow");
  const [modalNode, setModalNode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [nodeStatuses, setNodeStatuses] = useState({});

 
  // ── Double-click handler ────────────────────────────────────────────────
  const handleDoubleClick = useCallback((nodeId) => {
    setNodes((nds) => {
      const found = nds.find((n) => n.id === nodeId);
      if (found) setModalNode({ ...found, data: { ...found.data } });
      return nds;
    });
  }, []);

  // ── Initialize nodes FIRST ──────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState(() =>
    hydrateNodes(workflow.data?.nodes, null, handleDoubleClick)
  );

  // ── Initialize edges SECOND (with null delete handler initially) ────────
  const [edges, setEdges, onEdgesChange] = useEdgesState(() =>
    hydrateEdges(workflow.data?.nodes, null)
  );
   const getNodeVariables = useCallback((nodeId) => {
  return getAvailableVariablesForNode(nodeId, nodes, edges);
}, [nodes, edges]);


  // ── Delete edge handler - defined AFTER setEdges exists ─────────────────
  const handleDeleteEdge = useCallback((edgeId) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  }, [setEdges]);

  // ── Rename handler ──────────────────────────────────────────────────────
const handleRename = useCallback((nodeId, newName) => {
  setNodes((nds) => {
    const otherNames = getOtherNames(nds, nodeId);
    const validated = validateName(newName, otherNames);

    // Generate variable-safe name (spaces → underscores)
    const variableName = validated.replace(/\s+/g, '_');
    
    // For display: keep original name with spaces
    const displayName = validated;

    // Generate new ID from variableName (not displayName)
    const newId = variableName;
    const oldId = nodeId;

    // Update nodes with new ID, label (display), and variableName
    const updatedNodes = nds.map((n) =>
      n.id === nodeId
        ? { 
            ...n, 
            id: newId, 
            data: { 
              ...n.data, 
              label: displayName,        // Display name with spaces (e.g., "Get User Data")
              variableName: variableName  // Variable name with underscores (e.g., "Get_User_Data")
            } 
          }
        : n
    );

    // Update edges if ID changed
    if (oldId !== newId) {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.source === oldId) {
            return {
              ...edge,
              source: newId,
              id: `e-${newId}-${edge.target}`,
            };
          }
          if (edge.target === oldId) {
            return {
              ...edge,
              target: newId,
              id: `e-${edge.source}-${newId}`,
            };
          }
          return edge;
        })
      );
    }

    return updatedNodes;
  });
}, [setNodes, setEdges]); 

  // Helper to convert display name to variable-safe name (spaces → underscores)
const sanitizeForVariable = (name) => {
  return name.replace(/\s+/g, '_');
};

  // Check if workflow needs confirmation before running
const checkNeedsConfirmation = useCallback(() => {
  // Check canvas nodes
  for (const node of nodes) {
    if (node.data?.type === "ManualTrigger" && node.data?.parameters?.requiresConfirmation === true) {
      return true;
    }
  }
  // Check saved workflow data
  if (workflow?.data?.nodes) {
    for (const node of workflow.data.nodes) {
      if (node.type === "ManualTrigger" && node.parameters?.requiresConfirmation === true) {
        return true;
      }
    }
  }
  return false;
}, [nodes, workflow]);

  // ── Update nodes with real handlers ──────────────────────────────────────
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, onRename: handleRename, onDoubleClick: handleDoubleClick },
      }))
    );
  }, [handleRename, handleDoubleClick, setNodes, nodes.length]);

  // ── Inject onDelete into edges (runs after handleDeleteEdge is defined) ─
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: { ...e.data, onDelete: handleDeleteEdge }
      }))
    );
  }, [handleDeleteEdge, setEdges]);

  // ── Load variables from ManualTrigger if exists ──────────────────────────
  useEffect(() => {
    const manualNode = workflow.data?.nodes?.find((n) => n.type === "ManualTrigger" && Array.isArray(n.parameters?.variables));
    if (manualNode) {
      setVariables(manualNode.parameters.variables);
    }
  }, [workflow.data, setVariables]);

  // ── Inject node status into node data for visual highlighting ────────────
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, status: nodeStatuses[n.id] || null },
      }))
    );
  }, [nodeStatuses, setNodes]);

  // ── Build node ───────────────────────────────────────────────────────────
const buildNode = useCallback((catalog, position) => {
  const displayName = catalog.label;
  const variableName = displayName.replace(/\s+/g, '_');
  const id = variableName;  // Use variableName as ID
  
  return {
    id, type: "custom", position,
    data: {
      id,
      type: catalog.type,
      label: displayName,           // Display name (with spaces)
      variableName: variableName,   // Variable name (underscores)
      description: "",
      parameters: getDefaultParams(catalog.type),
      nexts: [],
      onRename: handleRename,
      onDoubleClick: handleDoubleClick,
    },
  };
}, [handleRename, handleDoubleClick]);

  // ── Add node ─────────────────────────────────────────────────────────────
  const addNode = useCallback((catalog, pos) => {
    if (pos) {
      setNodes((nds) => {
        const label = validateName(catalog.label, nds.map((n) => n.data.label));
        const node  = buildNode({ ...catalog, label }, pos);
        node.data.label = label;
        return [...nds, node];
      });
      return;
    }
    const canvasEl = document.querySelector(".react-flow__viewport");
    const wrapper  = canvasEl?.closest(".react-flow");
    let cx = 400, cy = 250;
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      const fc   = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      cx = fc.x; cy = fc.y;
    }
    setNodes((nds) => {
      const label    = validateName(catalog.label, nds.map((n) => n.data.label));
      const offset   = nds.length * 30;
      const position = { x: cx - 90 + offset, y: cy - 30 + offset };
      const node     = buildNode({ ...catalog, label }, position);
      node.data.label = label;
      return [...nds, node];
    });
  }, [buildNode, setNodes, screenToFlowPosition]);

  // ── Drop from sidebar ────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/nodeType");
    if (!raw) return;
    const catalog  = JSON.parse(raw);
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addNode(catalog, position);
  }, [screenToFlowPosition, addNode]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // ── Connect — edge color matches source node type ────────────────────────
  const onConnect = useCallback((params) => {
    setNodes((nds) => {
      const color = getEdgeColor(params.source, nds);
      setEdges((eds) => addEdge({
        ...params,
        type: "custom-edge",
        animated: false,
        markerEnd: { 
          type: "arrowclosed", 
          color: color,
        },
        style: { 
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: "5,5",
        },
        data: { onDelete: handleDeleteEdge },
      }, eds));
      return nds;
    });
  }, [setNodes, setEdges, handleDeleteEdge]);

  // ── Save workflow ────────────────────────────────────────────────────────
  const handleSave = useCallback(async (newName) => {
    setSaving(true); setSaveStatus(null);
    const name = typeof newName === "string" ? newName : wfName;
    if (typeof newName === "string") setWfName(newName);
    try {
      const wfId = workflow._id || workflow.id;
      await saveWorkflow(wfId, nodes, edges, name);
      setSaveStatus("ok");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error("[save]", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [workflow._id, workflow.id, nodes, edges, wfName]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => handleSave(), 30000);
    return () => clearInterval(timer);
  }, [handleSave]);

  // ── Run workflow ─────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (nodes.length === 0) return;
    setRunning(true); setRunResults(null); setNodeStatuses({});
    clearResults();

    const initialStatus = {};
    for (const n of nodes) initialStatus[n.id] = "running";
    setNodeStatuses(initialStatus);

    try {
      const serialized = serializeWorkflow(nodes, edges, wfName, workflow._id || workflow.id);
      const res = await executeAPI.runWorkflow(serialized);
      let results = res.data.results;

      results = results.map((result) => {
        const canvasNode = nodes.find((n) => n.id === result.nodeId);
        return {
          ...result,
          label: canvasNode?.data?.label || result.label || result.nodeId,
        };
      });

      setGlobalResults(results);

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        await new Promise((resolve) => setTimeout(resolve, 300));
        setNodeStatuses((prev) => ({
          ...prev,
          [r.nodeId]: r.status >= 200 && r.status < 300 ? "ok" : "error",
        }));
      }

      setRunResults(results);
    } catch (err) {
      console.error("[run]", err);
      const errStatus = {};
      for (const n of nodes) errStatus[n.id] = "error";
      setNodeStatuses(errStatus);
      setRunResults([{ nodeId: "error", label: "Run failed", type: "", status: "error", data: null, error: err.response?.data?.error || err.message, duration: 0 }]);
    } finally {
      setRunning(false);
      setTimeout(() => setNodeStatuses({}), 4000);
    }
  }, [nodes, edges, wfName, setGlobalResults, clearResults, workflow._id, workflow.id]);

  // Handle import workflow from JSON file
  const handleImport = useCallback(async (file) => {
    readAndImportWorkflow(file, async (importedWorkflow) => {
      setNodes(importedWorkflow.nodes);
      setEdges(importedWorkflow.edges);
      setWfName(importedWorkflow.name);
      setRunResults(null);
      setNodeStatuses({});
      clearResults();
      
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: {
              ...n.data,
              onRename: handleRename,
              onDoubleClick: handleDoubleClick,
            },
          }))
        );
      }, 50);
      
      setSaving(true);
      try {
        const wfId = workflow._id || workflow.id;
        await saveWorkflow(wfId, importedWorkflow.nodes, importedWorkflow.edges, importedWorkflow.name);
        setSaveStatus("ok");
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (err) {
        console.error("[import save]", err);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(null), 3000);
      } finally {
        setSaving(false);
      }
    }, (error) => {
      console.error("Import failed:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
      alert("Failed to import workflow: " + error.message);
    });
  }, [setNodes, setEdges, setWfName, setRunResults, setNodeStatuses, clearResults, workflow._id, workflow.id, handleRename, handleDoubleClick, saveWorkflow]);

  // ── Download workflow ────────────────────────────────────────────────────
  const handleDownload = useCallback(() => downloadWorkflow(nodes, edges, wfName), [nodes, edges, wfName]);

  // ── Modal save — updates node parameters ─────────────────────────────────
  const handleModalSave = useCallback((newParams) => {
    if (!modalNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === modalNode.id ? { ...n, data: { ...n.data, parameters: newParams } } : n
      )
    );
    if (modalNode.data.type === "ManualTrigger" && Array.isArray(newParams.variables)) {
      setVariables(newParams.variables);
    }
    setModalNode(null);
  }, [modalNode, setNodes, setVariables]);

  // ── MiniMap: each node type gets its own color ───────────────────────────
  const minimapNodeColor = useCallback((node) => NODE_COLORS[node.data?.type] || "#e06c3a", []);

  // ── Render modal based on node type ──────────────────────────────────────
  const renderModal = () => {
    if (!modalNode) return null;
    const type = modalNode.data.type;

    if (API_NODE_TYPES.has(type)) {
      return (
        <HttpRequestModal
          node={modalNode}
          onSave={handleModalSave}
          onClose={() => setModalNode(null)}
          onRename={handleRename}           // ← ADD THIS
          nodes={nodes}
          edges={edges}
          workflow={workflow}
          availableVariables={getNodeVariables(modalNode.id)}   // ← This line          
        />
      );
    }
    if (TRIGGER_NODE_TYPES.has(type)) {
      return (
      <TriggerConfigModal node={modalNode} 
      onSave={handleModalSave}
       onClose={() => setModalNode(null)} 
      onRename={handleRename}   
      availableVariables={getNodeVariables(modalNode.id)}   // ← NEW
      />
      );
    }
    if (LLM_NODE_TYPES.has(type)) {
      return (
        <LLMCallModal
          node={modalNode}
          onSave={handleModalSave}
          onClose={() => setModalNode(null)}
          onRename={handleRename}           // ← ADD THIS
          nodes={nodes}
          edges={edges}
          workflow={workflow}
          availableVariables={getNodeVariables(modalNode.id)}   // ← NEW
        />
      );
    }
    return (
      <div style={pm.overlay} onClick={() => setModalNode(null)}>
        <div style={pm.box} onClick={(e) => e.stopPropagation()}>
          <p style={pm.title}>{modalNode.data.label}</p>
          <p style={pm.sub}>{type} configuration — coming soon</p>
          <button style={pm.btn} onClick={() => setModalNode(null)}>Close</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ ...s.page, background: ui.bg }}>
              <Toolbar
            workflowName={wfName}
            nodeCount={nodes.length}
            onSave={handleSave}
            onDownload={handleDownload}
            onRun={handleRun}
            onBack={onBack}
            onImport={handleImport}
            needsConfirmation={checkNeedsConfirmation()}
            saving={saving}
            saveStatus={saveStatus}
            running={running}
          />
      <div style={s.main}>
        <Sidebar onAddNode={addNode} />
        <div style={s.canvas}>
          <ReactFlow
            nodes={nodes} edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onDrop={onDrop} onDragOver={onDragOver}
            fitView deleteKeyCode="Delete"
            style={{ background: canvasTheme.bg }}
          >
            <Background color={canvasTheme.dot} gap={24} size={canvasTheme.type === "lines" ? 0.5 : 1.2} variant={canvasTheme.type === "lines" ? "lines" : "dots"} />
            <Controls style={{ background: ui.surface, border: `1px solid ${ui.border}`, borderRadius: 8, overflow: "hidden" }} />
            <MiniMap nodeColor={minimapNodeColor} maskColor="rgba(0,0,0,0.4)"
              style={{ background: ui.surface, border: `1px solid ${ui.border}`, borderRadius: 8 }} />
          </ReactFlow>
          {nodes.length === 0 && (
            <div style={s.empty}>
              <p style={{ ...s.emptyTitle, color: ui.textHint }}>Canvas is empty</p>
              <p style={{ ...s.emptyHint,  color: ui.textHint }}>← Drag or click a node from the sidebar</p>
            </div>
          )}
        </div>
        {runResults !== null && (
          <RunResultsPanel results={runResults} onClose={() => setRunResults(null)} />
        )}
      </div>
      {renderModal()}
    </div>
  );
}

const s = {
  page:       { height: "100vh", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  main:       { flex: 1, display: "flex", overflow: "hidden" },
  canvas:     { flex: 1, position: "relative" },
  empty:      { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" },
  emptyTitle: { margin: "0 0 6px", fontSize: 17, fontWeight: 600 },
  emptyHint:  { margin: 0, fontSize: 12 },
};

const pm = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  box:     { background: "#13132a", border: "1px solid #2d2d4e", borderRadius: 12, padding: "32px 40px", textAlign: "center" },
  title:   { margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "#e8e8f0" },
  sub:     { margin: "0 0 24px", fontSize: 13, color: "#555" },
  btn:     { background: "#e06c3a", border: "none", borderRadius: 7, padding: "8px 24px", fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer" },
};