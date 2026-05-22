// server/models/VariableUsage.js
// Stores every variable selection for ML training

const mongoose = require("mongoose");

const variableUsageSchema = new mongoose.Schema({
    workflow_id: { type: String, required: true },
    node_id: { type: String, required: true },
    node_type: { type: String, required: true }, // APICall, ManualTrigger, Condition, Loop, Transform
    field_name: { type: String, required: true }, // endpoint, base_url, payload, left, right, array
    user_input: { type: String, default: "" }, // what they typed before selecting
    selected_variable: { type: String, required: true },
    context_variables: { type: [String], default: [] },
    was_manually_typed: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
});

// Create index for faster queries
variableUsageSchema.index({ node_type: 1, field_name: 1 });
variableUsageSchema.index({ timestamp: -1 });

module.exports = mongoose.model("VariableUsage", variableUsageSchema);