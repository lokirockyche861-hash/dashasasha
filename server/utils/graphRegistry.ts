
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

let graphData: Map<string, any> | null = null
const GRAPH_FILE_PATH = 'lessons/graph.json'
const PRACTICE_DIR_PATH = 'lessons/practice'

function loadGraphs(forceReload = false): Map<string, any> {
    if (graphData && !forceReload) return graphData

    const map = new Map<string, any>()

    // 1. Read legacy graphs from lessons/graph.json
    try {
        const legacyPath = resolve(process.cwd(), GRAPH_FILE_PATH)
        if (existsSync(legacyPath)) {
            const fileContent = readFileSync(legacyPath, 'utf-8')
            const graphs = JSON.parse(fileContent)
            if (Array.isArray(graphs)) {
                for (const g of graphs) {
                    if (g && g.graphId) map.set(g.graphId, g)
                }
            }
        }
    } catch (e) {
        // ignore
    }

    try {
        const practiceDir = resolve(process.cwd(), PRACTICE_DIR_PATH)
        if (existsSync(practiceDir)) {
            const files = readdirSync(practiceDir)
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = resolve(practiceDir, file)
                    const content = readFileSync(filePath, 'utf-8')
                    const lessonData = JSON.parse(content)
                    if (lessonData?.rule?.graphId) {
                        map.set(lessonData.rule.graphId, lessonData.rule)
                    }
                }
            }
        }
    } catch (e) {
        // ignore
    }

    graphData = map
    console.log(`[GraphRegistry] Loaded ${map.size} graphs:`, Array.from(map.keys()))
    return graphData
}

export const graphRegistry = {
    getGraph(graphId: string) {
        let graphs = loadGraphs()
        let graph = graphs.get(graphId)
        if (!graph) {
            graphs = loadGraphs(true)
            graph = graphs.get(graphId)
        }
        return graph || null
    },

    getNode(graphId: string, nodeId: string) {
        const graph = this.getGraph(graphId)
        if (!graph) return null
        return graph.nodes?.find((n: any) => n.id === nodeId) || null
    },
}

// Validates if a node exists in graph and if option is valid for that node
// Returns: { valid: boolean, error?: string, node?: any }
export function validateGraphNode(graphId: string, subTaskId: string, optionId?: string) {
    let graphs = loadGraphs()
    let graph = graphs.get(graphId)
    if (!graph) {
        graphs = loadGraphs(true)
        graph = graphs.get(graphId)
    }

    if (!graph) {
        return { valid: false, error: `Graph ${graphId} not found` }
    }

    const node = graph.nodes?.find((n: any) => n.id === subTaskId)
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
