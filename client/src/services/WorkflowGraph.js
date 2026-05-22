// client/src/services/WorkflowGraph.js
export function getDownstreamNodes(nodes, edges, startNodeIds) {
    const graph = new Map();
    const visited = new Set();

    // Build adjacency list (outgoing edges)
    for (const edge of edges) {
        if (!graph.has(edge.source)) graph.set(edge.source, []);
        graph.get(edge.source).push(edge.target);
    }

    const queue = [...startNodeIds];
    const reachable = new Set(startNodeIds);

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        visited.add(current);

        const neighbors = graph.get(current) || [];
        for (const neighbor of neighbors) {
            if (!reachable.has(neighbor)) {
                reachable.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return Array.from(reachable);
}

export function getAvailableVariablesForNode(nodeId, nodes, edges) {
    // Get all ManualTrigger nodes
    const manualTriggers = nodes.filter(function(n) {
        return n && n.data && n.data.type === "ManualTrigger";
    }).map(function(n) {
        return n.id;
    });

    if (manualTriggers.length === 0) return [];

    const reachableNodeIds = getDownstreamNodes(nodes, edges, manualTriggers);

    if (reachableNodeIds.includes(nodeId)) {
        const vars = [];
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (n && n.data && n.data.type === "ManualTrigger" &&
                n.data.parameters && n.data.parameters.variables) {
                var variables = n.data.parameters.variables;
                for (var j = 0; j < variables.length; j++) {
                    if (variables[j] && variables[j].name) {
                        vars.push(variables[j].name);
                    }
                }
            }
        }
        // Return unique variables
        return vars.filter(function(value, index, self) {
            return self.indexOf(value) === index;
        });
    }

    return [];
}