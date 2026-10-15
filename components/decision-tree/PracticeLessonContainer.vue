<template>
  <div class="practice-lesson-container" ref="containerRef">
    <div v-if="loading" class="state-message">Загрузка урока...</div>
    <div v-else-if="error" class="state-message error-message">{{ error }}</div>
    
    <!-- PHASE 1: Fullscreen Theory Longread -->
    <div v-else-if="viewMode === 'theory'" class="theory-view">
      <div class="theory-header">
        <NuxtLink to="/" class="back-home-link">
          ← На главную
        </NuxtLink>
        <span class="phase-badge">Вводная теория: открытие правила</span>
      </div>

      <div class="theory-content">
        <h1 class="lesson-main-title">{{ lessonTitle }}</h1>
        
        <SimpleRenderer
          v-if="theoryNodes.length > 0"
          :content="theoryNodes"
          :lessonId="lessonId"
          :topicId="topicId"
          :progress="progress"
        />

        <div class="theory-bottom-action">
          <button class="start-practice-btn" @click="enterPracticeMode">
            Перейти к тренажеру →
          </button>
          <p class="theory-subhint">
            Вы всегда сможете открыть шпаргалку во время тренировки.
          </p>
        </div>
      </div>
    </div>

    <!-- PHASE 2: Split-screen Practice Trainer -->
    <div v-else class="lesson-layout" :style="{ gridTemplateColumns: `${leftWidth}px 4px 1fr` }">
      
      <!-- Left Column: Word & Input -->
      <div class="column-task">
        <div class="task-top-nav">
          <NuxtLink to="/" class="back-home-link">
            ← На главную
          </NuxtLink>
          <button 
            v-if="theoryNodes.length > 0" 
            class="cheat-sheet-btn"
            @click="openDrawer"
            title="Открыть правила и подсказки"
          >
            📖 Шпаргалка
          </button>
        </div>

        <div class="task-header">
          <div class="task-progress">
            Задание {{ currentTaskIndex + 1 }} из {{ tasks.length }}
          </div>
        </div>

        <div v-if="currentTask" class="task-card">
          <div class="task-word">
            {{ currentTask.content?.word }}
          </div>
          
          <div class="input-wrapper">
            <input
              ref="answerInput"
              v-model="userAnswer"
              type="text"
              class="answer-input"
              :class="{ 'is-error': inputError, 'is-success': inputSuccess }"
              placeholder="Введите ответ"
              :disabled="!isTreeCompleted || inputSuccess"
              @keyup.enter="checkAnswer"
            />
            <button 
              class="check-btn"
              :disabled="!isTreeCompleted || inputSuccess || !userAnswer"
              @click="checkAnswer"
            >
              Проверить
            </button>
          </div>
          
          <div v-if="inputError" class="feedback-msg error">
            Неверно, попробуйте еще раз.
          </div>
          <div v-if="inputSuccess" class="feedback-msg success">
            <span>Верно!</span>
            <div v-if="currentTaskIndex < tasks.length - 1">
              <button class="next-task-btn" @click="nextTask">
                Следующее задание →
              </button>
            </div>
            <div v-else class="completed-msg">
              Все задания урока выполнены!
            </div>
          </div>
          <div v-if="!isTreeCompleted" class="feedback-hint">
            Сначала пройдите по дереву решений справа →
          </div>

          <!-- History of Correct Answers -->
          <div v-if="completedWords.length > 0" class="completed-words-section">
            <h3 class="history-title">Выученные слова:</h3>
            <div class="words-list">
              <span v-for="word in completedWords" :key="word" class="word-badge">
                {{ word }}
              </span>
            </div>
          </div>
        </div>

        <div class="analytics-controls">
          <button @click="downloadReport" class="text-btn">Скачать отчет</button>
        </div>
      </div>

      <!-- Drag Handle -->
      <div 
        class="resize-handle" 
        @mousedown="startResize"
      ></div>

      <!-- Right Column: Interactive Trainer -->
      <div class="column-graph">
        <slot name="trainer" :rule="rule" :currentTask="currentTask" :isTreeCompleted="isTreeCompleted" :onTreeCompleted="onTreeCompleted">
          <ActiveTree
            v-if="rule && currentTask"
            :rule="rule"
            :task="currentTask"
            :taskId="currentTask.id"
            :lessonId="lessonId"
            @completed="onTreeCompleted"
          />
        </slot>
      </div>

    </div>

    <!-- Side Drawer: Cheat Sheet / Theory -->
    <transition name="drawer-fade">
      <div v-if="isDrawerOpen" class="drawer-backdrop" @click.self="closeDrawer">
        <div class="drawer-panel">
          <div class="drawer-header">
            <div class="drawer-title">📖 Шпаргалка к правилу</div>
            <button class="drawer-close-btn" @click="closeDrawer" title="Закрыть">✕</button>
          </div>
          <div class="drawer-body">
            <SimpleRenderer
              v-if="theoryNodes.length > 0"
              :content="theoryNodes"
              :lessonId="lessonId"
              :topicId="topicId"
              :progress="progress"
            />
            <div v-else class="drawer-empty">
              Нет доступных материалов теории.
            </div>
          </div>
          <div class="drawer-footer">
            <button class="drawer-back-btn" @click="closeDrawer">
              Понятно, вернуться к слову
            </button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import SimpleRenderer from '@/components/SimpleRenderer.vue'
import ActiveTree from './ActiveTree.vue'
import { AnalyticsService } from '@/utils/AnalyticsService'
import { useLessonProgress } from '@/composables/useLessonProgress'

const props = defineProps({
  lesson: {
    type: Object,
    default: () => ({})
  },
  lessonId: {
    type: String,
    default: ''
  },
  ruleLoader: {
    type: Function,
    default: null
  },
  tasksLoader: {
    type: Function,
    default: null
  },
  theoryLoader: {
    type: Function,
    default: null
  }
})

const { progress, loadProgress, isTaskSolved, getRestoredAnswer, markSolved } = useLessonProgress()

const loading = ref(true)
const error = ref(null)
const viewMode = ref('theory') // 'theory' | 'practice'
const isDrawerOpen = ref(false)

const theoryNodes = ref([])
const rule = ref(null)
const tasks = ref([])
const currentTaskIndex = ref(0)
const userAnswer = ref('')
const isTreeCompleted = ref(false)
const inputError = ref(false)
const inputSuccess = ref(false)
const answerInput = ref(null)
const completedWords = ref([])

// Resizable Pane State
const leftWidth = ref(420)
const isResizing = ref(false)
const containerRef = ref(null)

// Analytics tracking
const taskStartTime = ref(Date.now())
const taskAttempts = ref(0)

const lessonTitle = computed(() => {
  return props.lesson?.title || rule.value?.title || 'Практический урок'
})

const topicId = computed(() => {
  return props.lesson?.topicId || rule.value?.topicId || 'morphemics'
})

const currentTask = computed(() => tasks.value[currentTaskIndex.value] || null)

onMounted(async () => {
  try {
    loading.value = true

    // Load data from props.lesson or via loader functions
    let loadedRule = props.lesson?.rule || null
    let loadedTasks = props.lesson?.tasks || null
    let loadedTheory = props.lesson?.theory || null

    if (!loadedRule && props.ruleLoader) {
      const res = await props.ruleLoader()
      loadedRule = res?.default || res
    }
    if (!loadedTasks && props.tasksLoader) {
      const res = await props.tasksLoader()
      loadedTasks = res?.default || res
    }
    if (!loadedTheory && props.theoryLoader) {
      const res = await props.theoryLoader()
      loadedTheory = res?.default || res
    }

    rule.value = loadedRule
    tasks.value = loadedTasks || []
    theoryNodes.value = loadedTheory || []

    // Progress restoration
    const targetLessonId = props.lessonId || props.lesson?.id || ''
    if (targetLessonId) {
      await loadProgress(targetLessonId)
      
      // Populate already completed words
      tasks.value.forEach(t => {
        if (isTaskSolved(t.id)) {
          const rawExpected = t.content?.correct_answers ?? t.content?.correct_answer ?? ''
          const word = Array.isArray(rawExpected) ? (rawExpected.flat(Infinity)[0] ?? '') : rawExpected
          if (word && !completedWords.value.includes(word)) {
            completedWords.value.push(word)
          }
        }
      })

      // Check if user already passed theory or solved tasks previously
      const theoryPassed = typeof window !== 'undefined' && localStorage.getItem(`theory_passed_${targetLessonId}`) === 'true'
      const hasSolvedTasks = tasks.value.some(t => isTaskSolved(t.id))
      
      // If theory was completed or no theory exists or user has solved tasks, go to practice
      if (theoryPassed || hasSolvedTasks || theoryNodes.value.length === 0) {
        viewMode.value = 'practice'
      } else {
        viewMode.value = 'theory'
      }

      // Position at first unsolved task
      const firstUnsolved = tasks.value.findIndex(t => !isTaskSolved(t.id))
      if (firstUnsolved > 0) {
        currentTaskIndex.value = firstUnsolved
      }
      
      if (viewMode.value === 'practice') {
        checkCurrentTaskRestoration()
      }
    }

    taskStartTime.value = Date.now()

  } catch (e) {
    console.error('[PracticeLessonContainer] Error loading lesson:', e)
    error.value = 'Ошибка загрузки данных урока'
  } finally {
    loading.value = false
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', stopResize)
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopResize)
  window.removeEventListener('keydown', onKeyDown)
})

const enterPracticeMode = () => {
  viewMode.value = 'practice'
  const targetLessonId = props.lessonId || props.lesson?.id || ''
  if (targetLessonId && typeof window !== 'undefined') {
    localStorage.setItem(`theory_passed_${targetLessonId}`, 'true')
  }
  nextTick(() => {
    checkCurrentTaskRestoration()
  })
}

const openDrawer = () => {
  isDrawerOpen.value = true
}

const closeDrawer = () => {
  isDrawerOpen.value = false
}

const onKeyDown = (e) => {
  if (e.key === 'Escape' && isDrawerOpen.value) {
    closeDrawer()
  }
}

const checkCurrentTaskRestoration = () => {
  if (!currentTask.value) return
  const taskId = currentTask.value.id
  if (isTaskSolved(taskId)) {
    const restored = getRestoredAnswer(taskId)
    if (restored && restored.answerText) {
      userAnswer.value = restored.answerText
      inputSuccess.value = true
      isTreeCompleted.value = true
      const rawExpected = currentTask.value?.content?.correct_answers ?? currentTask.value?.content?.correct_answer ?? ''
      const wordToDisplay = Array.isArray(rawExpected) ? (rawExpected.flat(Infinity)[0] ?? '') : rawExpected
      if (wordToDisplay && !completedWords.value.includes(wordToDisplay)) {
        completedWords.value.push(wordToDisplay)
      }
    }
  }
}

watch(currentTaskIndex, () => {
  if (viewMode.value === 'practice') {
    checkCurrentTaskRestoration()
  }
})

// Resize Logic
const startResize = () => {
  isResizing.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const stopResize = () => {
  isResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

const onMouseMove = (e) => {
  if (!isResizing.value || !containerRef.value) return
  const containerRect = containerRef.value.getBoundingClientRect()
  const newWidth = e.clientX - containerRect.left
  if (newWidth > 320 && newWidth < containerRect.width - 320) {
    leftWidth.value = newWidth
  }
}

const onTreeCompleted = (resultNodeId) => {
  isTreeCompleted.value = true
  setTimeout(() => {
    if (answerInput.value) answerInput.value.focus()
  }, 100)
}

const checkAnswer = async () => {
  if (!isTreeCompleted.value || inputSuccess.value || !currentTask.value) return

  taskAttempts.value++
  const rawExpected = currentTask.value.content?.correct_answers ?? currentTask.value.content?.correct_answer ?? ''
  const actual = (userAnswer.value ?? '').trim().toLowerCase()

  const expectedList = Array.isArray(rawExpected)
    ? rawExpected.flat(Infinity).map(s => (s ?? '').toString().trim().toLowerCase()).filter(Boolean)
    : [(rawExpected ?? '').toString().trim().toLowerCase()]

  const isCorrect = expectedList.includes(actual)
  const wordToDisplay = Array.isArray(rawExpected) ? (rawExpected.flat(Infinity)[0] ?? '') : rawExpected
  const targetLessonId = props.lessonId || props.lesson?.id || ''
  const timeSpent = Date.now() - taskStartTime.value

  if (isCorrect) {
    inputSuccess.value = true
    inputError.value = false
    if (wordToDisplay && !completedWords.value.includes(wordToDisplay)) {
      completedWords.value.push(wordToDisplay)
    }

    if (rule.value) {
      try {
        await AnalyticsService.logAttempt({
          lessonId: targetLessonId,
          taskId: currentTask.value.id,
          subTaskId: currentTask.value.input_id || `${currentTask.value.id}_input`,
          topicId: rule.value.topicId || topicId.value,
          ruleId: rule.value.ruleId,
          graphId: rule.value.graphId,

          taskType: 'DecisionTreeInput',
          answerType: 'input',
          taskVersion: currentTask.value.taskVersion || null,

          answerText: userAnswer.value,
          userAnswerIsCorrect: true,

          correctOptions: null,
          incorrectOptions: null,
          selectedCorrectOptions: null,
          selectedIncorrectOptions: null,

          responseMs: timeSpent
        })
      } catch (e) {
        console.error('[Practice] Failed to log attempt:', e)
      }

      markSolved(currentTask.value.id, { answerText: userAnswer.value })
    }

    setTimeout(nextTask, 1500)
  } else {
    inputError.value = true

    if (rule.value) {
      try {
        await AnalyticsService.logAttempt({
          lessonId: targetLessonId,
          taskId: currentTask.value.id,
          subTaskId: currentTask.value.input_id || `${currentTask.value.id}_input`,
          topicId: rule.value.topicId || topicId.value,
          ruleId: rule.value.ruleId,
          graphId: rule.value.graphId,

          taskType: 'DecisionTreeInput',
          answerType: 'input',
          taskVersion: currentTask.value.taskVersion || null,

          answerText: userAnswer.value,
          userAnswerIsCorrect: false,

          correctOptions: null,
          incorrectOptions: null,
          selectedCorrectOptions: null,
          selectedIncorrectOptions: null,

          responseMs: timeSpent
        })
      } catch (e) {
        console.error('[Practice] Failed to log failure:', e)
      }
    }

    setTimeout(() => { inputError.value = false }, 2000)
  }
}

const nextTask = () => {
  if (currentTaskIndex.value < tasks.value.length - 1) {
    resetState()
    currentTaskIndex.value++
  } else {
    alert('Поздравляем! Вы прошли все задания этого урока.')
  }
}

const resetState = () => {
  userAnswer.value = ''
  isTreeCompleted.value = false
  inputError.value = false
  inputSuccess.value = false
  taskStartTime.value = Date.now()
  taskAttempts.value = 0
}

const downloadReport = () => {
  // Not implemented yet
}
</script>

<style scoped>
.practice-lesson-container {
  height: calc(100vh - 100px);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
  position: relative;
}

.state-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.2rem;
  color: #64748b;
}

.error-message {
  color: #ef4444;
}

/* --- PHASE 1: THEORY VIEW --- */
.theory-view {
  height: 100%;
  overflow-y: auto;
  background: #ffffff;
  padding: 2.5rem 1.5rem 5rem 1.5rem;
  box-sizing: border-box;
}

.theory-header {
  max-width: 800px;
  margin: 0 auto 1.5rem auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.phase-badge {
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.35rem 0.8rem;
  border-radius: 9999px;
  letter-spacing: 0.02em;
}

.theory-content {
  max-width: 800px;
  margin: 0 auto;
}

.lesson-main-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 2rem;
  line-height: 1.25;
}

.theory-bottom-action {
  margin-top: 3.5rem;
  padding-top: 2rem;
  border-top: 2px dashed #e2e8f0;
  text-align: center;
}

.start-practice-btn {
  background: #2563eb;
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 700;
  padding: 1.1rem 2.5rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
  transition: all 0.2s ease;
}

.start-practice-btn:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
}

.theory-subhint {
  margin-top: 0.75rem;
  color: #64748b;
  font-size: 0.9rem;
}

/* --- PHASE 2: SPLIT LAYOUT --- */
.lesson-layout {
  display: grid;
  height: 100%;
  background: #e2e8f0;
}

.resize-handle {
  background: #cbd5e1;
  cursor: col-resize;
  transition: background 0.2s;
}

.resize-handle:hover,
.resize-handle:active {
  background: #3b82f6;
}

.column-task {
  background: white;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow-y: auto;
  min-width: 0;
}

.column-graph {
  background: #f8fafc;
  overflow: auto;
  position: relative;
  min-width: 0;
}

.task-top-nav {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.back-home-link {
  color: #64748b;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 600;
  transition: color 0.2s;
}

.back-home-link:hover {
  color: #1e293b;
}

.cheat-sheet-btn {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.cheat-sheet-btn:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}

.task-header {
  margin-bottom: 2rem;
  text-align: center;
}

.task-progress {
  color: #64748b;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.task-card {
  width: 100%;
  text-align: center;
}

.task-word {
  font-size: 2.5rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2rem;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.answer-input {
  width: 100%;
  padding: 1rem;
  font-size: 1.2rem;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  transition: all 0.2s;
  text-align: center;
  box-sizing: border-box;
}

.answer-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.answer-input:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
}

.answer-input.is-error {
  border-color: #ef4444;
  background: #fef2f2;
}

.answer-input.is-success {
  border-color: #22c55e;
  background: #f0fdf4;
}

.check-btn {
  width: 100%;
  padding: 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.check-btn:hover:not(:disabled) {
  background: #2563eb;
}

.check-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.feedback-msg {
  margin-top: 1.5rem;
  font-weight: 500;
  font-size: 1.1rem;
}

.feedback-msg.error { color: #dc2626; }
.feedback-msg.success { color: #16a34a; }

.next-task-btn {
  margin-top: 0.75rem;
  padding: 0.6rem 1.2rem;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}

.next-task-btn:hover {
  background: #15803d;
}

.completed-msg {
  margin-top: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #15803d;
}

.feedback-hint {
  margin-top: 1.5rem;
  color: #64748b;
  font-size: 0.9rem;
}

.completed-words-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 2px dashed #e2e8f0;
  text-align: center;
}

.history-title {
  font-size: 1rem;
  color: #64748b;
  margin-bottom: 1rem;
  font-weight: 600;
}

.words-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.word-badge {
  background: #dcfce7;
  color: #15803d;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.analytics-controls {
  margin-top: auto;
  padding-top: 2rem;
}

.text-btn {
  background: none;
  border: none;
  color: #94a3b8;
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.8rem;
}

.text-btn:hover {
  color: #64748b;
}

/* --- SIDE DRAWER (ШПАРГАЛКА) --- */
.drawer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 540px;
  max-width: 90vw;
  height: 100%;
  background: #ffffff;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  animation: slideLeft 0.25s ease-out;
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.drawer-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}

.drawer-close-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  line-height: 1;
}

.drawer-close-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.drawer-empty {
  color: #94a3b8;
  font-style: italic;
  text-align: center;
  padding: 2rem 0;
}

.drawer-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
}

.drawer-back-btn {
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.65rem 1.25rem;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}

.drawer-back-btn:hover {
  background: #1d4ed8;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
</style>
