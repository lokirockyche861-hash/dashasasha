<template>
  <div class="fill-text">
    <!-- Вопрос -->
    <div class="quiz-header">
      <div class="question" v-html="renderBlock(node?.content?.question || '')"></div>
    </div>

    <!-- Текст с инпутами -->
    <div class="text-container">
      <div class="text-content">
        <template v-for="(part, idx) in parts" :key="idx">
          <!-- обычный фрагмент текста -->
          <span v-if="part.kind === 'text'" v-html="part.html"></span>

          <!-- место для ответа с обвёртками -->
          <span v-else-if="part.kind === 'input'" class="input-wrap">
            <!-- префикс из task.text (например, 'собра') -->
            <span class="affix" v-if="part.prefix" v-html="renderInline(part.prefix)"></span>

            <input
              class="fill-text-input"
              type="text"
              v-model="userAnswers[part.task.id]"
              :ref="el => setInputRef(part.task.id, el)"
              :disabled="showResults"
              :placeholder="part.task.placeholder || ''"
              :style="{ width: inputWidths[part.task.id] || computeMinWidth(part.task) }"
              :class="{
                correct: showResults && isCorrect(part.task),
                incorrect: showResults && !isCorrect(part.task)
              }"
            />

            <!-- суффикс из task.text (например, 'ые') -->
            <span class="affix" v-if="part.suffix" v-html="renderInline(part.suffix)"></span>

            <!-- Эмодзи с подсказкой для всех ответов -->
            <span 
              v-if="showResults" 
              class="feedback-trigger"
              @click="toggleFeedback(part.task.id)"
              :class="{ 
                'correct-feedback': isCorrect(part.task),
                'incorrect-feedback': !isCorrect(part.task)
              }"
            >
              ℹ️
            </span>

            <!-- Всплывашка с фидбеком -->
            <div 
              v-if="showFeedback === part.task.id" 
              class="feedback-popup"
              :class="{ 
                'show': showFeedback === part.task.id,
                'correct-popup': isCorrect(part.task),
                'incorrect-popup': !isCorrect(part.task)
              }"
            >
              <div class="feedback-content">
                <span v-html="renderInline(isCorrect(part.task) ? part.task['feedback-correct'] : part.task['feedback-incorrect'])"></span>
                <button class="close-feedback" @click="closeFeedback">×</button>
              </div>
            </div>
          </span>
        </template>
      </div>
    </div>

    <!-- Кнопка проверки -->
    <div class="quiz-actions">
      <button 
        @click="checkResults" 
        class="check-button"
        :disabled="showResults"
      >
        {{ node?.content?.button_text || 'Проверить' }}
      </button>
    </div>

    <div 
      v-if="showResults && node?.content?.result_text" 
      class="result-text"
      v-html="renderBlock(node.content.result_text)"
    ></div>
  </div>
</template>

<script>
import MarkdownIt from 'markdown-it'
import { AnalyticsService } from '@/utils/AnalyticsService'

const md = new MarkdownIt({ html: true, linkify: true, breaks: true })

export default {
  name: 'FillText',
  props: {
    node: { type: Object, required: true },
    lessonId: { type: String, default: '' },
    topicId: { type: String, default: '' },
    lessonVersion: { type: String, default: null },
    savedState: { type: Object, default: null }
  },
  data() {
    return {
      parts: [],
      userAnswers: {},
      showResults: false,
      inputRefs: {},
      inputWidths: {},
      showFeedback: null, // ID задачи, для которой показываем фидбек
      startTime: Date.now()
    }
  },
  computed: {
    tasks() {
      return this.node?.content?.tasks ?? []
    },
    taskMap() {
      const m = new Map()
      for (const t of this.tasks) m.set(t.id, t)
      return m
    },
    sourceText() {
      return this.node?.content?.text ?? ''
    }
  },
  watch: {
    node: {
      handler() {
        this.initializeComponent()
      },
      deep: true,
      immediate: true
    }
  },
  mounted() {
    this.initializeComponent()
    this.$nextTick(() => {
      this.initializeWidths()
    })
    
    // Закрываем попап при клике вне его
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    renderBlock(s)   { return md.render((s ?? '').toString()) },
    renderInline(s)  { return md.renderInline((s ?? '').toString()) },

    initializeComponent() {
      this.showResults = false
      this.showFeedback = null
      this.inputRefs = {}
      this.inputWidths = {}
      this.initAnswers()
      this.parts = this.parseTextToParts(this.sourceText)
    },

    initAnswers() {
      const init = {}
      const subTasks = this.savedState?.subTasks || {}
      let hasRestoredAnswers = false

      for (const t of this.tasks) {
          const attempt = subTasks[t.id]
          if (attempt && attempt.answerText) {
              init[t.id] = attempt.answerText
              hasRestoredAnswers = true
          } else {
              init[t.id] = ''
          }
      }
      this.userAnswers = init
      
      if (hasRestoredAnswers) {
          this.showResults = true
      }
    },

    parseTextToParts(text) {
      const parts = []
      const pattern = /\{\{([^}]+)\}\}/g
      let lastIndex = 0
      let m

      while ((m = pattern.exec(text)) !== null) {
        const before = text.slice(lastIndex, m.index)
        if (before) {
          parts.push({ kind: 'text', html: this.renderInline(before) })
        }

        const taskId = m[1].trim()
        
        // "Умная проверка": если такого ID нет в массиве tasks, значит это обычный текст (например, {{с}})
        if (this.taskMap.has(taskId)) {
          const task   = this.getTask(taskId)
          const { prefix, suffix } = this.extractAffixes(task)
          parts.push({ kind: 'input', task, prefix, suffix })
        } else {
          // Восстанавливаем оригинальные скобки
          parts.push({ kind: 'text', html: this.renderInline(m[0]) })
        }
        
        lastIndex = m.index + m[0].length
      }

      const tail = text.slice(lastIndex)
      if (tail) {
        parts.push({ kind: 'text', html: this.renderInline(tail) })
      }
      return parts
    },

    getTask(taskId) {
      return this.taskMap.get(taskId) || {
        id: taskId,
        text: '',
        correctAnswer: '',
        minWidth: null,
        placeholder: '',
        'feedback-correct': 'Верно!',
        'feedback-incorrect': 'Неверно!'
      }
    },

    extractAffixes(task) {
      const src = (task?.text ?? '').toString()
      if (!src) return { prefix: '', suffix: '' }

      const groups = [...src.matchAll(/_+/g)]
      if (groups.length === 0) return { prefix: '', suffix: '' }

      const longest = groups.reduce((acc, m) => (m[0].length > acc[0].length ? m : acc), groups[0])
      const start = longest.index
      const end = longest.index + longest[0].length

      const prefix = src.slice(0, start)
      const suffix = src.slice(end)
      return { prefix, suffix }
    },

    setInputRef(taskId, el) {
      if (el) {
        this.inputRefs[taskId] = el
        
        // Добавляем обработчики для auto-size
        el.addEventListener('input', () => {
          this.updateInputWidth(taskId)
        })
        
        el.addEventListener('focus', () => {
          this.updateInputWidth(taskId)
        })
        
        el.addEventListener('blur', () => {
          this.updateInputWidth(taskId)
        })
        
        // Инициализируем ширину
        this.$nextTick(() => {
          this.updateInputWidth(taskId)
        })
      }
    },

    updateInputWidth(taskId) {
      const input = this.inputRefs[taskId]
      if (!input) return
      
      const task = this.getTask(taskId)
      
      // Базовые настройки по умолчанию
      const defaultMinWidth = 40
      const customMinWidth = task.minWidth === null ? defaultMinWidth : (task.minWidth || defaultMinWidth)
      const focusExtraWidth = 15 // Дополнительная ширина при фокусе
      
      // Определяем текущую минимальную ширину
      let currentMinWidth = customMinWidth
      if (document.activeElement === input) {
        currentMinWidth = customMinWidth + focusExtraWidth
      }
      
      // Создаем временный span для измерения текста
      const tempSpan = document.createElement('span')
      tempSpan.style.visibility = 'hidden'
      tempSpan.style.position = 'absolute'
      tempSpan.style.whiteSpace = 'pre'
      tempSpan.style.font = window.getComputedStyle(input).font
      tempSpan.style.letterSpacing = window.getComputedStyle(input).letterSpacing
      tempSpan.textContent = input.value || input.placeholder || '__'
      
      document.body.appendChild(tempSpan)
      
      // Вычисление ширины
      const computedStyle = window.getComputedStyle(input)
      const horizontalPadding = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight)
      const horizontalBorder = parseFloat(computedStyle.borderLeftWidth) + parseFloat(computedStyle.borderRightWidth)
      const extraSpace = 4
      
      const contentWidth = tempSpan.scrollWidth
      const totalWidth = contentWidth + horizontalPadding + horizontalBorder + extraSpace
      
      const finalWidth = Math.max(currentMinWidth, totalWidth)
      
      document.body.removeChild(tempSpan)
      
      // Сохраняем ширину
      this.inputWidths[taskId] = Math.ceil(finalWidth) + 'px'
    },

    initializeWidths() {
      this.tasks.forEach(task => {
        if (this.inputRefs[task.id]) {
          this.updateInputWidth(task.id)
        }
      })
    },

    computeMinWidth(task) {
      // Используем кастомный minWidth или дефолтный
      const defaultMinWidth = 40
      const customMinWidth = task.minWidth === null ? defaultMinWidth : (task.minWidth || defaultMinWidth)
      return `${customMinWidth}px`
    },

    normalize(s) {
      return (s ?? '').toString().trim().toLowerCase()
    },

    isCorrect(task) {
      const user = this.normalize(this.userAnswers?.[task.id])
      const right = this.normalize(task?.correctAnswer)
      return user.length > 0 && right.length > 0 && user === right
    },

    async checkResults() { 
      this.showResults = true 
      this.closeFeedback() // Закрываем все попапы при новой проверке
      
      const tasks = this.tasks || []
      
      for (const task of tasks) {
          const isCorrect = this.isCorrect(task)
          const userAnswer = this.userAnswers?.[task.id]
          
          const payload = {
            // Context
            topicId: this.topicId || this.node.topicId,
            lessonId: this.lessonId || this.node.lessonId,
            lessonVersion: this.lessonVersion,
            ruleId: null,

            taskId: this.node.id, // Parent Task ID (Text ID)
            subTaskId: task.id,   // Sub-task ID (Blank ID)
            taskType: 'FillText',
            answerType: 'input',
            taskVersion: this.node.taskVersion || null,
            skillId: this.node.skill_id || null, 

            // Answer
            answerText: userAnswer || '',
            userAnswerIsCorrect: isCorrect,

            // Counters (null for input)
            correctOptions: null,
            incorrectOptions: null,
            selectedCorrectOptions: null,
            selectedIncorrectOptions: null,
            
            responseMs: Date.now() - this.startTime
          }

        try {
            await AnalyticsService.logAttempt(payload)
        } catch (e) {
            console.error('Failed to log FillText attempt', e)
        }
      }
    },

    toggleFeedback(taskId) {
      event.stopPropagation() // Предотвращаем всплытие
      this.showFeedback = this.showFeedback === taskId ? null : taskId
    },
    
    closeFeedback() {
      this.showFeedback = null
    },
    
    handleClickOutside(event) {
      // Закрываем попап при клике вне его
      if (this.showFeedback && !event.target.closest('.input-wrap')) {
        this.closeFeedback()
      }
    }
  }
}
</script>

<style scoped>
.fill-text {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  border: 1px solid #e9ecef;
  position: relative;
}

.quiz-header {
  margin-bottom: 20px;
}

.question {
  font-size: 1.1em;
  line-height: 1.5;
  font-weight: 500;
}

.text-container {
  margin-bottom: 20px;
}

.text-content {
  font-size: 1em;
  line-height: 1.6;
  text-align: justify;
}

/* обвёртка вокруг инпута с префиксом/суффиксом */
.input-wrap {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 0.15rem;
  white-space: nowrap;
}

.affix {
  display: inline-block;
  line-height: 1.6;
}

.fill-text-input {
  border: 2px solid #6c757d;
  border-radius: 4px;
  padding: 4px 8px;
  margin: 0 2px;
  text-align: center;
  font-size: 0.9em;
  transition: all 0.2s ease;
  background-color: white;
  box-sizing: border-box;
  font-family: inherit;
  display: inline-block;
  vertical-align: baseline;
  height: 24px;
}

.fill-text-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.fill-text-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.fill-text-input.correct {
  border-color: #28a745;
  background-color: #d4edda;
  color: #155724;
}

.fill-text-input.incorrect {
  border-color: #dc3545;
  background-color: #f8d7da;
  color: #721c24;
}

/* Стили для триггера фидбека */
.feedback-trigger {
  display: inline-block;
  margin-left: 8px;
  cursor: pointer;
  font-size: 1.1em;
  transition: transform 0.2s ease;
  background: none;
  border: none;
  padding: 0;
  filter: grayscale(0.3);
}

.feedback-trigger:hover {
  transform: scale(1.2);
  filter: grayscale(0);
}

.feedback-trigger.correct-feedback:hover {
  filter: hue-rotate(120deg) saturate(1.5);
}

.feedback-trigger.incorrect-feedback:hover {
  filter: hue-rotate(300deg) saturate(1.5);
}

/* Стили для всплывашки */
.feedback-popup {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  margin-top: 8px;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  pointer-events: none;
  min-width: 250px;
  max-width: 300px;
}

.feedback-popup.show {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.feedback-content {
  border-radius: 8px;
  padding: 16px 20px 16px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
  font-size: 0.9em;
  line-height: 1.4;
  word-wrap: break-word;
  white-space: normal;
  overflow-wrap: break-word;
}

/* Стили для правильного попапа */
.feedback-popup.correct-popup .feedback-content {
  background: white;
  border: 2px solid #28a745;
  color: #155724;
}

/* Стили для неправильного попапа */
.feedback-popup.incorrect-popup .feedback-content {
  background: white;
  border: 2px solid #dc3545;
  color: #721c24;
}

.close-feedback {
  position: absolute;
  top: 6px;
  right: 8px;
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-feedback:hover {
  color: inherit;
  background-color: #f8f9fa;
  border-radius: 50%;
}

.feedback-popup.correct-popup .close-feedback:hover {
  color: #28a745;
}

.feedback-popup.incorrect-popup .close-feedback:hover {
  color: #dc3545;
}

.quiz-actions {
  text-align: center;
}

.check-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.2s;
}

.check-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.check-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.result-text {
  margin-top: 16px;
  padding: 12px;
  background-color: #e7f3ff;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
}

/* Стили для Markdown */
.fill-text :deep(strong) {
  font-weight: bold;
}

.fill-text :deep(em) {
  font-style: italic;
}

.fill-text :deep(code) {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}
</style>