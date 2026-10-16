<template>
  <div class="step-algorithm-layout" ref="stepperRef">
    <!-- Header: Algorithm Progress -->
    <div class="stepper-header">
      <div class="header-info">
        <span class="stepper-badge">Чеклист проверки корня</span>
        <span class="stepper-counter">Шаг {{ currentStepNumber }} из {{ totalSteps }}</span>
      </div>
      <div class="progress-bar-track">
        <div 
          class="progress-bar-fill" 
          :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>
    </div>

    <!-- Steps Stack -->
    <div class="steps-container">
      <div
        v-for="(node, index) in stepNodes"
        :key="node.id"
        :id="`step-${node.id}`"
        class="step-card"
        :class="{
          'is-completed': isCompleted(node),
          'is-active': isActive(node),
          'is-upcoming': isUpcoming(node),
          'is-result': node.type === 'result'
        }"
      >
        <!-- Step Header Line -->
        <div class="step-card-header">
          <div class="step-icon-badge">
            <span v-if="isCompleted(node)" class="check-icon">✓</span>
            <span v-else>{{ node.step_number || index + 1 }}</span>
          </div>
          <div class="step-header-text">
            <div class="step-title">{{ node.title || `Шаг ${index + 1}` }}</div>
            <div v-if="isCompleted(node)" class="completed-summary">
              {{ getCompletedSummary(node) }}
            </div>
          </div>
        </div>

        <!-- Step Body (Visible when Active or Result) -->
        <div v-if="isActive(node) || (node.type === 'result' && isCompleted(node))" class="step-card-body">
          <p class="step-question-text">{{ node.text }}</p>

          <!-- SPECIAL CASE: Step 3 Word Selection (Chips) -->
          <div v-if="node.id === 'q3_pick_word'" class="chips-selector-section">
            <div class="chips-hint">Выберите проверочную форму или однокоренное слово:</div>
            <div class="chips-list">
              <button
                v-for="chip in currentTaskChips"
                :key="chip.id"
                class="word-chip-btn"
                :class="{
                  'is-error': selectedTrapChipId === chip.id || errorOptionId === chip.id,
                  'is-success': successOptionId === chip.id || isChipSelected(chip.id)
                }"
                :disabled="isProcessing"
                @click="handleChipClick(chip)"
              >
                <span class="chip-accent-dot"></span>
                <span class="chip-label">{{ chip.label }}</span>
              </button>
            </div>

            <!-- Trap Alert Banner -->
            <transition name="fade">
              <div v-if="trapMessage" class="trap-warning-banner">
                <div class="trap-icon">⚠️</div>
                <div class="trap-content">
                  <div class="trap-title">Внимание: ловушка правила!</div>
                  <div class="trap-text">{{ trapMessage }}</div>
                </div>
              </div>
            </transition>
          </div>

          <!-- STANDARD STEP: Options (Yes/No buttons) -->
          <div v-else-if="node.options && node.options.length > 0" class="step-options-section">
            <div class="options-list">
              <button
                v-for="option in node.options"
                :key="option.id"
                class="step-option-btn"
                :class="{
                  'is-error': errorOptionId === option.id,
                  'is-success': successOptionId === option.id
                }"
                :disabled="isProcessing"
                @click="onOptionClick(option)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <!-- RESULT NODE: Final verdict capsule -->
          <div v-else-if="node.type === 'result'" class="result-capsule">
            <div class="verdict-letter-badge">
              {{ currentVowel.toUpperCase() }}
            </div>
            <div class="verdict-info">
              <div class="verdict-title">Пишем букву {{ currentVowel.toUpperCase() }}</div>
              <div class="verdict-explanation">
                Гласная <strong>{{ currentVowel.toUpperCase() }}</strong> в сильной позиции найдена. Введите слово слева!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  rule: {
    type: Object,
    required: true
  },
  task: {
    type: Object,
    default: null
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
  }
})

const emit = defineEmits(['option-click', 'node-click'])

const stepperRef = ref(null)
const trapMessage = ref(null)
const selectedTrapChipId = ref(null)
const isProcessing = ref(false)

// Nodes
const stepNodes = computed(() => {
  return props.rule?.nodes || []
})

const totalSteps = computed(() => stepNodes.value.length)

const currentStepNumber = computed(() => {
  const nodeIndex = stepNodes.value.findIndex(n => n.id === props.currentNodeId)
  if (nodeIndex >= 0) return nodeIndex + 1
  return props.history.length + 1
})

const progressPercentage = computed(() => {
  if (totalSteps.value === 0) return 0
  const completedCount = props.history.length
  return Math.round((completedCount / totalSteps.value) * 100)
})

// Current task chips for Step 3
const currentTaskChips = computed(() => {
  return props.task?.content?.check_options || [
    { id: 'op_word_correct', label: 'кра́ткий', is_correct: true }
  ]
})

// Current target vowel
const currentVowel = computed(() => {
  return props.task?.content?.vowel || 'а'
})

// Status helpers
const isCompleted = (node) => {
  return props.history.some(h => h.node.id === node.id)
}

const isActive = (node) => {
  return props.currentNodeId === node.id
}

const isUpcoming = (node) => {
  return !isCompleted(node) && !isActive(node)
}

const isChipSelected = (chipId) => {
  const step3History = props.history.find(h => h.node.id === 'q3_pick_word')
  return step3History && step3History.option.id === chipId
}

const getCompletedSummary = (node) => {
  const item = props.history.find(h => h.node.id === node.id)
  if (!item) return ''
  
  if (node.id === 'q3_pick_word') {
    const chip = currentTaskChips.value.find(c => c.id === item.option.id)
    return chip ? `Выбрано слово: «${chip.label}»` : item.option.label
  }
  
  return item.option.label
}

// Option handlers
const onOptionClick = (option) => {
  emit('option-click', option)
}

const handleChipClick = (chip) => {
  if (chip.is_correct) {
    trapMessage.value = null
    selectedTrapChipId.value = null
    emit('option-click', {
      id: chip.id,
      label: chip.label,
      next: 'q4_check_root'
    })
  } else {
    // Show trap warning
    selectedTrapChipId.value = chip.id
    trapMessage.value = chip.explanation || 'Это слово не подходит для проверки корня. Подберите другое слово.'
    
    // Log error attempt via ActiveTree option-click
    emit('option-click', {
      id: chip.id,
      label: chip.label,
      next: 'q3_pick_word'
    })

    // Clear trap styling after brief delay
    setTimeout(() => {
      selectedTrapChipId.value = null
    }, 1500)
  }
}

// Reset trap message when current task or current node changes
watch(() => props.task, () => {
  trapMessage.value = null
  selectedTrapChipId.value = null
})

watch(() => props.currentNodeId, (newId) => {
  nextTick(() => {
    if (newId && stepperRef.value) {
      const activeEl = stepperRef.value.querySelector(`#step-${newId}`)
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  })
})
</script>

<style scoped>
.step-algorithm-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px 32px;
  background: #f8fafc;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  box-sizing: border-box;
}

/* Header & Progress Bar */
.stepper-header {
  margin-bottom: 24px;
  background: #ffffff;
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.stepper-badge {
  font-size: 13px;
  font-weight: 700;
  color: #4f46e5;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stepper-counter {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.progress-bar-track {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #10b981 100%);
  border-radius: 999px;
  transition: width 0.4s ease;
}

/* Steps Stack */
.steps-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
}

/* Step Card Base */
.step-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

/* Upcoming State */
.step-card.is-upcoming {
  opacity: 0.45;
  background: #f1f5f9;
  border-color: #e2e8f0;
  box-shadow: none;
}

/* Completed State */
.step-card.is-completed {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.step-card.is-completed .step-icon-badge {
  background: #10b981;
  color: #ffffff;
  border-color: #10b981;
}

/* Active State */
.step-card.is-active {
  border-color: #6366f1;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.12), 0 0 0 1px #6366f1;
  background: #ffffff;
}

.step-card.is-active .step-icon-badge {
  background: #6366f1;
  color: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.18);
}

/* Card Header */
.step-card-header {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  gap: 14px;
}

.step-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  background: #e2e8f0;
  color: #475569;
  border: 2px solid transparent;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.check-icon {
  font-size: 16px;
  font-weight: 900;
}

.step-header-text {
  display: flex;
  flex-direction: column;
}

.step-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.completed-summary {
  font-size: 13px;
  color: #10b981;
  font-weight: 600;
  margin-top: 2px;
}

/* Card Body */
.step-card-body {
  padding: 0 18px 18px 64px;
}

.step-question-text {
  font-size: 14px;
  color: #334155;
  line-height: 1.5;
  margin: 0 0 16px 0;
  font-weight: 500;
}

/* Options (Buttons) */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-option-btn {
  display: flex;
  align-items: center;
  padding: 11px 16px;
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.step-option-btn:hover:not(:disabled) {
  border-color: #6366f1;
  background: #f5f3ff;
  color: #4f46e5;
  transform: translateY(-1px);
}

.step-option-btn.is-success {
  background: #d1fae5;
  border-color: #10b981;
  color: #065f46;
}

.step-option-btn.is-error {
  background: #fee2e2;
  border-color: #ef4444;
  color: #991b1b;
  animation: shake 0.4s ease;
}

/* Chips Selector Section (Step 3) */
.chips-selector-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chips-hint {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.word-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.chip-accent-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  transition: background 0.15s ease;
}

.word-chip-btn:hover:not(:disabled) {
  border-color: #6366f1;
  color: #4f46e5;
  background: #f5f3ff;
  transform: translateY(-1px);
}

.word-chip-btn:hover:not(:disabled) .chip-accent-dot {
  background: #6366f1;
}

.word-chip-btn.is-success {
  background: #d1fae5;
  border-color: #10b981;
  color: #065f46;
}

.word-chip-btn.is-success .chip-accent-dot {
  background: #10b981;
}

.word-chip-btn.is-error {
  background: #fee2e2;
  border-color: #ef4444;
  color: #991b1b;
  animation: shake 0.4s ease;
}

.word-chip-btn.is-error .chip-accent-dot {
  background: #ef4444;
}

/* Trap Warning Banner */
.trap-warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
  margin-top: 8px;
}

.trap-icon {
  font-size: 18px;
  line-height: 1;
}

.trap-title {
  font-size: 13px;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 2px;
}

.trap-text {
  font-size: 13px;
  color: #78350f;
  line-height: 1.4;
}

/* Result Capsule */
.result-capsule {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: #ecfdf5;
  border: 1.5px solid #10b981;
  border-radius: 10px;
}

.verdict-letter-badge {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #10b981;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}

.verdict-title {
  font-size: 16px;
  font-weight: 800;
  color: #065f46;
}

.verdict-explanation {
  font-size: 13px;
  color: #047857;
  margin-top: 2px;
  line-height: 1.4;
}

/* Animations */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
