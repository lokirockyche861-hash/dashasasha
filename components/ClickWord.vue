<template>
  <div class="click-word">
    <!-- Вопрос -->
    <div class="quiz-header" v-if="node?.content?.question">
      <div class="question" v-html="renderBlock(node.content.question)"></div>
    </div>

    <!-- Вертикальный список слов-задач -->
    <div class="tasks-container">
      <div 
        v-for="task in tasks" 
        :key="task.id" 
        class="word-row"
      >
        <div class="chars-container">
          <span 
            v-for="(char, idx) in task.text" 
            :key="idx" 
            :class="getCharClass(task, idx, char)"
            :tabindex="char === ' ' || showResults ? -1 : 0"
            @click="toggleChar(task.id, idx, char)"
            @keydown.space.prevent="toggleChar(task.id, idx, char)"
            @keydown.enter.prevent="toggleChar(task.id, idx, char)"
          >
            {{ char === ' ' ? '&nbsp;' : char }}
          </span>
        </div>

        <!-- Кнопка фидбека для неверного ответа -->
        <span 
          v-if="showResults && !isCorrect(task) && task['feedback-incorrect']" 
          class="feedback-trigger incorrect-feedback"
          @click="toggleFeedback(task.id, $event)"
        >
          ℹ️
        </span>

        <!-- Всплывашка с фидбеком -->
        <div 
          v-if="showFeedback === task.id" 
          class="feedback-popup incorrect-popup show"
        >
          <div class="feedback-content">
            <span v-html="renderInline(task['feedback-incorrect'])"></span>
            <button class="close-feedback" @click="closeFeedback">×</button>
          </div>
        </div>
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

    <!-- Общий результат (result_text) -->
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
  name: 'ClickWord',
  props: {
    node: { type: Object, required: true },
    lessonId: { type: String, default: '' },
    topicId: { type: String, default: '' },
    lessonVersion: { type: String, default: null },
    savedState: { type: Object, default: null }
  },
  data() {
    return {
      userSelections: {}, // taskId -> Array of selected indices
      showResults: false,
      showFeedback: null,
      startTime: Date.now()
    }
  },
  computed: {
    tasks() {
      return this.node?.content?.tasks ?? []
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
    },

    initSelections() {
      const init = {}
      const subTasks = this.savedState?.subTasks || {}
      let hasRestoredAnswers = false

      for (const t of this.tasks) {
          const attempt = subTasks[t.id]
          if (attempt && attempt.selectedOptionIds && attempt.selectedOptionIds.length > 0) {
              // Parse strings back to ints
              init[t.id] = attempt.selectedOptionIds.map(id => parseInt(id, 10))
              hasRestoredAnswers = true
          } else {
              init[t.id] = []
          }
      }
      this.userSelections = init
      
      if (hasRestoredAnswers) {
          // If we had a partial answer or saved state with 0 selections, 
          // we might only set showResults if there's any completed item.
          // Since it's multi-select, even 0 can be a valid state if saved,
          // but typically we only save on Check.
          this.showResults = true
      }
    },

    toggleChar(taskId, idx, char) {
      if (this.showResults) return
      if (char === ' ') return // spaces are not clickable
      
      const selections = this.userSelections[taskId] || []
      const indexPosition = selections.indexOf(idx)
      
      if (indexPosition > -1) {
        // Remove selection
        this.userSelections[taskId] = selections.filter(i => i !== idx)
      } else {
        // Add selection
        this.userSelections[taskId] = [...selections, idx].sort((a, b) => a - b)
      }
    },

    getCharClass(task, idx, char) {
      if (char === ' ') return 'char-space'
      
      const isSelected = (this.userSelections[task.id] || []).includes(idx)
      const isCorrectExpected = (task.correct_indices || []).includes(idx)
      
      let classes = ['char', 'char-clickable']
      
      if (!this.showResults) {
        if (isSelected) classes.push('char-selected')
        return classes.join(' ')
      }
      
      // showResults is true
      if (isSelected) {
        if (isCorrectExpected) {
          classes.push('char-correct-selected')
        } else {
          classes.push('char-incorrect-selected')
        }
      } else {
        if (isCorrectExpected) {
          classes.push('char-missed')
        }
      }
      
      return classes.join(' ')
    },

    isCorrect(task) {
      const userSelected = this.userSelections[task.id] || []
      const correctExpected = task.correct_indices || []
      
      if (userSelected.length !== correctExpected.length) return false
      
      const userSorted = [...userSelected].sort((a,b) => a - b)
      const expectedSorted = [...correctExpected].sort((a,b) => a - b)
      
      for (let i = 0; i < userSorted.length; i++) {
        if (userSorted[i] !== expectedSorted[i]) return false
      }
      return true
    },

    async checkResults() { 
      this.showResults = true 
      this.closeFeedback()
      
      for (const task of this.tasks) {
          const isCorrect = this.isCorrect(task)
          const userSelected = this.userSelections[task.id] || []
          const correctExpected = task.correct_indices || []
          
          let selectedCorrectCount = 0
          let selectedIncorrectCount = 0
          
          userSelected.forEach(idx => {
            if (correctExpected.includes(idx)) {
              selectedCorrectCount++
            } else {
              selectedIncorrectCount++
            }
          })
          
          const payload = {
            topicId: this.topicId || this.node.topicId,
            lessonId: this.lessonId || this.node.lessonId,
            lessonVersion: this.lessonVersion,
            ruleId: null,

            taskId: this.node.id, 
            subTaskId: task.id,
            taskType: 'ClickWord',
            answerType: 'multi-select',
            taskVersion: this.node.taskVersion || null,
            skillId: this.node.skill_id || null, 

            selectedOptionIds: userSelected.map(String),
            userAnswerIsCorrect: isCorrect,

            correctOptions: correctExpected.length,
            incorrectOptions: task.text.replace(/ /g, '').length - correctExpected.length,
            selectedCorrectOptions: selectedCorrectCount,
            selectedIncorrectOptions: selectedIncorrectCount,
            
            responseMs: Date.now() - this.startTime
          }

        try {
            await AnalyticsService.logAttempt(payload)
        } catch (e) {
            console.error('Failed to log ClickWord attempt', e)
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
      if (this.showFeedback && !event.target.closest('.word-row')) {
        this.closeFeedback()
      }
    }
  }
}
</script>

<style scoped>
.click-word {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  border: 1px solid #e9ecef;
}

.quiz-header {
  margin-bottom: 24px;
}

.question {
  font-size: 1.1em;
  line-height: 1.5;
  font-weight: 500;
}

.tasks-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.word-row {
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.chars-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-family: 'Courier New', monospace; /* Monospace is good for letter selections */
  font-size: 1.3em;
  line-height: 1.8;
  user-select: none;
}

/* Character Base */
.char {
  display: inline-block;
  min-width: 0.8em;
  text-align: center;
  padding: 2px 4px;
  margin: 0 1px;
  border-radius: 4px;
  font-weight: bold;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

/* Spaces */
.char-space {
  display: inline-block;
  width: 0.4em;
  cursor: default;
}

/* Clickable Default */
.char-clickable {
  cursor: pointer;
  background-color: transparent;
  color: #333;
}

.char-clickable:hover {
  background-color: #e2e6ea;
  border-color: #dae0e5;
}

/* Focused (Keyboard Accessibility) */
.char-clickable:focus {
  outline: none;
  border-color: #86b7fe;
  background-color: #e2e6ea;
}

/* Selected prior to checking */
.char-selected {
  background-color: #0d6efd;
  color: white;
  border-color: #0a58ca;
}

.char-selected:hover {
  background-color: #0b5ed7;
  border-color: #0a58ca;
}

/* Verified States */
.char-correct-selected {
  background-color: #198754;
  color: white;
  border-color: #146c43;
  cursor: default;
}

.char-incorrect-selected {
  background-color: #dc3545;
  color: white;
  border-color: #b02a37;
  cursor: default;
}

.char-missed {
  position: relative;
  cursor: default;
}

.char-missed::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  width: 80%;
  height: 3px;
  background-color: #198754;
  border-radius: 2px;
}

/* Feedback Elements */
.feedback-trigger {
  display: inline-block;
  margin-left: 6px;
  cursor: pointer;
  font-size: 1.1em;
  transition: transform 0.2s ease;
  background: none;
  border: none;
  padding: 0;
  filter: grayscale(0); /* always bright because it only shows on error */
}

.feedback-trigger:hover {
  transform: scale(1.2);
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
  background: white;
  border-radius: 8px;
  padding: 16px 20px 16px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
  font-size: 0.9em;
  line-height: 1.4;
  word-wrap: break-word;
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
  color: #dc3545;
  background-color: #f8f9fa;
  border-radius: 50%;
}

/* Global Actions */
.quiz-actions {
  margin-top: 16px;
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

/* Markdown typography */
.click-word :deep(strong) { font-weight: bold; }
.click-word :deep(em) { font-style: italic; }
.click-word :deep(code) {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}
.click-word :deep(.feedback-content p) {
  margin: 0;
}
</style>
