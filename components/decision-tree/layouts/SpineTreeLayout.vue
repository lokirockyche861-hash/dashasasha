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
        :class="{ 'is-last-row': row.isLast }"
      >
        <div class="spine-main-row">
          <!-- Left Side: Result (direction === 'left') -->
          <div class="side-cell left">
            <div 
              v-if="row.leftResult" 
              class="result-node"
              :ref="el => setNodeRef(el, getResultRefKey(row.question.id, 'left'))"
              :class="getResultClass(row.leftResult.id, row.question.id)"
              @click="onNodeClick(row.leftResult.id)"
            >
              <div class="node-label">{{ row.leftResult.label }}</div>
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

          <!-- Right Side: Result (direction === 'right') -->
          <div class="side-cell right">
            <div 
              v-if="row.rightResult" 
              class="result-node"
              :ref="el => setNodeRef(el, getResultRefKey(row.question.id, 'right'))"
              :class="getResultClass(row.rightResult.id, row.question.id)"
              @click="onNodeClick(row.rightResult.id)"
            >
               <div class="node-label">{{ row.rightResult.label }}</div>
            </div>
          </div>
        </div>

        <!-- Bottom Results (left-under / right-under) -->
        <div v-if="row.leftUnderResult || row.rightUnderResult" class="bottom-results-row">
          <div 
            v-if="row.leftUnderResult" 
            class="result-node bottom-result left-under"
            :ref="el => setNodeRef(el, getResultRefKey(row.question.id, 'left-under'))"
            :class="getResultClass(row.leftUnderResult.id, row.question.id)"
            @click="onNodeClick(row.leftUnderResult.id)"
          >
            <div class="node-label">{{ row.leftUnderResult.label }}</div>
          </div>

          <div 
            v-if="row.rightUnderResult" 
            class="result-node bottom-result right-under"
            :ref="el => setNodeRef(el, getResultRefKey(row.question.id, 'right-under'))"
            :class="getResultClass(row.rightUnderResult.id, row.question.id)"
            @click="onNodeClick(row.rightUnderResult.id)"
          >
            <div class="node-label">{{ row.rightUnderResult.label }}</div>
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

const resolveDirection = (opt, targetNode, isYes, isLast) => {
  if (opt?.direction) return opt.direction
  if (targetNode?.direction) return targetNode.direction
  if (isLast) {
    return isYes ? 'left-under' : 'right-under'
  }
  return isYes ? 'left' : 'right'
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
    const yesOpt = node.options.find(o => o.id === 'yes' || o.id.endsWith('_yes') || o.label === 'Да')
    const noOpt = node.options.find(o => o.id === 'no' || o.id.endsWith('_no') || o.label === 'Нет')

    const nextForNo = noOpt ? nodesMap.get(noOpt.next) : null
    const isLast = !nextForNo || nextForNo.type === 'result'

    const row = {
      question: node,
      yesOption: yesOpt,
      noOption: noOpt,
      isLast: isLast,
      nextId: null,
      leftResult: null,
      rightResult: null,
      leftUnderResult: null,
      rightUnderResult: null
    }

    // Check Yes path
    if (yesOpt) {
      const nextNode = nodesMap.get(yesOpt.next)
      if (nextNode && nextNode.type === 'result') {
        const dir = resolveDirection(yesOpt, nextNode, true, isLast)
        if (dir === 'left') row.leftResult = nextNode
        else if (dir === 'left-under') row.leftUnderResult = nextNode
        else if (dir === 'right-under') row.rightUnderResult = nextNode
        else if (dir === 'right') row.rightResult = nextNode
      }
    }

    // Check No path
    if (noOpt) {
      const nextNode = nodesMap.get(noOpt.next)
      if (nextNode) {
        if (nextNode.type === 'result') {
          const dir = resolveDirection(noOpt, nextNode, false, isLast)
          if (dir === 'right-under') row.rightUnderResult = nextNode
          else if (dir === 'left-under') row.leftUnderResult = nextNode
          else if (dir === 'right') row.rightResult = nextNode
          else if (dir === 'left') row.leftResult = nextNode
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

    // 1. Left Result Arrow (horizontal left)
    if (row.leftResult) {
      const resultEl = nodeRefs.get(getResultRefKey(row.question.id, 'left'))
      if (resultEl) {
        const rRect = resultEl.getBoundingClientRect()
        const startX = qRect.left - containerRect.left
        const startY = qRect.top + qRect.height / 2 - containerRect.top
        const endX = rRect.right - containerRect.left
        const endY = rRect.top + rRect.height / 2 - containerRect.top

        newArrows.push({
          id: `arrow-${row.question.id}-left`,
          d: `M ${startX - gap} ${startY} L ${endX + gap} ${endY}`,
          isActive: isPathActive(row.question.id, row.leftResult.id)
        })
      }
    }

    // 2. Right Result Arrow (horizontal right)
    if (row.rightResult) {
      const resultEl = nodeRefs.get(getResultRefKey(row.question.id, 'right'))
      if (resultEl) {
        const rRect = resultEl.getBoundingClientRect()
        const startX = qRect.right - containerRect.left
        const startY = qRect.top + qRect.height / 2 - containerRect.top
        const endX = rRect.left - containerRect.left
        const endY = rRect.top + rRect.height / 2 - containerRect.top

        newArrows.push({
          id: `arrow-${row.question.id}-right`,
          d: `M ${startX + gap} ${startY} L ${endX - gap} ${endY}`,
          isActive: isPathActive(row.question.id, row.rightResult.id)
        })
      }
    }

    // 3. Left-Under Result Arrow (strictly vertical down into left bottom card)
    if (row.leftUnderResult) {
      const resultEl = nodeRefs.get(getResultRefKey(row.question.id, 'left-under'))
      if (resultEl) {
        const rRect = resultEl.getBoundingClientRect()
        const posX = rRect.left + rRect.width / 2 - containerRect.left
        const startY = qRect.bottom - containerRect.top
        const endY = rRect.top - containerRect.top

        newArrows.push({
          id: `arrow-${row.question.id}-left-under`,
          d: `M ${posX} ${startY + gap} L ${posX} ${endY - gap}`,
          isActive: isPathActive(row.question.id, row.leftUnderResult.id)
        })
      }
    }

    // 4. Right-Under Result Arrow (strictly vertical down into right bottom card)
    if (row.rightUnderResult) {
      const resultEl = nodeRefs.get(getResultRefKey(row.question.id, 'right-under'))
      if (resultEl) {
        const rRect = resultEl.getBoundingClientRect()
        const posX = rRect.left + rRect.width / 2 - containerRect.left
        const startY = qRect.bottom - containerRect.top
        const endY = rRect.top - containerRect.top

        newArrows.push({
          id: `arrow-${row.question.id}-right-under`,
          d: `M ${posX} ${startY + gap} L ${posX} ${endY - gap}`,
          isActive: isPathActive(row.question.id, row.rightUnderResult.id)
        })
      }
    }

    // 5. Down to next Question Node in spine
    if (row.nextId && !row.isLast) {
      const nextEl = nodeRefs.get(row.nextId)
      if (nextEl) {
        const nRect = nextEl.getBoundingClientRect()
        const posX = qRect.left + qRect.width / 2 - containerRect.left
        const startY = qRect.bottom - containerRect.top
        const endY = nRect.top - containerRect.top

        newArrows.push({
          id: `arrow-${row.question.id}-next`,
          d: `M ${posX} ${startY + gap} L ${posX} ${endY - gap}`,
          isActive: isPathActive(row.question.id, row.nextId)
        })
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
  flex-direction: column;
  align-items: center; 
  width: 100%;
  margin-bottom: 3rem;
  position: relative;
}

.spine-main-row {
  display: flex;
  align-items: center; 
  width: 100%;
  gap: 3rem;
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

/* Bottom Results for Final Question Node */
.bottom-results-row {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 12px;
  margin-top: 2rem;
  width: 100%;
  max-width: 400px;
  min-width: 250px;
  box-sizing: border-box;
}

.bottom-result {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.8rem;
  min-height: 48px;
  box-sizing: border-box;
  text-align: center;
}
</style>

