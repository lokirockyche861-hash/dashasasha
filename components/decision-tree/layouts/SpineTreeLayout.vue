<template>
  <div class="spine-layout" ref="containerRef">
    <!-- SVG Overlay for Arrows -->
    <svg class="overlay-svg">
      <defs>
        <marker id="arrowhead" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
          <polygon points="0 0, 7 3.5, 0 7" fill="#94a3b8" />
        </marker>
        <marker id="arrowhead-active" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
          <polygon points="0 0, 7 3.5, 0 7" fill="#4f46e5" />
        </marker>
      </defs>
      <path 
        v-for="arrow in arrows" 
        :key="arrow.id"
        :d="arrow.d"
        fill="none"
        :stroke="arrow.isActive ? '#4f46e5' : '#94a3b8'"
        stroke-width="2"
        :marker-end="arrow.isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'"
        class="arrow-path"
      />
    </svg>

    <div class="spine-container">
      <div 
        v-for="(row, index) in rows" 
        :key="row.question.id"
        class="spine-row"
      >
        <!-- Left Side: Yes Result -->
        <div class="side-cell left">
          <div 
            v-if="row.yesResult" 
            class="result-node"
            :ref="el => setNodeRef(el, getResultRefKey(row.question.id, 'yes'))"
            :class="getResultClass(row.yesResult.id, row.question.id)"
            @click="onNodeClick(row.yesResult.id)"
          >
            <div class="node-label">{{ row.yesResult.label }}</div>
          </div>
        </div>

        <!-- Center: Question -->
        <div class="center-cell">
          <div 
            class="question-node"
            :ref="el => setNodeRef(el, row.question.id)"
            :class="getNodeClass(row.question.id)"
            @click="onNodeClick(row.question.id)"
          >
            <div class="node-text" v-html="renderMarkdown(row.question.text)"></div>
            
            <div class="options-bar">
              <div 
                v-if="row.yesOption"
                class="option-btn yes"
                :class="getOptionClass(row.question.id, row.yesOption.id)"
                @click.stop="onOptionClick(row.question, row.yesOption.id)"
              >
                {{ row.yesOption.label }}
              </div>
              <div 
                v-if="row.noOption"
                class="option-btn no"
                :class="getOptionClass(row.question.id, row.noOption.id)"
                @click.stop="onOptionClick(row.question, row.noOption.id)"
              >
                {{ row.noOption.label }}
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: No Result (Only for last node usually) -->
        <div class="side-cell right">
          <div 
            v-if="row.noResult" 
            class="result-node"
            :ref="el => setNodeRef(el, getResultRefKey(row.question.id, 'no'))"
            :class="getResultClass(row.noResult.id, row.question.id)"
            @click="onNodeClick(row.noResult.id)"
          >
             <div class="node-label">{{ row.noResult.label }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: true, linkify: true, breaks: true })

const props = defineProps({
  rule: {
    type: Object,
    required: true
  },
  currentNodeId: {
    type: String,
    default: null
  },
  history: {
    type: Array, // [{node, option}]
    default: () => []
  },
  successOptionId: {
    type: String,
    default: null
  },
  errorOptionId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['node-click', 'option-click'])

// Refs
const containerRef = ref(null)
const nodeRefs = new Map()
const arrows = ref([])
let resizeObserver = null

const setNodeRef = (el, id) => {
  if (el) {
    nodeRefs.set(id, el)
  } else {
    nodeRefs.delete(id)
  }
}

const getResultRefKey = (questionId, type) => {
  return `${questionId}_${type}_result`
}

const renderMarkdown = (text) => {
  if (!text) return ''
  return md.render(text)
}

// Helper to build the "Spine" rows
const rows = computed(() => {
  if (!props.rule || !props.rule.start_node) return []
  
  const nodesMap = new Map(props.rule.nodes.map(n => [n.id, n]))
  const result = []
  
  let currentId = props.rule.start_node
  let visited = new Set()

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const node = nodesMap.get(currentId)
    
    if (!node || node.type !== 'question') break

    // Find Yes/No options explicitly by suffix or label
    // New data format uses IDs like "q1_op_yes", old used "yes"
    const yesOpt = node.options.find(o => o.id === 'yes' || o.id.endsWith('_yes') || o.label === 'Да')
    const noOpt = node.options.find(o => o.id === 'no' || o.id.endsWith('_no') || o.label === 'Нет')

    const row = {
      question: node,
      yesResult: null,
      noResult: null,
      yesOption: yesOpt,
      noOption: noOpt,
      isLast: false,
      nextId: null
    }

    // Check Yes path
    if (yesOpt) {
      const nextNode = nodesMap.get(yesOpt.next)
      if (nextNode && nextNode.type === 'result') {
        row.yesResult = nextNode
      }
    }

    // Check No path
    if (noOpt) {
      const nextNode = nodesMap.get(noOpt.next)
      if (nextNode) {
        if (nextNode.type === 'result') {
          row.noResult = nextNode
          row.isLast = true
          row.nextId = nextNode.id
          currentId = null 
        } else {
          row.nextId = nextNode.id
          currentId = nextNode.id
        }
      } else {
        currentId = null
      }
    } else {
      currentId = null
    }

    result.push(row)
  }
  
  if (result.length > 0) {
    result[result.length - 1].isLast = true
  }

  return result
})

const getNextNodeId = (row) => {
  return row.nextId
}

// Arrow Calculation Logic
const updateArrows = () => {
  if (!containerRef.value) return
  
  const containerRect = containerRef.value.getBoundingClientRect()
  const newArrows = []

  rows.value.forEach(row => {
    const questionEl = nodeRefs.get(row.question.id)
    if (!questionEl) return

    const qRect = questionEl.getBoundingClientRect()
    const gap = 4
    
    // 1. Yes Arrow (Left)
    if (row.yesResult) {
      const resultEl = nodeRefs.get(getResultRefKey(row.question.id, 'yes'))
      if (resultEl) {
        const rRect = resultEl.getBoundingClientRect()
        
        // Start: Left Center of Question
        const startX = qRect.left - containerRect.left
        const startY = qRect.top + qRect.height / 2 - containerRect.top
        
        // End: Right Center of Result
        const endX = rRect.right - containerRect.left
        const endY = rRect.top + rRect.height / 2 - containerRect.top

        newArrows.push({
          id: `arrow-${row.question.id}-yes`,
          d: `M ${startX - gap} ${startY} L ${endX + gap} ${endY}`,
          isActive: isPathActive(row.question.id, row.yesResult.id)
        })
      }
    }

    // 2. No Arrow (Down or Right)
    const nextId = row.nextId
    if (nextId) {
      let nextEl = nodeRefs.get(nextId)
      let isRightResult = false

      if (row.noResult && row.noResult.id === nextId) {
         nextEl = nodeRefs.get(getResultRefKey(row.question.id, 'no'))
         isRightResult = true
      }

      if (nextEl) {
        const nRect = nextEl.getBoundingClientRect()
        
        if (isRightResult) {
          // Arrow to Right Result
          // Start: Right Center of Question
          const startX = qRect.right - containerRect.left
          const startY = qRect.top + qRect.height / 2 - containerRect.top
          
          // End: Left Center of Result
          const endX = nRect.left - containerRect.left
          const endY = nRect.top + nRect.height / 2 - containerRect.top
          
          newArrows.push({
            id: `arrow-${row.question.id}-no`,
            d: `M ${startX + gap} ${startY} L ${endX - gap} ${endY}`,
            isActive: isPathActive(row.question.id, nextId)
          })

        } else {
          // Standard Arrow Down (to next Question)
          // Start: Bottom Center of Question
          const startX = qRect.left + qRect.width / 2 - containerRect.left
          const startY = qRect.bottom - containerRect.top
          
          // End: Top Center of Next Node
          const endX = nRect.left + nRect.width / 2 - containerRect.left
          const endY = nRect.top - containerRect.top

          newArrows.push({
            id: `arrow-${row.question.id}-no`,
            d: `M ${startX} ${startY + gap} L ${endX} ${endY - gap}`,
            isActive: isPathActive(row.question.id, nextId)
          })
        }
      }
    }
  })

  arrows.value = newArrows
}

// Watchers and Lifecycle
watch(() => props.history, updateArrows, { deep: true })
watch(rows, () => {
  nextTick(updateArrows)
})

onMounted(() => {
  updateArrows()
  // Observe container resize
  resizeObserver = new ResizeObserver(() => {
    updateArrows()
  })
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
  window.addEventListener('resize', updateArrows)
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', updateArrows)
})


// --- Class Helpers ---

const getNodeClass = (nodeId) => {
  const isActive = props.currentNodeId === nodeId
  const isPassed = props.history.some(step => step.node.id === nodeId)
  return { 'is-active': isActive, 'is-passed': isPassed }
}

const getResultClass = (resultNodeId, parentQuestionId) => {
  let isActive = false
  let isPassed = false

  if (props.currentNodeId === resultNodeId) {
    const lastStep = props.history[props.history.length - 1]
    if (lastStep && lastStep.node.id === parentQuestionId) {
      isActive = true
    }
  }

  isPassed = props.history.some(step => 
    step.node.id === parentQuestionId && step.option.next === resultNodeId
  )

  return { 'is-active': isActive, 'is-passed': isPassed }
}

const getOptionClass = (nodeId, optionId) => {
  const historyStep = props.history.find(step => step.node.id === nodeId)
  const isSelected = historyStep && historyStep.option.id === optionId
  const isCurrentNode = props.currentNodeId === nodeId
  const isSuccess = isCurrentNode && props.successOptionId === optionId
  const isError = isCurrentNode && props.errorOptionId === optionId

  return { 'is-selected': isSelected, 'is-success': isSuccess, 'is-error': isError }
}

const getOptionLabel = (node, optionId) => {
  const opt = node.options.find(o => o.id === optionId)
  return opt ? opt.label : optionId
}

const isPathActive = (fromNodeId, toNodeId) => {
  return props.history.some(step => 
    step.node.id === fromNodeId && step.option.next === toNodeId
  )
}

const onNodeClick = (nodeId) => {
  emit('node-click', nodeId)
}

const onOptionClick = (node, optionId) => {
  const option = node.options.find(o => o.id === optionId)
  if (option) {
    emit('option-click', option)
  }
}
</script>

<style scoped>
.spine-layout {
  width: 100%;
  min-height: 100%;
  background: #f8fafc;
  padding: 2rem;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  position: relative; /* Context for absolute SVG */
}

.overlay-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let clicks pass through */
  z-index: 1; /* Above background, below nodes */
}

.spine-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1200px; /* Increased max-width to allow horizontal spread */
  position: relative;
  z-index: 2; /* Nodes above SVG */
}

.spine-row {
  display: flex;
  align-items: center; 
  width: 100%;
  margin-bottom: 3rem; /* Reverted to 3rem */
  gap: 3rem; /* Added horizontal gap between columns */
  position: relative;
}

.center-cell {
  flex: 2; /* Flexible width */
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-width: 200px;
}

.side-cell {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 120px;
}

.side-cell.left {
  justify-content: flex-end;
}

.side-cell.right {
  justify-content: flex-start;
}

/* Nodes */
.question-node {
  width: 100%;
  /* Adaptive width logic: 
     Base width ~320px, but can grow/shrink.
     Using max-width: 400px to prevent it from getting too wide on huge screens,
     but allowing it to be smaller.
  */
  max-width: 400px; 
  min-width: 250px;
  background: #e2e8f0;
  color: #94a3b8;
  border-radius: 8px;
  padding: 0.8rem;
  text-align: center;
  transition: all 0.3s;
  border: 2px solid transparent;
  font-size: 0.9rem;
}

.question-node.is-active {
  background: #a5b4fc;
  color: #1e293b;
  border-color: #4f46e5;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: scale(1.02);
}

.question-node.is-passed {
  background: #e0e7ff;
  color: #4338ca;
  border-color: #c7d2fe;
}

.result-node {
  background: #e2e8f0;
  color: #94a3b8;
  padding: 0.8rem;
  border-radius: 8px;
  min-width: 100px;
  text-align: center;
  font-weight: bold;
  font-size: 0.9rem;
  cursor: default;
  transition: all 0.3s;
}

.result-node.is-active {
  background: #22c55e;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: scale(1.05);
}

.result-node.is-passed {
  background: #86efac;
  color: #14532d;
}

/* Options Bar */
.options-bar {
  display: flex;
  margin-top: 0.5rem;
  gap: 4px;
}

.option-btn {
  flex: 1;
  padding: 4px 0;
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  text-transform: uppercase;
  transition: all 0.2s;
  border-radius: 4px;
  background: #cbd5e1;
  color: #475569;
}

.question-node.is-active .option-btn.yes {
  background: #86efac;
  color: #14532d;
}

.question-node.is-active .option-btn.no {
  background: #fef08a;
  color: #713f12;
}

.option-btn:hover {
  filter: brightness(0.95);
}

.option-btn.is-selected {
  filter: brightness(0.85);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

.option-btn.is-success {
  background: #22c55e !important;
  color: white !important;
}

.option-btn.is-error {
  background: #ef4444 !important;
  color: white !important;
}

.node-text :deep(p) {
  margin: 0;
}

.arrow-path {
  transition: stroke 0.3s;
}
</style>
