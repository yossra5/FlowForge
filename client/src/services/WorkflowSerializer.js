// client/src/services/WorkflowSerializer.js
// ─────────────────────────────────────────────────────────────────────────────
// Converts React Flow canvas state → the exact JSON schema the supervisor wants.
// ─────────────────────────────────────────────────────────────────────────────

import { workflowAPI } from "./api";
import { buildPayloadDict, normalisePromptTemplate } from "../data/nodeTypes";

// =============================================================================
// TRANSFORM FUNCTIONS for Expression Formatting
// =============================================================================

function transformExpressionToExport(value) {
    if (typeof value !== "string") return value;

    let transformed = value;

    // Convert {{NodeName.field}} → {{$json.field}}
    transformed = transformed.replace(/\{\{([^.]+)\.([^}]+)\}\}/g, (match, nodeName, field) => {
        return `{{$json.${field}}}`;
    });

    // Convert {{Input.field}} → {{$json.field}}
    transformed = transformed.replace(/\{\{Input\.([^}]+)\}\}/g, (match, field) => {
        return `{{$json.${field}}}`;
    });

    // Convert simple {{field}} → {{$json.field}} (only if not already converted)
    if (!transformed.includes("{{$json.") && !transformed.includes("{{$var.")) {
        transformed = transformed.replace(/\{\{([^}$]+)\}\}/g, (match, content) => {
            if (content.startsWith("$")) return match;
            return `{{$json.${content}}}`;
        });
    }

    return transformed;
}

function transformExpressionToDisplay(value) {
    if (typeof value !== "string") return value;
    return value.replace(/\{\{\$json\.([^}]+)\}\}/g, (_match, content) => `{{${content}}}`);
}

// Recursively transform all string values in an object for export
function transformParametersForExport(obj) {
    if (obj === null || typeof obj !== "object") {
        return transformExpressionToExport(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(transformParametersForExport);
    }
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
        newObj[key] = transformParametersForExport(value);
    }
    return newObj;
}

// Recursively transform all string values in an object for display
function transformParametersForDisplay(obj) {
    if (obj === null || typeof obj !== "object") {
        return transformExpressionToDisplay(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(transformParametersForDisplay);
    }
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
        newObj[key] = transformParametersForDisplay(value);
    }
    return newObj;
}

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

function buildExportParameters(type, params) {
    const clean = params || {};
    const transformed = transformParametersForExport(clean);

    switch (type) {
        case "APICall":
            return {
                base_url: transformed.base_url || "",
                endpoint: transformed.endpoint || "",
                method: transformed.method || "GET",
                payload: buildPayloadDict(transformed.payload),
                authentication: transformed.authentication || { type: "none" },
            };

        case "ManualTrigger":
            return {
                buttonLabel: transformed.buttonLabel || "Run Workflow",
                requiresConfirmation: transformed.requiresConfirmation !== false,
                variables: Array.isArray(transformed.variables) ?
                    transformed.variables.map((v) => ({
                        ...v,
                        value: transformExpressionToExport(v.value),
                    })) : [],
            };

        case "ScheduleTrigger":
            return {
                interval: transformed.interval || "hourly",
                time: transformed.time || "09:00",
                enabled: transformed.enabled !== false,
            };

        case "LLMCall":
            {
                const rawParts = Array.isArray(transformed.input_prompt_template) ?
                    transformed.input_prompt_template : [];

                const exportedParts = rawParts.map((part) => {
                    if (part.type === "text") {
                        return { type: "text", text: transformExpressionToExport(part.text || "") };
                    }
                    if (part.type === "image") {
                        return { type: "image", image: transformExpressionToExport(part.image || "") };
                    }
                    return part;
                });

                const systemPrompt = transformed.system_prompt_template != null ?
                    transformed.system_prompt_template : "You are a helpful assistant";

                const responseFormat = transformed.response_format != null ?
                    transformed.response_format : null;

                return {
                    LLM_model: transformed.LLM_model || "gpt-4.1",
                    system_prompt_template: transformExpressionToExport(systemPrompt),
                    input_prompt_template: exportedParts,
                    response_format: responseFormat,
                };
            }

        default:
            return transformed;
    }
}

// Export workflow
export function exportWorkflow(rfNodes, rfEdges, name = "My Workflow") {
    const allTargets = new Set(rfEdges.map((e) => e.target));
    const entryNodes = rfNodes
        .filter((n) => !allTargets.has(n.id))
        .map((n) => n.id);

    const nodes = rfNodes.map((node) => {
        const nexts = rfEdges
            .filter((e) => e.source === node.id)
            .map((e) => e.target);

        const cleanParams = buildExportParameters(node.data.type, node.data.parameters || {});

        return {
            uniq_id: node.id,
            type: node.data.type,
            name: node.data.label,
            description: node.data.description || null,
            parameters: cleanParams,
            nexts,
        };
    });

    return {
        name,
        version: "1.0",
        nodes,
        entry_nodes: entryNodes,
        orchestration_response: { type: "", target_nodes: [] },
    };
}

// Download workflow
export function downloadWorkflow(rfNodes, rfEdges, name) {
    const workflow = exportWorkflow(rfNodes, rfEdges, name);
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "workflow").replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import & other functions (unchanged)
export function importWorkflow(importedData) {
    const { name, nodes: importedNodes } = importedData;

    const defaultPositions = [
        { x: 100, y: 100 }, { x: 350, y: 100 }, { x: 600, y: 100 },
        { x: 100, y: 300 }, { x: 350, y: 300 }, { x: 600, y: 300 },
    ];

    const nodes = importedNodes.map((node, index) => {
        const displayParams = transformParametersForDisplay(node.parameters || {});

        if (node.type === "LLMCall") {
            displayParams.input_prompt_template = normalisePromptTemplate(
                displayParams.input_prompt_template
            );
        }

        return {
            id: node.uniq_id,
            type: "custom",
            position: node.position || defaultPositions[index % defaultPositions.length],
            data: {
                id: node.uniq_id,
                type: node.type,
                label: node.name,
                description: node.description || "",
                parameters: displayParams,
                nexts: node.nexts || [],
                onRename: () => {},
                onDoubleClick: () => {},
            },
        };
    });

    const edges = [];
    for (const node of importedNodes) {
        const sourceId = node.uniq_id;
        for (const targetId of(node.nexts || [])) {
            edges.push({
                id: `e-${sourceId}-${targetId}`,
                source: sourceId,
                target: targetId,
                type: "default",
                animated: false,
                markerEnd: { type: "arrowclosed", color: "#e06c3a" },
                style: { stroke: "#e06c3a", strokeWidth: 2, strokeDasharray: "5,5" },
                data: { onDelete: () => {} },
            });
        }
    }

    return { name, nodes, edges };
}

export function readAndImportWorkflow(file, onSuccess, onError) {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            const workflow = importWorkflow(importedData);
            onSuccess(workflow);
        } catch (err) {
            onError(err);
        }
    };
    reader.onerror = () => onError(new Error("Failed to read file"));
    reader.readAsText(file);
}

export function serializeWorkflow(rfNodes, rfEdges, name = "My Workflow", workflowId = null) {
    const allTargets = new Set(rfEdges.map((e) => e.target));
    const entryNodes = rfNodes
        .filter((n) => !allTargets.has(n.id))
        .map((n) => n.id);

    const nodes = rfNodes.map((node) => {
        const nexts = rfEdges
            .filter((e) => e.source === node.id)
            .map((e) => e.target);

        return {
            uniq_id: node.id,
            type: node.data.type,
            name: node.data.label,

            description: node.data.description || null,
            position: node.position || { x: 100, y: 100 },
            parameters: node.data.parameters || {},
            nexts,
        };
    });

    return {
        id: workflowId || null,
        name,
        version: "1.0",
        nodes,
        entry_nodes: entryNodes,
        orchestration_response: { type: "", target_nodes: [] },
    };
}

export async function saveWorkflow(workflowId, rfNodes, rfEdges, name) {
    const data = serializeWorkflow(rfNodes, rfEdges, name);
    const id = workflowId && workflowId._id ? workflowId._id : workflowId;
    const res = await workflowAPI.save(id, { name, data });
    return res.data;
}