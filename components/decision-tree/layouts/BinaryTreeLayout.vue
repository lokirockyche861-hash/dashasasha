<template>
  <div class="binary-layout-wrapper">
    <!-- Tree Board with absolute SVG overlay for perfect coordinate alignment -->
    <div 
      class="binary-board" 
      ref="boardRef"
      :class="[`orientation-${orientation}`]"
    >
      <!-- SVG Overlay with SmoothStepEdge paths -->
      <svg 
        class="binary-svg" 
        :style="{ width: svgWidth + 'px', height: svgHeight + 'px' }"
      >
        <defs>
          <marker id="arrow-neutral" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto" markerUnits="strokeWidth">
            <polygon points="0 0, 5 2.5, 0 5" fill="#94a3b8" />
          </marker>
          <marker id="arrow-success" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto" markerUnits="strokeWidth">
            <polygon points="0 0, 5 2.5, 0 5" fill="#10b981" />
          </marker>
          <marker id="arrow-active" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto" markerUnits="strokeWidth">
            <polygon points="0 0, 5 2.5, 0 5" fill="#6366f1" />
          </marker>
          <marker id="arrow-error" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto" markerUnits="strokeWidth">
            <polygon points="0 0, 5 2.5, 0 5" fill="#ef4444" />
          </marker>
        </defs>

        <path
          v-for="arrow in arrows"
          :key="arrow.id"
          :d="arrow.d"
          fill="none"
          :stroke="arrow.stroke"
          :stroke-width="arrow.strokeWidth"
          :stroke-dasharray="arrow.dashArray"
          :marker-end="arrow.markerEnd"
          class="tree-arrow"
          :class="{ 'is-active': arrow.isActive, 'is-passed': arrow.isPassed }"
        />
      </svg>

      <!-- Tier-Aligned Dynamic Tree Structure -->
      <div class="binary-tree-levels" v-if="layoutTiers.length > 0">
        <div 
          v-for="tier in layoutTiers" 
          :key="tier.id"
          class="tree-level"
          :class="[tier.id, `tier-type-${tier.type}`]"
        >
          <!-- Root Tier -->
          <div v-if="tier.type === 'root'" class="root-container">
            <div 
              class="tree-card question-card root-card"
              :class="[getNodeClass(tier.rootNode.id), { 'is-active-step': currentNodeId === tier.rootNode.id }]"
              :ref="el => setNodeRef(el, tier.rootNode.id)"
              @click="onNodeClick(tier.rootNode.id)"
            >
              <div class="card-text" v-html="renderMarkdown(tier.rootNode.text)"></div>
              <div class="options-group" :class="{ 'compact-mode': currentNodeId !== tier.rootNode.id }">
                <button
                  v-for="opt in tier.rootNode.options"
                  :key="opt.id"
                  type="button"
                  class="option-pill"
                  :class="getOptionClass(tier.rootNode.id, opt.id)"
                  :ref="el => setOptionRef(el, tier.rootNode.id, opt.id)"
                  :disabled="currentNodeId !== tier.rootNode.id"
                  @click.stop="onOptionClick(opt)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Split Tier (Col 0 and Col 1) -->
          <template v-else-if="tier.type === 'split'">
            <!-- Column 0 (Left) -->
            <div class="branch-col col-0" :class="{ 'wide-col': tier.hasWideCols, 'has-results-group': tier.col0?.type === 'results-pair' }">
              <!-- If Question -->
              <div
                v-if="tier.col0?.type === 'question'"
                class="tree-card question-card branch-question-card"
                :class="[getNodeClass(tier.col0.node.id), { 'is-active-step': currentNodeId === tier.col0.node.id, 'is-dimmed': isNodeDimmed(tier.col0.node.id) }]"
                :ref="el => setNodeRef(el, tier.col0.node.id)"
                @click="onNodeClick(tier.col0.node.id)"
              >
                <div class="card-text" v-html="renderMarkdown(tier.col0.node.text)"></div>
                <div class="options-group" :class="{ 'compact-mode': currentNodeId !== tier.col0.node.id }">
                  <button
                    v-for="opt in tier.col0.node.options"
                    :key="opt.id"
                    type="button"
                    class="option-pill"
                    :class="getOptionClass(tier.col0.node.id, opt.id)"
                    :ref="el => setOptionRef(el, tier.col0.node.id, opt.id)"
                    :disabled="currentNodeId !== tier.col0.node.id"
                    @click.stop="onOptionClick(opt)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- If Single Result -->
              <div
                v-else-if="tier.col0?.type === 'result'"
                class="tree-card result-card single-result-card"
                :class="[getResultClass(tier.col0.node.id), { 'is-dimmed': isNodeDimmed(tier.col0.node.id) }]"
                :ref="el => setNodeRef(el, tier.col0.node.id)"
                @click="onNodeClick(tier.col0.node.id)"
              >
                <div 
                  class="result-badge" 
                  :class="`letter-${getLetterKey(tier.col0.node.label)}`"
                >
                  {{ getResultLetter(tier.col0.node.label) }}
                </div>
                <div class="result-info">
                  <div class="result-verdict">{{ tier.col0.node.label }}</div>
                  <div v-if="tier.col0.node.explanation" class="result-hint">
                    {{ tier.col0.node.explanation }}
                  </div>
                </div>
              </div>

              <!-- If Results Pair -->
              <div
                v-else-if="tier.col0?.type === 'results-pair'"
                class="results-group"
              >
                <div
                  v-for="resNode in tier.col0.results"
                  :key="resNode.id"
                  class="tree-card result-card"
                  :class="[getResultClass(resNode.id), { 'is-dimmed': isNodeDimmed(resNode.id) }]"
                  :ref="el => setNodeRef(el, resNode.id)"
                  @click="onNodeClick(resNode.id)"
                >
                  <div 
                    class="result-badge" 
                    :class="`letter-${getLetterKey(resNode.label)}`"
                  >
                    {{ getResultLetter(resNode.label) }}
                  </div>
                  <div class="result-info">
                    <div class="result-verdict">{{ resNode.label }}</div>
                    <div v-if="resNode.explanation" class="result-hint">
                      {{ resNode.explanation }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- If Mixed Pair (Questions or Results) -->
              <div
                v-else-if="tier.col0?.type === 'pair'"
                class="pair-group"
              >
                <template v-for="(item, idx) in tier.col0.items" :key="idx">
                  <div
                    v-if="item && item.type === 'question'"
                    class="tree-card question-card pair-card"
                    :class="[getNodeClass(item.node.id), { 'is-active-step': currentNodeId === item.node.id, 'is-dimmed': isNodeDimmed(item.node.id) }]"
                    :ref="el => setNodeRef(el, item.node.id)"
                    @click="onNodeClick(item.node.id)"
                  >
                    <div class="card-text" v-html="renderMarkdown(item.node.text)"></div>
                    <div class="options-group" :class="{ 'compact-mode': currentNodeId !== item.node.id }">
                      <button
                        v-for="opt in item.node.options"
                        :key="opt.id"
                        type="button"
                        class="option-pill"
                        :class="getOptionClass(item.node.id, opt.id)"
                        :ref="el => setOptionRef(el, item.node.id, opt.id)"
                        :disabled="currentNodeId !== item.node.id"
                        @click.stop="onOptionClick(opt)"
                      >
                        {{ opt.label }}
                      </button>
                    </div>
                  </div>

                  <div
                    v-else-if="item && item.type === 'result'"
                    class="tree-card result-card pair-card"
                    :class="[getResultClass(item.node.id), { 'is-dimmed': isNodeDimmed(item.node.id) }]"
                    :ref="el => setNodeRef(el, item.node.id)"
                    @click="onNodeClick(item.node.id)"
                  >
                    <div 
                      class="result-badge" 
                      :class="`letter-${getLetterKey(item.node.label)}`"
                    >
                      {{ getResultLetter(item.node.label) }}
                    </div>
                    <div class="result-info">
                      <div class="result-verdict">{{ item.node.label }}</div>
                      <div v-if="item.node.explanation" class="result-hint">
                        {{ item.node.explanation }}
                      </div>
                    </div>
                  </div>

                  <div v-else class="empty-pair-spacer"></div>
                </template>
              </div>

              <!-- Empty Spacer -->
              <div v-else class="empty-col-spacer" :class="{ 'wide-spacer': tier.hasWideCols }"></div>
            </div>

            <!-- Column 1 (Right) -->
            <div class="branch-col col-1" :class="{ 'wide-col': tier.hasWideCols, 'has-results-group': tier.col1?.type === 'results-pair' }">
              <!-- If Question -->
              <div
                v-if="tier.col1?.type === 'question'"
                class="tree-card question-card branch-question-card"
                :class="[getNodeClass(tier.col1.node.id), { 'is-active-step': currentNodeId === tier.col1.node.id, 'is-dimmed': isNodeDimmed(tier.col1.node.id) }]"
                :ref="el => setNodeRef(el, tier.col1.node.id)"
                @click="onNodeClick(tier.col1.node.id)"
              >
                <div class="card-text" v-html="renderMarkdown(tier.col1.node.text)"></div>
                <div class="options-group" :class="{ 'compact-mode': currentNodeId !== tier.col1.node.id }">
                  <button
                    v-for="opt in tier.col1.node.options"
                    :key="opt.id"
                    type="button"
                    class="option-pill"
                    :class="getOptionClass(tier.col1.node.id, opt.id)"
                    :ref="el => setOptionRef(el, tier.col1.node.id, opt.id)"
                    :disabled="currentNodeId !== tier.col1.node.id"
                    @click.stop="onOptionClick(opt)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- If Single Result -->
              <div
                v-else-if="tier.col1?.type === 'result'"
                class="tree-card result-card single-result-card"
                :class="[getResultClass(tier.col1.node.id), { 'is-dimmed': isNodeDimmed(tier.col1.node.id) }]"
                :ref="el => setNodeRef(el, tier.col1.node.id)"
                @click="onNodeClick(tier.col1.node.id)"
              >
                <div 
                  class="result-badge" 
                  :class="`letter-${getLetterKey(tier.col1.node.label)}`"
                >
                  {{ getResultLetter(tier.col1.node.label) }}
                </div>
                <div class="result-info">
                  <div class="result-verdict">{{ tier.col1.node.label }}</div>
                  <div v-if="tier.col1.node.explanation" class="result-hint">
                    {{ tier.col1.node.explanation }}
                  </div>
                </div>
              </div>

              <!-- If Results Pair -->
              <div
                v-else-if="tier.col1?.type === 'results-pair'"
                class="results-group"
              >
                <div
                  v-for="resNode in tier.col1.results"
                  :key="resNode.id"
                  class="tree-card result-card"
                  :class="[getResultClass(resNode.id), { 'is-dimmed': isNodeDimmed(resNode.id) }]"
                  :ref="el => setNodeRef(el, resNode.id)"
                  @click="onNodeClick(resNode.id)"
                >
                  <div 
                    class="result-badge" 
                    :class="`letter-${getLetterKey(resNode.label)}`"
                  >
                    {{ getResultLetter(resNode.label) }}
                  </div>
                  <div class="result-info">
                    <div class="result-verdict">{{ resNode.label }}</div>
                    <div v-if="resNode.explanation" class="result-hint">
                      {{ resNode.explanation }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- If Mixed Pair (Questions or Results) -->
              <div
                v-else-if="tier.col1?.type === 'pair'"
                class="pair-group"
              >
                <template v-for="(item, idx) in tier.col1.items" :key="idx">
                  <div
                    v-if="item && item.type === 'question'"
                    class="tree-card question-card pair-card"
                    :class="[getNodeClass(item.node.id), { 'is-active-step': currentNodeId === item.node.id, 'is-dimmed': isNodeDimmed(item.node.id) }]"
                    :ref="el => setNodeRef(el, item.node.id)"
                    @click="onNodeClick(item.node.id)"
                  >
                    <div class="card-text" v-html="renderMarkdown(item.node.text)"></div>
                    <div class="options-group" :class="{ 'compact-mode': currentNodeId !== item.node.id }">
                      <button
                        v-for="opt in item.node.options"
                        :key="opt.id"
                        type="button"
                        class="option-pill"
                        :class="getOptionClass(item.node.id, opt.id)"
                        :ref="el => setOptionRef(el, item.node.id, opt.id)"
                        :disabled="currentNodeId !== item.node.id"
                        @click.stop="onOptionClick(opt)"
                      >
                        {{ opt.label }}
                      </button>
                    </div>
                  </div>

                  <div
                    v-else-if="item && item.type === 'result'"
                    class="tree-card result-card pair-card"
                    :class="[getResultClass(item.node.id), { 'is-dimmed': isNodeDimmed(item.node.id) }]"
                    :ref="el => setNodeRef(el, item.node.id)"
                    @click="onNodeClick(item.node.id)"
                  >
                    <div 
                      class="result-badge" 
                      :class="`letter-${getLetterKey(item.node.label)}`"
                    >
                      {{ getResultLetter(item.node.label) }}
                    </div>
                    <div class="result-info">
                      <div class="result-verdict">{{ item.node.label }}</div>
                      <div v-if="item.node.explanation" class="result-hint">
                        {{ item.node.explanation }}
                      </div>
                    </div>
                  </div>

                  <div v-else class="empty-pair-spacer"></div>
                </template>
              </div>

              <!-- Empty Spacer -->
              <div v-else class="empty-col-spacer" :class="{ 'wide-spacer': tier.hasWideCols }"></div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: true, linkify: true, breaks: true })

const props = defineProps({
  rule: {
    type: Object,
    required: true
  },
  currentNodeId: {
    type: String,
    required: true
  },
  history: {
    type: Array,
    default: () => []
  },
  successOptionId: {
    type: String,
    default: null
  },
  errorOptionId: {
    type: String,
    default: null
  },
  // Configurable orientation in code: 'vertical' (default) or 'horizontal'
  forcedOrientation: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['node-click', 'option-click'])

// Resolved orientation (vertical by default, architectural hook for horizontal)
const orientation = computed(() => {
  return props.forcedOrientation || props.rule?.orientation || 'vertical'
})

// Elements & refs
const boardRef = ref(null)
const nodeRefs = ref(new Map())
const optionRefs = ref(new Map())

const setNodeRef = (el, id) => {
  if (el) nodeRefs.value.set(id, el)
  else nodeRefs.value.delete(id)
}

const setOptionRef = (el, nodeId, optId) => {
  const key = `${nodeId}__${optId}`
  if (el) optionRefs.value.set(key, el)
  else optionRefs.value.delete(key)
}

// Markdown helper
const renderMarkdown = (text) => {
  if (!text) return ''
  return md.renderInline(text)
}

// Node Map
const nodeMap = computed(() => {
  const map = new Map()
  if (props.rule && props.rule.nodes) {
    for (const n of props.rule.nodes) {
      map.set(n.id, n)
    }
  }
  return map
})

// Build Tier-Aligned Structure for any Archetype (Symmetric or Asymmetric)
const layoutTiers = computed(() => {
  if (!props.rule || !props.rule.start_node || !props.rule.nodes) return []
  
  const map = nodeMap.value
  const root = map.get(props.rule.start_node)
  if (!root) return []

  // Archetype 1: Lesson 13 (Cascading prefix rule with dead-end strong position exit)
  if (props.rule.start_node === 'q_sound_z_s') {
    const q1 = root
    const q2 = map.get('q_single_letter')
    const q3 = map.get('q_next_sound')
    const rSingleS = map.get('r_single_s')
    const rZ = map.get('r_z')
    const rS = map.get('r_s')
    const rStrong = map.get('r_strong_pos')

    return [
      {
        id: 'tier-0',
        type: 'root',
        rootNode: q1
      },
      {
        id: 'tier-1',
        type: 'split',
        col0: { type: 'question', node: q2 },
        col1: { type: 'result', node: rStrong }
      },
      {
        id: 'tier-2',
        type: 'split',
        col0: { type: 'result', node: rSingleS },
        col1: { type: 'question', node: q3 }
      },
      {
        id: 'tier-3',
        type: 'split',
        col0: null,
        col1: { type: 'results-pair', results: [rZ, rS] }
      }
    ]
  }

  // Archetype 3: Lesson 5 (Dual-cascading binary tree with 5 tiers, 'q_in_root')
  if (props.rule.start_node === 'q_in_root') {
    const qRoot = root
    const qRootE = map.get('q_root_e')
    const qRootExc = map.get('q_root_exception')
    const qSuffixYn = map.get('q_suffix_yn')
    const qNounPlural = map.get('q_noun_plural')
    const qAdjEnding = map.get('q_adj_ending')

    const rRootE = map.get('r_root_e')
    const rRootExcY = map.get('r_root_exception_y')
    const rRootI = map.get('r_root_i')
    const rSuffixYnY = map.get('r_suffix_yn_y')
    const rNounPluralY = map.get('r_noun_plural_y')
    const rAdjEndingY = map.get('r_adj_ending_y')
    const rOtherI = map.get('r_other_i')

    return [
      {
        id: 'tier-0',
        type: 'root',
        rootNode: qRoot
      },
      {
        id: 'tier-1',
        type: 'split',
        hasWideCols: true,
        col0: { type: 'question', node: qRootE },
        col1: { type: 'question', node: qSuffixYn }
      },
      {
        id: 'tier-2',
        type: 'split',
        hasWideCols: true,
        col0: {
          type: 'pair',
          items: [
            { type: 'result', node: rRootE },
            { type: 'question', node: qRootExc }
          ]
        },
        col1: {
          type: 'pair',
          items: [
            { type: 'result', node: rSuffixYnY },
            { type: 'question', node: qNounPlural }
          ]
        }
      },
      {
        id: 'tier-3',
        type: 'split',
        hasWideCols: true,
        col0: {
          type: 'pair',
          items: [
            { type: 'result', node: rRootExcY },
            { type: 'result', node: rRootI }
          ]
        },
        col1: {
          type: 'pair',
          items: [
            { type: 'result', node: rNounPluralY },
            { type: 'question', node: qAdjEnding }
          ]
        }
      },
      {
        id: 'tier-4',
        type: 'split',
        hasWideCols: true,
        col0: null,
        col1: {
          type: 'pair',
          items: [
            { type: 'result', node: rAdjEndingY },
            { type: 'result', node: rOtherI }
          ]
        }
      }
    ]
  }

  // Archetype 2: Lesson 4 (Symmetric binary tree with 2 branches and 4 terminal results)
  const branches = []
  if (root.options && Array.isArray(root.options)) {
    for (const opt of root.options) {
      if (!opt.next) continue
      const qNode = map.get(opt.next)
      if (!qNode) continue

      const results = []
      if (qNode.options && Array.isArray(qNode.options)) {
        for (const childOpt of qNode.options) {
          if (!childOpt.next) continue
          const resNode = map.get(childOpt.next)
          if (resNode) {
            results.push(resNode)
          }
        }
      }

      branches.push({
        rootOption: opt,
        question: qNode,
        results
      })
    }
  }

  return [
    {
      id: 'tier-0',
      type: 'root',
      rootNode: root
    },
    {
      id: 'tier-1',
      type: 'split',
      col0: { type: 'question', node: branches[0]?.question },
      col1: { type: 'question', node: branches[1]?.question }
    },
    {
      id: 'tier-2',
      type: 'split',
      col0: { type: 'results-pair', results: branches[0]?.results },
      col1: { type: 'results-pair', results: branches[1]?.results }
    }
  ]
})

// Visited history sets
const visitedNodeIds = computed(() => {
  const ids = new Set()
  if (props.history) {
    for (const item of props.history) {
      if (item.node && item.node.id) ids.add(item.node.id)
    }
  }
  return ids
})

const visitedOptionKeys = computed(() => {
  const keys = new Set()
  if (props.history) {
    for (const item of props.history) {
      if (item.node && item.option) {
        keys.add(`${item.node.id}__${item.option.id}`)
      }
    }
  }
  return keys
})

// Graph-Agnostic Reachability Helper for Dimming
const isReachable = (startId, targetId, visited = new Set()) => {
  if (startId === targetId) return true
  if (visited.has(startId)) return false
  visited.add(startId)

  const n = nodeMap.value.get(startId)
  if (!n || !n.options) return false

  for (const opt of n.options) {
    if (opt.next && isReachable(opt.next, targetId, visited)) {
      return true
    }
  }
  return false
}

// Universal dimming logic: dims any node bypassed by previous user decisions
const isNodeDimmed = (nodeId) => {
  if (!props.history || props.history.length === 0) return false
  if (nodeId === props.currentNodeId || visitedNodeIds.value.has(nodeId)) return false

  for (const step of props.history) {
    if (!step.node || !step.option) continue

    const parentNode = nodeMap.value.get(step.node.id)
    if (!parentNode || !parentNode.options) continue

    for (const opt of parentNode.options) {
      if (opt.id !== step.option.id && opt.next) {
        if (isReachable(opt.next, nodeId)) {
          return true
        }
      }
    }
  }

  return false
}

// Node classes
const getNodeClass = (nodeId) => {
  const isCurrent = nodeId === props.currentNodeId
  const isVisited = visitedNodeIds.value.has(nodeId)
  return {
    'is-current': isCurrent,
    'is-visited': isVisited && !isCurrent
  }
}

const getResultClass = (nodeId) => {
  const isCurrent = nodeId === props.currentNodeId
  const isVisited = visitedNodeIds.value.has(nodeId)
  return {
    'is-current-result': isCurrent,
    'is-visited-result': isVisited
  }
}

// Option classes (Clean Color Semantics: No Red on "No"!)
const getOptionClass = (nodeId, optionId) => {
  const key = `${nodeId}__${optionId}`
  const isSelected = visitedOptionKeys.value.has(key)
  const isSuccess = props.successOptionId === optionId
  const isError = props.errorOptionId === optionId

  return {
    'is-selected': isSelected,
    'is-success': isSuccess,
    'is-error': isError
  }
}

// Letter Badge Extractors
const getResultLetter = (label) => {
  if (!label) return '?'
  const lower = label.toLowerCase()
  if (lower.includes('сильн') || lower.includes('по слуху')) return 'З/С'
  const match = label.match(/Пишем\s+([А-ЯЁ\-])/i) || label.match(/([А-ЯЁ])(?:\s|$)/)
  if (match) return match[1].toUpperCase()
  return label.charAt(0).toUpperCase()
}

const getLetterKey = (label) => {
  const letter = getResultLetter(label)
  if (letter === 'З/С') return 'zs'
  if (letter === '✓') return 'strong-pos'
  if (letter === 'Е') return 'e'
  if (letter === 'Ё' || letter === 'З' || letter === 'Ь' || letter === 'И') return 'left-primary'
  return 'right-secondary'
}

// Clicks
const onNodeClick = (nodeId) => {
  emit('node-click', nodeId)
}

const onOptionClick = (opt) => {
  emit('option-click', opt)
}

// Canvas size for SVG overlay
const svgWidth = ref(1000)
const svgHeight = ref(800)

// Dynamic Arrow calculations
const arrows = ref([])

/**
 * Generates an orthogonal smooth-step path (SmoothStepEdge) with rounded corners.
 * Guarantees a strictly perpendicular 90° entry into the top center of the target card.
 */
const getSmoothStepPath = (startX, startY, endX, endY, radius = 10) => {
  // If almost straight vertical
  if (Math.abs(endX - startX) < 6) {
    return `M ${startX} ${startY + 2} L ${endX} ${endY - 4}`
  }

  const midY = startY + (endY - startY) * 0.5
  const dirX = endX > startX ? 1 : -1
  const r = Math.min(radius, Math.abs(endX - startX) * 0.5, Math.abs(endY - startY) * 0.4)

  return [
    `M ${startX} ${startY + 2}`,
    `L ${startX} ${midY - r}`,
    `Q ${startX} ${midY} ${startX + dirX * r} ${midY}`,
    `L ${endX - dirX * r} ${midY}`,
    `Q ${endX} ${midY} ${endX} ${midY + r}`,
    `L ${endX} ${endY - 4}`
  ].join(' ')
}

const updateArrows = () => {
  if (!boardRef.value || !props.rule || !props.rule.nodes) return

  const boardEl = boardRef.value
  const boardRect = boardEl.getBoundingClientRect()
  
  // Update SVG canvas dimensions to cover full scrollable area
  svgWidth.value = Math.max(boardEl.scrollWidth, boardEl.clientWidth, 750)
  svgHeight.value = Math.max(boardEl.scrollHeight, boardEl.clientHeight, 450)

  const newArrows = []

  for (const node of props.rule.nodes) {
    if (!node.options || !Array.isArray(node.options)) continue

    for (const opt of node.options) {
      if (!opt.next) continue

      const optKey = `${node.id}__${opt.id}`
      const optEl = optionRefs.value.get(optKey)
      const targetEl = nodeRefs.value.get(opt.next)

      if (!optEl || !targetEl) continue

      const optRect = optEl.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()

      const isPassed = visitedOptionKeys.value.has(optKey)
      const isActiveBranch = node.id === props.currentNodeId

      // Color semantics according to UI standards:
      // Passed correct path = solid emerald green 2.5px (#10b981)
      // Active available path = solid neutral-indigo 2px (#6366f1)
      // Inactive/unvisited = solid distinct slate 2px (#94a3b8)
      let stroke = '#94a3b8'
      let strokeWidth = 2
      let markerEnd = 'url(#arrow-neutral)'

      if (isPassed) {
        stroke = '#10b981'
        strokeWidth = 2.5
        markerEnd = 'url(#arrow-success)'
      } else if (isActiveBranch) {
        stroke = '#6366f1'
        strokeWidth = 2
        markerEnd = 'url(#arrow-active)'
      }

      // Vertical calculation:
      // Start at bottom-center of the option button
      const startX = optRect.left + optRect.width / 2 - boardRect.left + boardEl.scrollLeft
      const startY = optRect.bottom - boardRect.top + boardEl.scrollTop
      // End at top-center of the target node
      const endX = targetRect.left + targetRect.width / 2 - boardRect.left + boardEl.scrollLeft
      const endY = targetRect.top - boardRect.top + boardEl.scrollTop

      const d = getSmoothStepPath(startX, startY, endX, endY, 10)

      newArrows.push({
        id: `arrow_${optKey}_to_${opt.next}`,
        d,
        stroke,
        strokeWidth,
        dashArray: 'none', // All arrows solid per Nielsen & block-diagram standards
        markerEnd,
        isActive: isActiveBranch,
        isPassed
      })
    }
  }

  arrows.value = newArrows
}

// Lifecycle and observers
let resizeObserver = null

onMounted(() => {
  nextTick(() => {
    updateArrows()

    if (boardRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateArrows()
      })
      resizeObserver.observe(boardRef.value)
    }

    window.addEventListener('resize', updateArrows)
  })
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', updateArrows)
})

watch(
  () => [props.currentNodeId, props.history, props.successOptionId, props.errorOptionId],
  () => {
    nextTick(() => {
      updateArrows()
    })
  },
  { deep: true }
)
</script>

<style scoped>
.binary-layout-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.binary-board {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 1.5rem 1rem 2.5rem;
  box-sizing: border-box;
  overflow-x: auto;
}

.binary-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.tree-arrow {
  transition: stroke 0.2s ease, stroke-width 0.2s ease;
}

/* Tier-Aligned Container: Compact 2.25rem spacing between tiers */
.binary-tree-levels {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.25rem;
  position: relative;
  z-index: 2;
}

/* Level Common */
.tree-level {
  display: flex;
  justify-content: center;
  width: 100%;
  align-items: stretch;
  gap: 2.5rem;
}

/* Root Tier */
.root-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.root-card {
  width: 320px;
  max-width: 350px;
}

/* Branch Columns: 320px width across standard tiers, 500px for wide pairs */
.branch-col {
  width: 320px;
  display: flex;
  transition: opacity 0.25s ease;
  box-sizing: border-box;
}

.branch-col.wide-col {
  width: 500px;
}

.branch-col.wide-col .branch-question-card {
  width: 320px;
  margin: 0 auto;
}

.branch-col.is-dimmed {
  opacity: 0.35;
}

.branch-col.is-dimmed:hover {
  opacity: 0.85;
}

.branch-question-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.single-result-card {
  width: 100%;
  max-width: 260px;
  margin: 0 auto;
  align-self: center;
}

.results-group {
  width: 380px;
  max-width: 100%;
  display: flex;
  gap: 12px;
  align-items: stretch;
  box-sizing: border-box;
}

.branch-col.has-results-group {
  width: 380px;
}

.pair-group {
  width: 100%;
  display: flex;
  gap: 12px;
  align-items: stretch;
  box-sizing: border-box;
}

.pair-card {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.pair-card.result-card {
  align-self: center;
  height: auto;
  max-height: 56px;
  flex: 1 1 0;
  flex-direction: row;
}

.empty-pair-spacer {
  flex: 1 1 0;
  visibility: hidden;
}

.empty-col-spacer {
  width: 320px;
  visibility: hidden;
}

.empty-col-spacer.wide-spacer {
  width: 500px;
}

/* Card Common */
.tree-card {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.65rem 0.95rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  box-sizing: border-box;
}

/* Question Card */
.question-card {
  text-align: center;
}

.question-card.is-active-step {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12), 0 4px 10px rgba(79, 70, 229, 0.08);
  padding: 0.8rem 1.05rem;
}

.question-card.is-visited {
  border-color: #10b981;
  background: #f0fdf4;
}

.card-text {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.35;
  color: #1e293b;
  margin-bottom: 0.65rem;
}

/* Options Group: Full buttons when active, compact pills when context */
.options-group {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.option-pill {
  flex: 1;
  min-width: 70px;
  padding: 0.45rem 0.6rem;
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 6px;
  border: 1.5px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}

.options-group.compact-mode .option-pill {
  padding: 0.25rem 0.45rem;
  font-size: 0.75rem;
  min-width: 60px;
}

/* Active Node Hover: Soft Indigo Accent (No Red on "No"!) */
.option-pill:hover:not(:disabled) {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #f5f3ff;
}

.option-pill:disabled {
  cursor: default;
  opacity: 0.9;
}

/* Passed Correct Choice: Positive Emerald Green for any correct path! */
.option-pill.is-selected {
  background: #10b981;
  border-color: #10b981;
  color: #ffffff;
}

.option-pill.is-error {
  animation: shake 0.35s ease-in-out;
  border-color: #ef4444;
  background: #fee2e2;
  color: #b91c1c;
}

.option-pill.is-success {
  border-color: #10b981;
  background: #d1fae5;
  color: #065f46;
}

/* Result Card: Solid border, horizontal compact layout with letter badge */
.result-card {
  align-self: center;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc; /* Tinted background! Distinct from pure-white questions */
  border: 1.5px solid #cbd5e1; /* Solid border! Not dashed */
  border-radius: 10px;
  box-sizing: border-box;
  text-align: left;
  transition: all 0.2s ease;
}

.result-card.is-dimmed {
  opacity: 0.35;
}

.result-card.is-dimmed:hover {
  opacity: 0.85;
}

.result-card.is-current-result {
  border-color: #10b981;
  background: #f0fdf4;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2), 0 4px 12px rgba(16, 185, 129, 0.12);
}

.result-card.is-visited-result {
  border-color: #10b981;
  background: #f0fdf4;
}

/* Letter Badge */
.result-badge {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  font-weight: 800;
  border: 1.5px solid;
}

.result-badge.letter-left-primary {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #2563eb;
}

.result-badge.letter-right-secondary {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #475569;
}

.result-badge.letter-strong-pos,
.result-badge.letter-zs {
  background: #f0fdf4;
  border-color: #86efac;
  color: #16a34a;
}

.result-badge.letter-zs {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.result-badge.letter-e {
  background: #fdf4ff;
  border-color: #f0abfc;
  color: #c026d3;
}

.result-card.is-current-result .result-badge,
.result-card.is-visited-result .result-badge {
  background: #10b981;
  border-color: #10b981;
  color: #ffffff;
}

.result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.result-verdict {
  font-size: 0.9rem;
  font-weight: 750;
  color: #0f172a;
  line-height: 1.25;
}

.result-card.is-current-result .result-verdict,
.result-card.is-visited-result .result-verdict {
  color: #15803d;
}

.result-hint {
  font-size: 0.73rem;
  color: #64748b;
  margin-top: 0.15rem;
  line-height: 1.25;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
</style>
