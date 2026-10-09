<template>
  <div class="fill-table">
    <!-- Индикатор прогресса -->
    <div class="progress-indicator" v-if="!showResults">
      Группа {{ currentGroupIndex + 1 }}/{{ groupCount }}
    </div>
    
    <!-- Основной вопрос -->
    <div class="quiz-header">
      <div class="question" v-html="renderedQuestion"></div>
    </div>
    
    <!-- Текущая группа заданий -->
    <div v-if="!showResults && initialized && userAnswers[currentGroupId]" class="current-group">
      <!-- Таблица с текущей группой -->
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr>
              <th 
                v-for="(header, index) in node.content.table.headers" 
                :key="index"
                class="table-header"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          
          <tbody>
            <tr 
              v-for="(row, rowIndex) in currentGroupRows" 
              :key="row.id"
              class="table-row"
            >
              <!-- Столбец с заданием -->
              <td class="task-cell">
                <div v-html="renderTask(row.task)" class="task-content"></div>
              </td>
              
              <!-- Столбец с полем ввода -->
              <td class="input-cell">
                <input
                  v-model="userAnswers[currentGroupId][rowIndex]"
                  @keydown="handleKeydown($event, rowIndex)"
                  :ref="el => setInputRef(currentGroupId, rowIndex, el)"
                  :placeholder="getPlaceholder(row.input)"
                  :disabled="showGroupResults"
                  class="answer-input"
                  type="text"
                />
              </td>
              
              <!-- Столбец с результатом -->
              <td class="result-cell">
                <div 
                  v-if="showGroupResults"
                  class="result-indicator"
                  :class="isRowCorrect(currentGroupId, rowIndex) ? 'correct' : 'incorrect'"
                >
                  <!-- Иконка результата -->
                  <span class="result-icon">
                    <span v-if="isRowCorrect(currentGroupId, rowIndex)" class="correct-icon">✓</span>
                    <span v-else class="incorrect-icon">✕</span>
                  </span>
                  
                  <!-- Текст фидбека -->
                  <span class="feedback-text">
                    {{ isRowCorrect(currentGroupId, rowIndex) 
                        ? row.input['feedback-correct'] 
                        : row.input['feedback-incorrect'] 
                    }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Кнопки действий -->
      <div class="quiz-actions">
        <!-- Кнопка проверки текущей группы -->
        <button 
          v-if="!showGroupResults"
          @click="checkCurrentGroup" 
          class="check-button"
        >
          {{ node.content.button_text || 'Проверить' }}
        </button>
        
        <!-- Кнопка следующей группы -->
        <button 
          v-if="showGroupResults && hasNextGroup"
          @click="nextGroup" 
          class="next-button"
        >
          {{ node.content.button_next_text || 'Следующее задание' }}
        </button>

        <!-- Кнопка завершения -->
        <button
          v-if="showGroupResults && !hasNextGroup"
          @click="finishQuiz"
          class="next-button"
        >
          {{ node.content.button_finish_text || 'Завершить' }}
        </button>
      </div>
    </div>
    
    <!-- Результаты после всех групп -->
    <div v-if="showResults" class="results-container">
      <h3>Результаты выполнения</h3>
      
      <!-- Сводная таблица результатов -->
      <div class="summary-results">
        <div class="result-item" v-for="(group, groupId) in taskGroups" :key="groupId">
          <h4>Группа {{ getGroupNumber(groupId) }}</h4>
          <table class="results-table">
            <tbody>
              <tr v-for="(row, rowIndex) in group" :key="row.id">
                <td class="condition-cell">{{ stripMarkdown(row.task) }}</td>
                <td class="answer-cell">
                  <span class="status-icon" :class="isRowCorrect(groupId, rowIndex) ? 'correct' : 'incorrect'">
                    {{ isRowCorrect(groupId, rowIndex) ? '✓' : '✕' }}
                  </span>
                  {{ getUserAnswer(groupId, rowIndex) || '(не ответил)' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Общий результат -->
      <div v-if="node.content.result_text" class="final-result-text">
        {{ node.content.result_text }}
      </div>
    </div>
  </div>
</template>

<script>
import MarkdownIt from 'markdown-it'
import { AnalyticsService } from '@/utils/AnalyticsService'

export default {
  name: 'FillTable',
  props: {
    node: {
      type: Object,
      required: true
    },
    lessonId: {
      type: String,
      default: ''
    },
    topicId: {
      type: String,
      default: ''
    },
    lessonVersion: {
      type: String,
      default: null
    },
    savedState: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      currentGroupIndex: 0,
      showGroupResults: false,
      showResults: false,
      initialized: false,
      userAnswers: {},
      inputRefs: {},
      startTime: Date.now()
    }
  },
  computed: {
    renderedQuestion() {
    const q = this.node?.content?.question || ''
    const md = new MarkdownIt({ html: true, linkify: true, breaks: true })
    return md.render(q)
    },
    
    // Группируем задания по groupId
    taskGroups() {
      const groups = {}
      const rows = this.node?.content?.table?.rows || []
        rows.forEach(row => {
        if (!groups[row.groupId]) {
          groups[row.groupId] = []
        }
        groups[row.groupId].push(row)
      })
      return groups
    },
    
    // ID текущей группы
    currentGroupId() {
      return Object.keys(this.taskGroups)[this.currentGroupIndex]
    },
    
    // Задания текущей группы
    currentGroupRows() {
      return this.taskGroups[this.currentGroupId] || []
    },
    
    // Количество групп
    groupCount() {
      return Object.keys(this.taskGroups).length
    },
    
    // Есть ли следующая группа
    hasNextGroup() {
      return this.currentGroupIndex < this.groupCount - 1
    }
  },
  watch: {
    currentGroupIndex() {
      // Re-initialize only if not already done, but here we generally rely on initAllAnswers
      if (!this.userAnswers[this.currentGroupId]) {
          this.initializeGroupAnswers(this.currentGroupId)
      }
      
      // Fix: Check if this group has saved attempts before resetting showGroupResults
      const rows = this.taskGroups[this.currentGroupId] || []
      const subTasks = this.savedState?.subTasks || {}
      // Check if ANY attempts exist for this group in the saved state
      const hasSavedAttempts = rows.some(row => subTasks[row.id])
      
      this.showGroupResults = hasSavedAttempts
    }
  },
  created() {
    this.initializeAllAnswers()
    this.initialized = true
  },
  methods: {
    // Инициализация ответов для всех групп
    initializeAllAnswers() {
      const groupIds = Object.keys(this.taskGroups)
      let lastActiveGroupIndex = 0

      groupIds.forEach((groupId, index) => {
        this.initializeGroupAnswers(groupId)
        
        // Check if this group has restored answers
        const hasAnswers = this.userAnswers[groupId].some(ans => ans !== '')
        if (hasAnswers) {
            lastActiveGroupIndex = index
        }
      })
      
      // If we have restored answers, determine where to start
      // If the last active group is fully solved (or attempted), we might want to move to the next one
      // For now, let's just go to the last active group, or the next one if it's completed in the future logic
      
      // Simple logic: if group 1 is done, go to group 2.
      if (lastActiveGroupIndex < groupIds.length) {
         // Check if the group is fully correct/done
         const groupId = groupIds[lastActiveGroupIndex]
         const rows = this.taskGroups[groupId]
         const subTasks = this.savedState?.subTasks || {}
         
         const allSolved = rows.every(row => {
             const attempt = subTasks[row.id]
             return attempt && attempt.isCorrect
         })
         
         // Fix: Check if ANY attempts exist for this group to show results
         const hasAttempts = rows.some(row => subTasks[row.id])

         if (allSolved) {
             if (lastActiveGroupIndex < groupIds.length - 1) {
                 this.currentGroupIndex = lastActiveGroupIndex + 1
             } else {
                 this.currentGroupIndex = lastActiveGroupIndex
                 this.showResults = true
                 this.showGroupResults = true
             }
         } else {
             this.currentGroupIndex = lastActiveGroupIndex
             if (hasAttempts) {
                 this.showGroupResults = true
             }
         }
      }
    },
    
    // Инициализация ответов для конкретной группы
    initializeGroupAnswers(groupId = this.currentGroupId) {
      const groupRows = this.taskGroups[groupId]
      if (!this.userAnswers[groupId]) {
        this.userAnswers[groupId] = []
      }
      
      const subTasksState = this.savedState?.subTasks || {}
      
      // Инициализируем массив ответов для группы
      this.userAnswers[groupId] = groupRows.map(row => {
          const attempt = subTasksState[row.id]
          if (attempt && attempt.answerText) {
              return attempt.answerText
          }
          return ''
      })
    },
    
    renderTask(task) {
      if (!task) return ''
      const md = new MarkdownIt({
        html: true,
        linkify: true,
        breaks: true,
      })
      return md.render(task)
    },
    
    stripMarkdown(text) {
      // Упрощенное удаление markdown разметки
      return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
    },
    
    getPlaceholder(inputConfig) {
      return inputConfig.placeholder || 'впишите ответ'
    },
    
    setInputRef(groupId, rowIndex, el) {
      if (!this.inputRefs[groupId]) {
        this.inputRefs[groupId] = {}
      }
      this.inputRefs[groupId][rowIndex] = el
    },
    
    handleKeydown(event, rowIndex) {
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        this.focusNextInput(rowIndex)
      }
    },
    
    focusNextInput(currentRowIndex) {
      const nextIndex = currentRowIndex + 1
      if (nextIndex < this.currentGroupRows.length && this.inputRefs[this.currentGroupId]?.[nextIndex]) {
        this.inputRefs[this.currentGroupId][nextIndex].focus()
      }
    },
    
    async checkCurrentGroup() {
      this.showGroupResults = true
      
      const rows = this.currentGroupRows || []
      
      for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const isCorrect = this.isRowCorrect(this.currentGroupId, i)
          const userAnswer = this.getUserAnswer(this.currentGroupId, i)
          
          const payload = {
            // Context
            topicId: this.topicId || this.node.topicId,
            lessonId: this.lessonId || this.node.lessonId,
            lessonVersion: this.lessonVersion,
            ruleId: null,

            taskId: this.node.id, // Parent Task ID (Table ID)
            subTaskId: row.id, // Row ID e.g. l2-n12-filt-zzip-r1
            taskType: 'FillTable',
            answerType: 'input',
            taskVersion: this.node.taskVersion || null,
            skillId: this.node.skill_id || null,

            // Answer
            answerText: userAnswer,
            userAnswerIsCorrect: isCorrect,

            // Counters (not applicable for input)
            correctOptions: null, 
            incorrectOptions: null,
            selectedCorrectOptions: null,
            selectedIncorrectOptions: null,
            
            responseMs: Date.now() - this.startTime
          }

        try {
            await AnalyticsService.logAttempt(payload)
        } catch (e) {
            console.error('Failed to log FillTable attempt', e)
        }
      }
    },
    
    normalize(s) {
      return (s ?? '').toString().trim().toLowerCase()
    },

    isRowCorrect(groupId, rowIndex) {
      const userAnswer = this.normalize(this.userAnswers[groupId]?.[rowIndex])
      const correctAnswers = this.taskGroups[groupId]?.[rowIndex]?.input?.correctAnswers || []
        if (correctAnswers.length === 0) return false
        return correctAnswers.map(this.normalize).some(ans => ans === userAnswer)
    },
    
    getUserAnswer(groupId, rowIndex) {
      return this.userAnswers[groupId]?.[rowIndex] || ''
    },
    
    nextGroup() {
      this.currentGroupIndex++
      this.startTime = Date.now() // Reset timer for next group
    },
    
    finishQuiz() {
      this.showResults = true
    },
    
    getGroupNumber(groupId) {
      return Object.keys(this.taskGroups).indexOf(groupId) + 1
    }
  }
}
</script>

<style scoped>
.fill-table {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  border: 1px solid #e9ecef;
  position: relative;
}

/* Индикатор прогресса */
.progress-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: #007bff;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: bold;
}

.quiz-header {
  margin-bottom: 20px;
  margin-right: 100px; /* Место для индикатора прогресса */
}

.question {
  font-size: 1.1em;
  line-height: 1.5;
  font-weight: 500;
}

/* Анимация смены групп */
.current-group {
  transition: opacity 0.3s ease;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 20px;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.4;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-header {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #495057;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 2px solid #dee2e6;
}

.table-row {
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background-color: #f8f9fa;
}

.task-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: top;
}

.input-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: top;
  width: 200px;
}

.result-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: top;
  width: 250px;
}

.task-content {
  line-height: 1.5;
}

.answer-input {
  width: 100%;
  border: 2px solid #6c757d;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-family: inherit;
}

.answer-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.answer-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
  border-color: #adb5bd;
}

.result-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9em;
  line-height: 1.4;
}

.result-indicator.correct {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.result-indicator.incorrect {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f1b0b7;
}

.result-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  font-weight: bold;
  flex-shrink: 0;
}

.correct-icon {
  color: #155724;
  font-size: 14px;
}

.incorrect-icon {
  color: #721c24;
  font-size: 12px;
}

.feedback-text {
  flex: 1;
}

/* Кнопки действий */
.quiz-actions {
  text-align: center;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.check-button, .next-button {
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.2s;
  border: none;
}

.check-button {
  background-color: #007bff;
  color: white;
}

.check-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.check-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.next-button {
  background-color: #28a745;
  color: white;
}

.next-button:hover {
  background-color: #218838;
}

/* Стили для результатов */
.results-container {
  animation: fadeIn 0.5s ease;
}

.summary-results {
  margin: 20px 0;
}

.result-item {
  margin-bottom: 30px;
}

.result-item h4 {
  margin-bottom: 12px;
  color: #495057;
  border-bottom: 2px solid #007bff;
  padding-bottom: 6px;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.results-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #dee2e6;
}

.condition-cell {
  font-weight: 500;
  width: 60%;
}

.answer-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 40%;
}

.status-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.status-icon.correct {
  background-color: #28a745;
}

.status-icon.incorrect {
  background-color: #dc3545;
}

.final-result-text {
  margin-top: 20px;
  padding: 16px;
  background-color: #e7f3ff;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
}

/* Анимации */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Стили для Markdown */
.fill-table :deep(strong) {
  font-weight: bold;
}

.fill-table :deep(em) {
  font-style: italic;
}

.fill-table :deep(code) {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .fill-table {
    padding: 16px;
  }
  
  .progress-indicator {
    position: static;
    display: inline-block;
    margin-bottom: 16px;
  }
  
  .quiz-header {
    margin-right: 0;
  }
  
  .table-container {
    font-size: 12px;
  }
  
  .task-cell,
  .input-cell,
  .result-cell {
    padding: 8px 12px;
  }
  
  .result-indicator {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .quiz-actions {
    flex-direction: column;
  }
}
</style>