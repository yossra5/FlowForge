// client/src/data/nodeTypes.js
// Single source of truth for all node types.
// Add new types here — sidebar, canvas, modals, JSON export all update automatically.

export const NODE_CATALOG = [
    // ── Triggers ────────────────────────────────────────────────────────────────
    {
        type: "ScheduleTrigger",
        label: "Schedule Trigger",
        description: "Run workflow on a schedule",
        color: "#3b82f6",
        icon: "Clock",
        category: "Triggers",
        hasInput: false, // trigger nodes have no incoming connections
        hasOutput: true,
    },
    {
        type: "ManualTrigger",
        label: "Manual Trigger",
        description: "Start workflow manually",
        color: "#00cc66",
        icon: "Zap",
        category: "Triggers",
        hasInput: false,
        hasOutput: true,
    },
    // ── Actions ─────────────────────────────────────────────────────────────────
    {
        type: "APICall",
        label: "API Call",
        description: "Make HTTP calls to any API endpoint",
        color: "#e06c3a",
        icon: "Globe",
        category: "Actions",
        hasInput: true,
        hasOutput: true,
    },
    // ── AI ──────────────────────────────────────────────────────────────────────
    {
        type: "AIAgent",
        label: "AI Agent",
        description: null, // Description is optional - if null, sidebar will show a default one based on the parameters
        color: " #ac00e6",
        icon: "Bot",
        category: "AI",
        hasInput: true,
        hasOutput: true,
    },
    {
        type: "LLMCall",
        label: "LLM Basic Chain",
        description: "Call a language model directly",
        color: "#e6b800",
        icon: "MessageSquare",
        category: "AI",
        hasInput: true,
        hasOutput: true,
    },
];

// Color lookup by type — used in MiniMap, NodeCard, edges
export const NODE_COLORS = {
    ScheduleTrigger: "#3b82f6",
    ManualTrigger: "#00cc66",
    APICall: "#e06c3a",
    AIAgent: " #ac00e6",
    LLMCall: " #e6b800",
};

// Which node types open the HttpRequestModal on double-click
export const API_NODE_TYPES = new Set(["APICall"]);

// Which node types open the TriggerConfigModal on double-click
export const TRIGGER_NODE_TYPES = new Set(["ScheduleTrigger", "ManualTrigger"]);

// Default parameters per type
export const APICALL_DEFAULTS = {
    base_url: "",
    base_url_mode: "fixed",
    endpoint: "",
    endpoint_mode: "fixed",
    url_mode: "fixed",
    method: "GET",
    payload: { type: "keypair", fields: [], json: "", jsonMode: "fixed" },
    authentication: { type: "none" },
};

export const SCHEDULE_TRIGGER_DEFAULTS = {
    interval: "hourly",
    time: "09:00",
    enabled: true,
};

export const MANUAL_TRIGGER_DEFAULTS = {
    requiresConfirmation: true,
    buttonLabel: "Run Workflow",
    variables: [],
};

export const AIAGENT_DEFAULTS = {
    model: "gpt-4",
    system: "",
    prompt: "",
    temperature: 0.7,
};

export const LLMCALL_DEFAULTS = {
    LLM_model: "gpt-4.1",
    system_prompt_template: "You are a helpful assistant",
    input_prompt_template: [{ type: "text", text: "" }, { type: "image", image: "" } // Uncomment to add image block by default
    ],
    response_format: null,
};

// ── LLM model options (single source of truth for the dropdown) ──────────────
export const LLM_MODELS = ["gpt-4.1", "gpt-4o-mini"];
// Add this alongside API_NODE_TYPES and TRIGGER_NODE_TYPES
export const LLM_NODE_TYPES = new Set(["LLMCall"]);
// ── Prompt-part factories ─────────────────────────────────────────────────────
export function makeTextPart(text = "") { return { type: "text", text }; }
export function makeImagePart(image = "") { return { type: "image", image }; }

export function getDefaultParams(type) {
    switch (type) {
        case "APICall":
            return {...APICALL_DEFAULTS, payload: {...APICALL_DEFAULTS.payload, fields: [] } };
        case "ScheduleTrigger":
            return {...SCHEDULE_TRIGGER_DEFAULTS };
        case "ManualTrigger":
            return {...MANUAL_TRIGGER_DEFAULTS };
        case "AIAgent":
            return {...AIAGENT_DEFAULTS };
        case "LLMCall":
            // Deep-clone the default so each node instance gets its own array
            return {
                ...LLMCALL_DEFAULTS,
                input_prompt_template: [makeTextPart(""), makeImagePart("")] // Add image block by default ,
            };
        default:
            return {};
    }
}

function parseValueByType(value, valueType) {
    if (valueType === "number") {
        const num = Number(value);
        return Number.isNaN(num) ? value : num;
    }
    if (valueType === "boolean") {
        return String(value).toLowerCase() === "true";
    }
    if (valueType === "object" || valueType === "list") {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return String(value);
}

export function buildPayloadDict(payload) {
    if (!payload) return {};
    if (payload.type === "keypair") {
        const dict = {};
        for (const f of(payload.fields || [])) {
            if (!f.key) continue;
            dict[f.key] = parseValueByType(f.value, f.valueType || "string");
        }
        return dict;
    }
    if (payload.type === "json" && payload.json) {
        try { return JSON.parse(payload.json); } catch { return {}; }
    }
    return {};
}

/**
 * Normalise a raw input_prompt_template value coming from storage or import.
 * Guarantees the result is always an array of valid part objects.
 *
 *   null / undefined        → [{ type:"text", text:"" }]
 *   string                  → [{ type:"text", text: <string> }]   (legacy)
 *   array                   → filtered & normalised
 */
export function normalisePromptTemplate(raw) {
    if (!raw) return [makeTextPart()];

    // Legacy: bare string
    if (typeof raw === "string") return [makeTextPart(raw)];

    if (!Array.isArray(raw) || raw.length === 0) return [makeTextPart()];

    return raw.map((part) => {
        if (!part || typeof part !== "object") return makeTextPart();
        if (part.type === "image") return makeImagePart(part.image || "");
        // Default to text for unknown types
        return makeTextPart(part.text || "");
    });
}