// server/routes/ai.js
const express = require("express");
const { requireAuth } = require("../middleware/auth");
const axios = require("axios");

const router = express.Router();
router.use(requireAuth);

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

// List of auth-related variables to EXCLUDE
var EXCLUDED_VARS = [
    "apiKeyName", "apiKeyValue", "bearerToken", "username", "password",
    "$var.apiKeyName", "$var.apiKeyValue", "$var.bearerToken", "$var.username", "$var.password"
];

// Helper to clean variable names (remove $json. and $var. prefixes)
function cleanVariableName(variable) {
    if (variable.startsWith("$json.")) {
        return variable.substring(6);
    }
    if (variable.startsWith("$var.")) {
        return variable.substring(5);
    }
    return variable;
}

// Helper to collect variables with their source node
function collectVariablesWithSource(workflow, currentNodeId, currentNodeParams, clientContextVars, nodes) {
    var variables = [];

    // 1. Current node's own parameters (source = current node)
    if (currentNodeParams) {
        if (currentNodeParams.base_url) {
            variables.push({ name: "base_url", source: "current_node", nodeName: null });
        }
        if (currentNodeParams.endpoint) {
            variables.push({ name: "endpoint", source: "current_node", nodeName: null });
        }
        if (currentNodeParams.method) {
            variables.push({ name: "method", source: "current_node", nodeName: null });
        }
    }

    // 2. ManualTrigger variables (source = ManualTrigger node name)
    if (workflow && workflow.nodes) {
        for (var i = 0; i < workflow.nodes.length; i++) {
            var node = workflow.nodes[i];
            var nodeType = node.type || "";
            if (nodeType === "ManualTrigger") {
                var nodeName = node.name || (node.data && node.data.label) || "ManualTrigger";
                var params = node.parameters || (node.data && node.data.parameters) || {};
                var vars = params.variables || [];
                for (var j = 0; j < vars.length; j++) {
                    if (vars[j].name) {
                        variables.push({
                            name: vars[j].name,
                            source: "manual_trigger",
                            nodeName: nodeName
                        });
                    }
                }
            }
        }
    }

    // 3. Parent node outputs (source = parent node name)
    if (workflow && workflow.nodes && currentNodeId && nodes) {
        var commonFields = ["id", "userId", "name", "email", "status", "data", "message", "createdAt", "updatedAt"];
        for (var i = 0; i < workflow.nodes.length; i++) {
            var node = workflow.nodes[i];
            var nexts = node.nexts || (node.data && node.data.nexts) || [];
            if (nexts.indexOf(currentNodeId) !== -1) {
                var parentNodeName = node.name || (node.data && node.data.label) || node.type || "Unknown";
                for (var j = 0; j < commonFields.length; j++) {
                    variables.push({
                        name: commonFields[j],
                        source: "parent_output",
                        nodeName: parentNodeName
                    });
                }
            }
        }
    }

    // 4. Client context variables (clean and add source if available)
    if (clientContextVars && clientContextVars.length) {
        for (var i = 0; i < clientContextVars.length; i++) {
            var cleaned = cleanVariableName(clientContextVars[i]);
            // Skip excluded variables
            if (EXCLUDED_VARS.indexOf(cleaned) !== -1 || EXCLUDED_VARS.indexOf(clientContextVars[i]) !== -1) {
                continue;
            }

            // Try to detect if this variable has a node prefix (e.g., "GetUser.id")
            var parts = cleaned.split(".");
            if (parts.length > 1) {
                var possibleNodeName = parts[0];
                var fieldName = parts.slice(1).join(".");
                variables.push({
                    name: fieldName,
                    source: "parent_output",
                    nodeName: possibleNodeName
                });
            } else {
                variables.push({
                    name: cleaned,
                    source: "unknown",
                    nodeName: null
                });
            }
        }
    }

    // Remove duplicates (same name from same source)
    var uniqueVars = [];
    var seen = {};
    for (var i = 0; i < variables.length; i++) {
        var v = variables[i];
        var key = v.name + "|" + (v.nodeName || "");
        if (!seen[key]) {
            seen[key] = true;
            uniqueVars.push(v);
        }
    }

    return uniqueVars;
}

// POST /api/ai/suggestions
router.post("/suggestions", async function(req, res) {
    try {
        var nodeType = req.body.nodeType || "APICall";
        var fieldName = req.body.fieldName || "unknown";
        var userInput = req.body.userInput || "";
        var contextVariables = req.body.contextVariables || [];
        var currentNodeId = req.body.currentNodeId;
        var workflow = req.body.workflow;
        var currentNodeParams = req.body.currentNodeParams || {};
        var nodes = req.body.nodes || [];

        var variablesWithSource = collectVariablesWithSource(workflow, currentNodeId, currentNodeParams, contextVariables, nodes);
        var suggestions = [];

        console.log("Variables with sources:", JSON.stringify(variablesWithSource, null, 2));

        // Build suggestions with source information
        for (var i = 0; i < variablesWithSource.length; i++) {
            var v = variablesWithSource[i];
            var description = "";

            if (v.source === "manual_trigger" && v.nodeName) {
                description = "From: " + v.nodeName;
            } else if (v.source === "parent_output" && v.nodeName) {
                description = "From: " + v.nodeName;
            } else if (v.source === "current_node") {
                description = "From current node";
            } else {
                description = "Available variable";
            }

            suggestions.push({
                label: v.name,
                description: description,
                category: (v.source === "manual_trigger" ? "Variables" : "Previous Node"),
                confidence: 0.7,
                nodeSource: v.nodeName
            });
        }

        // Remove duplicates by label
        var uniqueSuggestions = [];
        var seenLabels = {};
        for (var i = 0; i < suggestions.length; i++) {
            if (!seenLabels[suggestions[i].label]) {
                seenLabels[suggestions[i].label] = true;
                uniqueSuggestions.push(suggestions[i]);
            }
        }

        // Filter by user input
        var input = (userInput || "").toLowerCase();
        var filteredSuggestions = [];
        for (var i = 0; i < uniqueSuggestions.length; i++) {
            var s = uniqueSuggestions[i];
            if (!input || s.label.toLowerCase().indexOf(input) !== -1) {
                filteredSuggestions.push(s);
            }
        }

        console.log("Final suggestions:", filteredSuggestions.map(function(s) {
            return s.label + " (" + s.description + ")";
        }));

        res.json({ suggestions: filteredSuggestions.slice(0, 8) });
    } catch (err) {
        console.error("[AI suggestions] Error:", err.message);
        res.json({ suggestions: [] });
    }
});

// POST /api/ai/feedback
router.post("/feedback", async function(req, res) {
    try {
        await axios.post(ML_SERVICE_URL + "/feedback", req.body);
        res.json({ status: "recorded" });
    } catch (err) {
        console.error("[AI feedback] Error:", err.message);
        res.json({ status: "recorded" });
    }
});

module.exports = router;