<template>
  <div class="select-text">
    <!-- Вопрос -->
    <div class="quiz-header">
      <div class="question" v-html="renderBlock(node?.content?.question || '')"></div>
    </div>

    <!-- Текст со встроенными селектами -->
    <div class="text-container">
      <div class="text-content">
        <template v-for="(part, idx) in parts" :key="idx">
          <!-- обычный фрагмент текста -->
          <span v-if="part.kind === 'text'" v-html="part.html"></span>

          <!-- встроенный селект с обвёртками -->
          <span v-else-if="part.kind === 'select'" class="select-wrap">
            <span class="affix" v-if="part.prefix" v-html="renderInline(part.prefix)"></span>

            <select
              class="inline-select"
              v-model="userSelections[part.task.id]"
              :disabled="showResults"
              :class="{
                correct: showResults && isCorrect(part.task),
                incorrect: showResults && !isCorrect(part.task)
              }"
            >
              <option value="" disabled>---</option>
              <option 
                v-for="opt in part.task.options" 
                :key="opt.id" 
                :value="opt.id"
              >
                {{ opt.content }}
              </option>
            </select>

            <span class="affix" v-if="part.suffix" v-html="renderInline(part.suffix)"></span>

            <!-- Эмодзи с подсказкой только для неправильных ответов -->
            <span 
              v-if="showResults && !isCorrect(part.task) && part.task['feedback-incorrect']" 
              class="feedback-trigger incorrect-feedback"
              @click="toggleFeedback(part.task.id, $event)"
            >
              ℹ️
            </span>

            <!-- Всплывашка с фидбеком -->
            <div 
              v-if="showFeedback === part.task.id" 
              class="feedback-popup incorrect-popup show"
            >
              <div class="feedback-content">
                <span v-html="renderInline(part.task['feedback-incorrect'])"></span>
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
        :disabled="showResults || !allSelected"
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
  name: 'SelectText',
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
      userSelections: {},
      showResults: false,
      showFeedback: null,
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
    },
    allSelected() {
      return this.tasks.every(t => this.userSelections[t.id] && this.userSelections[t.id] !== '')
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
      this.initSelections()
      this.parts = this.parseTextToParts(this.sourceText)
    },

    initSelections() {
      const init = {}
      const subTasks = this.savedState?.subTasks || {}
      let hasRestoredAnswers = false

      for (const t of this.tasks) {
          const attempt = subTasks[t.id]
          if (attempt && attempt.selectedOptionId) {
              init[t.id] = attempt.selectedOptionId
              hasRestoredAnswers = true
          } else {
              init[t.id] = ''
          }
      }
      this.userSelections = init
      
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
        
        if (this.taskMap.has(taskId)) {
          const task = this.getTask(taskId)
          const { prefix, suffix } = this.extractAffixes(task)
          parts.push({ kind: 'select', task, prefix, suffix })
        } else {
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
        correct_option: '',
        options: [],
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

    isCorrect(task) {
      return this.userSelections[task.id] === task.correct_option
    },

    async checkResults() { 
      this.showResults = true 
      this.closeFeedback()
      
      const tasks = this.tasks || []
      
      for (const task of tasks) {
          const isCorrect = this.isCorrect(task)
          const userAnswer = this.userSelections[task.id]
          
          const payload = {
            topicId: this.topicId || this.node.topicId,
            lessonId: this.lessonId || this.node.lessonId,
            lessonVersion: this.lessonVersion,
            ruleId: null,

            taskId: this.node.id, 
            subTaskId: task.id,
            taskType: 'SelectText',
            answerType: 'select',
            taskVersion: this.node.taskVersion || null,
            skillId: this.node.skill_id || null, 

            selectedOptionId: userAnswer || null,
            userAnswerIsCorrect: isCorrect,

            correctOptions: 1,
            incorrectOptions: task.options ? task.options.length - 1 : 0,
            selectedCorrectOptions: isCorrect ? 1 : 0,
            selectedIncorrectOptions: isCorrect ? 0 : 1,
            
            responseMs: Date.now() - this.startTime
          }

        try {
            await AnalyticsService.logAttempt(payload)
        } catch (e) {
            console.error('Failed to log SelectText attempt', e)
        }
      }
    },

    toggleFeedback(taskId, event) {
      if (event) event.stopPropagation()
      this.showFeedback = this.showFeedback === taskId ? null : taskId
    },
    
    closeFeedback() {
      this.showFeedback = null
    },
    
    handleClickOutside(event) {
      if (this.showFeedback && !event.target.closest('.select-wrap')) {
        this.closeFeedback()
      }
    }
  }
}
</script>

<style scoped>
.select-text {
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
  font-size: 1.05em;
  line-height: 1.8;
  text-align: justify;
}

.select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  white-space: nowrap;
}

.affix {
  display: inline-block;
  line-height: 1.6;
}

.inline-select {
  border: 2px solid #6c757d;
  border-radius: 6px;
  padding: 2px 24px 2px 8px; /* Room for custom arrow */
  margin: 0 4px;
  font-size: 0.95em;
  transition: all 0.2s ease;
  background-color: white;
  font-family: inherit;
  display: inline-block;
  vertical-align: baseline;
  height: 30px;
  cursor: pointer;
  
  /* Custom Arrow styling */
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 14px;
}

.inline-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.inline-select:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.9;
}

.inline-select.correct {
  border-color: #28a745;
  background-color: #d4edda;
  color: #155724;
}

.inline-select.incorrect {
  border-color: #dc3545;
  background-color: #f8d7da;
  color: #721c24;
}

.feedback-trigger {
  display: inline-block;
  margin-left: 6px;
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

.feedback-trigger.incorrect-feedback:hover {
  filter: hue-rotate(300deg) saturate(1.5);
}

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
}

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
.select-text :deep(strong) { font-weight: bold; }
.select-text :deep(em) { font-style: italic; }
.select-text :deep(code) {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}
.select-text :deep(.feedback-content p) {
  margin: 0;
}
</style>
