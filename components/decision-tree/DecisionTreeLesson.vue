<template>
  <div class="decision-tree-lesson" ref="containerRef">
    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="lesson-layout" :style="{ gridTemplateColumns: `${leftWidth}px 4px 1fr` }">
      
      <!-- Left Column: Task -->
      <div class="column-task">
        <div class="task-header">
          <div class="task-progress">
            Задание {{ currentTaskIndex + 1 }} из {{ tasks.length }}
          </div>
        </div>

        <div class="task-card">
          <div class="task-word">
            {{ currentTask.content.word }}
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
            Верно! Следующее задание...
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

      <!-- Right Column: Active Tree (Graph) -->
      <div class="column-graph">
        <ActiveTree
          :rule="rule"
          :task="currentTask"
          :taskId="currentTask.id"
          :lessonId="lessonId"
          @completed="onTreeCompleted"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import ActiveTree from './ActiveTree.vue'
import { AnalyticsService } from '@/utils/AnalyticsService'
// useLessonProgress is auto-imported

const props = defineProps({
  ruleLoader: {
    type: Function,
    required: true
  },
  tasksLoader: {
    type: Function,
    required: true
  },
  lessonId: {
    type: String,
    default: ''
  }
})

const { loadProgress, isTaskSolved, getRestoredAnswer, markSolved } = useLessonProgress()

const loading = ref(true)
const error = ref(null)
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
const leftWidth = ref(400)
const isResizing = ref(false)
const containerRef = ref(null)

// Analytics tracking
const taskStartTime = ref(Date.now())
const taskAttempts = ref(0)

const currentTask = computed(() => tasks.value[currentTaskIndex.value])

onMounted(async () => {
  try {
    loading.value = true
    const [ruleMod, tasksMod] = await Promise.all([
      props.ruleLoader(),
      props.tasksLoader()
    ])
    rule.value = ruleMod.default || ruleMod
    tasks.value = tasksMod.default || tasksMod
    
    // Reset analytics timer
    taskStartTime.value = Date.now()

    // Load progress
    if (props.lessonId) {
       await loadProgress(props.lessonId)
       checkCurrentTaskRestoration()
    }

  } catch (e) {
    console.error(e)
    error.value = 'Ошибка загрузки данных урока'
  } finally {
    loading.value = false
  }
  
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', stopResize)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopResize)
})

const checkCurrentTaskRestoration = () => {
    if (!currentTask.value) return
    const taskId = currentTask.value.id
    if (isTaskSolved(taskId)) {
        const restored = getRestoredAnswer(taskId)
        if (restored && restored.answerText) {
            userAnswer.value = restored.answerText
            inputSuccess.value = true
            isTreeCompleted.value = true // Assume tree done if text is solved
            completedWords.value.push(currentTask.value.content.correct_answer)
        }
    }
}

watch(currentTaskIndex, () => {
    checkCurrentTaskRestoration()
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
  if (!isResizing.value) return
  const containerRect = containerRef.value.getBoundingClientRect()
  const newWidth = e.clientX - containerRect.left
  if (newWidth > 300 && newWidth < containerRect.width - 300) {
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
  if (!isTreeCompleted.value || inputSuccess.value) return
  
  taskAttempts.value++
  const expected = currentTask.value.content.correct_answer.trim().toLowerCase()
  const actual = userAnswer.value.trim().toLowerCase()

  const isCorrect = expected === actual

  if (isCorrect) {
    inputSuccess.value = true
    inputError.value = false
    completedWords.value.push(currentTask.value.content.correct_answer)

    const timeSpent = Date.now() - taskStartTime.value
    
    // Log success
    if (rule.value) {
        // Log attempt
        await AnalyticsService.logAttempt({
            // Context
            lessonId: props.lessonId,
            taskId: currentTask.value.id,
            subTaskId: currentTask.value.input_id || `${currentTask.value.id}_input`,
            topicId: rule.value.topicId,
            ruleId: rule.value.ruleId,
            graphId: rule.value.graphId,
            
            // Task Type
            taskType: 'DecisionTreeInput', // Distinguish from tree steps
            answerType: 'input',
            taskVersion: currentTask.value.taskVersion || null,
            
            // Answer
            answerText: userAnswer.value,
            userAnswerIsCorrect: true,
            
            // Counters (null for input)
            correctOptions: null,
            incorrectOptions: null,
            selectedCorrectOptions: null,
            selectedIncorrectOptions: null,
            
            responseMs: timeSpent
        })
        
        markSolved(currentTask.value.id, { answerText: userAnswer.value })
    }

    setTimeout(nextTask, 1500)
  } else {
    inputError.value = true
    
    // Log failure
    if (rule.value) {
        AnalyticsService.logAttempt({
            lessonId: props.lessonId,
            taskId: currentTask.value.id,
            subTaskId: currentTask.value.input_id || `${currentTask.value.id}_input`,
            topicId: rule.value.topicId,
            ruleId: rule.value.ruleId,
            graphId: rule.value.graphId,
            
            taskType: 'DecisionTreeInput',
            answerType: 'input',
            taskVersion: currentTask.value.taskVersion || null,
            
            answerText: userAnswer.value,
            userAnswerIsCorrect: false,
            
            // Counters (null for input)
            correctOptions: null,
            incorrectOptions: null,
            selectedCorrectOptions: null,
            selectedIncorrectOptions: null,
            
            responseMs: Date.now() - taskStartTime.value
        })
    }

    setTimeout(() => { inputError.value = false }, 2000)
  }
}

const nextTask = () => {
  if (currentTaskIndex.value < tasks.value.length - 1) {
    currentTaskIndex.value++
    resetState()
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
  // AnalyticsService.downloadReport() // Not implemented in new service yet
}
</script>

<style scoped>
.decision-tree-lesson {
  height: calc(100vh - 100px); /* Adjust based on header/footer */
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

.lesson-layout {
  display: grid;
  /* grid-template-columns set dynamically in style */
  height: 100%;
  background: #e2e8f0; /* Border color */
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
  min-width: 0; /* Prevent overflow */
}

.column-graph {
  background: #f8fafc;
  overflow: auto;
  position: relative;
  min-width: 0; /* Prevent overflow */
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
</style>
