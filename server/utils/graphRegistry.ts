
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let graphData = null
const GRAPH_FILE_PATH = 'lessons/graph.json'

function loadGraphs() {
    if (graphData) return graphData

    try {
        const path = resolve(process.cwd(), GRAPH_FILE_PATH)
        const fileContent = readFileSync(path, 'utf-8')
        const graphs = JSON.parse(fileContent)

        // Convert array of graphs to map: graphId -> graph
        const map = new Map()
        for (const g of graphs) {
            map.set(g.graphId, g)
        }
        graphData = map
        console.log(`[GraphRegistry] Loaded ${map.size} graphs from ${path}`)
    } catch (e) {
        console.error(`[GraphRegistry] Failed to load graphs from ${GRAPH_FILE_PATH}`, e)
        graphData = new Map() // Fallback to empty to avoid crashes
    }

    return graphData
}

export const graphRegistry = {
    getGraph(graphId) {
        const graphs = loadGraphs()
        return graphs.get(graphId)
    },

    getNode(graphId, nodeId) {
        const graph = this.getGraph(graphId)
        if (!graph) return null
        return graph.nodes.find(n => n.id === nodeId) || null
    },
}

// Validates if a node exists in graph and if option is valid for that node
// Returns: { valid: boolean, error?: string, node?: any }
export function validateGraphNode(graphId: string, subTaskId: string, optionId?: string) {
    const graphs = loadGraphs() // Ensure graphs are loaded
    const graph = graphs.get(graphId)
    if (!graph) {
        return { valid: false, error: `Graph ${graphId} not found` }
    }

    const node = graph.nodes.find((n: any) => n.id === subTaskId)
    if (!node) {
        return { valid: false, error: `Node ${subTaskId} not found in graph ${graphId}` }
    }

    if (optionId) {
        const option = node.options?.find((o: any) => o.id === optionId)
        if (!option) {
            return { valid: false, error: `Option ${optionId} not found in node ${subTaskId}` }
        }
    }

    return { valid: true, node }
}
