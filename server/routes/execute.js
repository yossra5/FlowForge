// server/routes/execute.js
const express = require("express");
const axios = require("axios");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// ── value helpers ─────────────────────────────────────────────────────────────

function parseValueByType(value, valueType) {
    if (valueType === "number") {
        const num = Number(value);
        return Number.isNaN(num) ? value : num;
    }
    if (valueType === "boolean") {
        return String(value).toLowerCase() === "true";
    }
    if (valueType === "object" || valueType === "list") {
        try { return JSON.parse(value); } catch { return value; }
    }
    return String(value);
}

function getValueByPath(source, path) {
    if (!source || typeof path !== "string") return undefined;
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    let current = source;
    for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
    }
    return current;
}

function interpolateString(value, context) {
    if (typeof value !== "string") return value;

    return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, token) => {
        const trimmed = token.trim();

        // Handle "Input.XXX" → resolve from json or vars context
        if (trimmed.startsWith("Input.")) {
            const field = trimmed.substring(6);
            const resolved = getValueByPath(context.json, field) || getValueByPath(context.vars, field);
            if (resolved !== undefined && resolved !== null) {
                return typeof resolved === "object" ? JSON.stringify(resolved) : String(resolved);
            }
            return "";
        }

        // Existing logic
        const resolved = getValueByPath(context, trimmed);
        if (resolved === undefined || resolved === null) return "";
        return typeof resolved === "object" ? JSON.stringify(resolved) : String(resolved);
    });
}

function resolvePayloadValue(value, valueType, context) {
    if (value === undefined || value === null) return value;
    const resolved = interpolateString(value, context);
    return parseValueByType(resolved, valueType);
}

function buildPayloadDict(payload, context) {
    if (!payload) return {};
    if (payload.type === "keypair" && Array.isArray(payload.fields)) {
        const dict = {};
        for (const f of payload.fields) {
            if (!f.key) continue;
            dict[f.key] = resolvePayloadValue(f.value, f.valueType || "string", context);
        }
        return dict;
    }
    if (payload.type === "json" && payload.json) {
        try {
            const interpolated = interpolateString(payload.json, context);
            return JSON.parse(interpolated);
        } catch { return {}; }
    }
    return {};
}

// ── fireRequest ───────────────────────────────────────────────────────────────
async function fireRequest(parameters, context = {}) {
    const {
        base_url,
        endpoint,
        method,
        payload,
        authentication,
        url,
        bodyType,
        bodyFields,
        bodyJson,
    } = parameters;

    const resolvedBaseUrl = interpolateString(base_url || "", context);
    const resolvedEndpoint = interpolateString(endpoint || "", context);

    const fullUrl = base_url !== undefined ?
        ((resolvedBaseUrl || "") + (resolvedEndpoint || "")).trim() :
        interpolateString(url && url.value ? url.value : "", context);

    if (!method || !fullUrl) {
        throw new Error("method and URL are required.");
    }

    const headers = {};
    const auth = authentication || {};

    if (auth.type === "bearerToken" && auth.bearerToken && auth.bearerToken.token) {
        headers["Authorization"] = `Bearer ${interpolateString(auth.bearerToken.token, context)}`;
    }
    if (auth.type === "apiKey") {
        const apiKey = auth.apiKey || {};
        const keyName = apiKey.name;
        const keyValue = interpolateString(apiKey.value || "", context);
        if (apiKey.in === "header" && keyName) headers[keyName] = keyValue;
        if (apiKey.in === "query" && keyName) auth.apiKey = {...apiKey, value: keyValue };
    }
    if (auth.type === "basicAuth" && auth.basicAuth) {
        const username = interpolateString(auth.basicAuth.username || "", context);
        const password = interpolateString(auth.basicAuth.password || "", context);
        const encoded = Buffer.from(`${username}:${password}`).toString("base64");
        headers["Authorization"] = `Basic ${encoded}`;
    }

    const params = {};
    if (auth.type === "apiKey" && auth.apiKey && auth.apiKey.in === "query") {
        params[auth.apiKey.name] = auth.apiKey.value;
    }

    let data = undefined;
    const hasBody = ["POST", "PUT", "PATCH"].includes(method.toUpperCase());

    if (hasBody) {
        if (payload) {
            data = buildPayloadDict(payload, context);
            headers["Content-Type"] = "application/json";
        } else if (bodyType === "keypair" && Array.isArray(bodyFields)) {
            const dict = {};
            for (const f of bodyFields) {
                if (!f.key) continue;
                dict[f.key] = parseValueByType(interpolateString(f.value, context), f.valueType || "string");
            }
            data = dict;
            headers["Content-Type"] = "application/json";
        } else if (bodyType === "json" && bodyJson) {
            try { data = JSON.parse(interpolateString(bodyJson, context)); } catch { data = undefined; }
            headers["Content-Type"] = "application/json";
        }
    }

    const response = await axios({
        method: method.toLowerCase(),
        url: fullUrl,
        headers,
        params,
        data,
        timeout: 15000,
        validateStatus: () => true,
    });

    return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
    };
}

// ── workflow helpers ──────────────────────────────────────────────────────────

function buildWorkflowVariables(nodes) {
    const vars = {};
    for (const node of nodes) {
        if (node.type !== "ManualTrigger") continue;
        const raw = node.parameters && node.parameters.variables ? node.parameters.variables : [];
        for (const variable of raw) {
            if (!variable.name) continue;
            vars[variable.name] = parseValueByType(variable.value, variable.type || "string");
        }
    }
    return vars;
}

function buildTriggerOutput(node) {
    const userVars = {};
    const rawVars = node.parameters && node.parameters.variables ? node.parameters.variables : [];

    for (const v of rawVars) {
        if (v && v.name) {
            userVars[v.name] = parseValueByType(v.value, v.type || "string");
        }
    }

    // Return ONLY user-defined variables directly (no "vars" wrapper)
    return userVars;
}

// ── POST /api/execute — single node ──────────────────────────────────────────
router.post("/", async(req, res) => {
    const { parameters } = req.body;
    if (!parameters) return res.status(400).json({ error: "parameters are required." });
    try {
        const result = await fireRequest(parameters);
        return res.json(result);
    } catch (err) {
        console.error("[execute single]", err.message);
        return res.status(502).json({ error: "Request failed.", message: err.message });
    }
});

// ── POST /api/execute/workflow — run all nodes ────────────────────────────────
router.post("/workflow", async(req, res) => {
    const { nodes } = req.body;
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
        return res.status(400).json({ error: "nodes array is required." });
    }

    const nodeMap = {};
    for (const n of nodes) nodeMap[n.uniq_id] = n;

    const pointedAt = new Set();
    const parentMap = {};
    for (const n of nodes) {
        for (const id of(n.nexts || [])) {
            pointedAt.add(id);
            parentMap[id] = parentMap[id] || [];
            parentMap[id].push(n.uniq_id);
        }
    }

    const roots = nodes.filter((n) => !pointedAt.has(n.uniq_id));
    const startNodes = roots.length > 0 ? roots : nodes;

    const visited = new Set();
    const queue = [...startNodes];
    const order = [];

    while (queue.length > 0) {
        const node = queue.shift();
        if (visited.has(node.uniq_id)) continue;
        visited.add(node.uniq_id);
        order.push(node);
        for (const nextId of(node.nexts || [])) {
            if (nodeMap[nextId] && !visited.has(nextId)) queue.push(nodeMap[nextId]);
        }
    }

    const executionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const globalVars = buildWorkflowVariables(nodes);
    const resultsById = {};
    const results = [];

    for (const node of order) {
        const start = Date.now();
        const result = {
            nodeId: node.uniq_id,
            label: node.label,
            type: node.type,
            status: null,
            data: null,
            error: null,
            duration: null,
        };

        const parentOutputs = (parentMap[node.uniq_id] || [])
            .map((id) => resultsById[id] && resultsById[id].data)
            .filter((v) => v !== undefined && v !== null);

        const jsonContext = parentOutputs.length === 1 ? parentOutputs[0] : Object.assign({}, ...parentOutputs);

        const runtimeContext = {
            json: jsonContext || userVars, // fallback
            vars: globalVars,
        };

        try {
            if (node.type === "ManualTrigger") {
                result.status = 200;
                result.data = buildTriggerOutput(node);

            } else if (node.type === "ScheduleTrigger") {
                result.status = 200;
                result.data = { trigger: node.type };

            } else if (node.type === "APICall") {
                const response = await fireRequest(node.parameters || {}, runtimeContext);
                result.status = response.status;
                result.data = response.data;

            } else if (node.type === "LLMCall") {
                result.status = "skipped";
                result.error = "LLMCall execution requires an LLM backend — not yet wired up.";
            } else {
                result.status = "skipped";
                result.error = `Node type "${node.type}" execution not yet implemented.`;
            }
        } catch (err) {
            result.status = "error";
            result.error = err.message;
        }

        result.duration = Date.now() - start;
        results.push(result);
        resultsById[node.uniq_id] = result;
    }

    return res.json({ results });
});

module.exports = router;