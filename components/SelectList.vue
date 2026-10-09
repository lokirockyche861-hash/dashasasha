<template>
  <div class="select-list">
    <!-- Основной вопрос -->
    <div class="quiz-header">
      <div class="question" v-html="renderedQuestion"></div>
    </div>
    
    <!-- Список заданий с выпадающими списками -->
    <div class="tasks-container">
      <div 
        v-for="task in tasks" 
        :key="task.id"
        class="task-item"
        :class="{
          'correct': showResults && isTaskCorrect(task.id),
          'incorrect': showResults && !isTaskCorrect(task.id),
          'unchecked': !showResults
        }"
      >
        <!-- Контейнер задачи и выпадающего списка в одной строке -->
        <div class="task-row">
          <!-- Условие задания -->
          <div class="task-content" v-html="renderTask(task.content)"></div>
          
          <!-- Выпадающий список -->
          <div class="select-wrapper">
            <select 
              v-model="userSelections[task.id]"
              :disabled="showResults"
              class="task-select"
              :class="{
                'correct': showResults && isTaskCorrect(task.id),
                'incorrect': showResults && !isTaskCorrect(task.id)
              }"
            >
              <option value="" disabled>Выберите вариант...</option>
              <option 
                v-for="option in options" 
                :key="option.id" 
                :value="option.id"
                class="select-option"
              >
                {{ option.content }}
                <span v-if="node.content.selected && isOptionUsed(option.id) && userSelections[task.id] !== option.id" class="option-checkmark">
                  ✓
                </span>
              </option>
            </select>
            
            <!-- Иконка использования опции (только в режиме selected) -->
            <div 
              v-if="node.content.selected && userSelections[task.id] && isOptionUsedElsewhere(task.id, userSelections[task.id])"
              class="option-used-hint"
            >
              ✓
            </div>
          </div>
        </div>
        
        <!-- Фидбек после проверки -->
        <div v-if="showResults" class="task-feedback">
          <div 
            class="feedback-text"
            :class="isTaskCorrect(task.id) ? 'correct-feedback' : 'incorrect-feedback'"
            v-html="renderFeedback(task)"
          ></div>
        </div>
      </div>
    </div>
    
    <!-- Кнопки действий -->
    <div class="quiz-actions">
      <button 
        v-if="!showResults"
        @click="checkResults" 
        class="check-button"
        :disabled="!allTasksSelected"
      >
        {{ node.content.button_text || 'Проверить' }}
      </button>
      
      <button 
        v-if="showResults"
        @click="resetSelections" 
        class="reset-button"
      >
        Попробовать снова
      </button>
    </div>
    
    <!-- Общий результат -->
    <div 
      v-if="showResults && node.content.result_text" 
      class="final-result"
      v-html="renderedResultText"
    ></div>
  </div>
</template>

<script>
import MarkdownIt from 'markdown-it'
import { AnalyticsService } from '@/utils/AnalyticsService'

export default {
  name: 'SelectList',
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
      userSelections: {},
      showResults: false,
      md: new MarkdownIt({ html: true, linkify: true, breaks: true }),
      startTime: Date.now()
    }
  },
  computed: {
    renderedQuestion() {
      return this.md.render(this.node?.content?.question || '')
    },
    
    renderedResultText() {
      return this.md.render(this.node?.content?.result_text || '')
    },
    
    options() {
      return this.node?.content?.options || []
    },
    
    tasks() {
      return this.node?.content?.tasks || []
    },
    
    allTasksSelected() {
      return this.tasks.every(task => 
        this.userSelections[task.id] && this.userSelections[task.id] !== ''
      )
    },
    
    optionById() {
      const map = {}
      this.options.forEach(option => {
        map[option.id] = option
      })
      return map
    }
  },
  methods: {
    renderTask(content) {
      return this.md.render(content || '')
    },
    
    renderFeedback(task) {
      const feedback = this.isTaskCorrect(task.id) 
        ? task['feedback-correct'] 
        : task['feedback-incorrect']
      return this.md.render(feedback || '')
    },
    
    initSelections() {
      const selections = {}
      const subTasks = this.savedState?.subTasks || {}
      let hasRestoredSelections = false

      this.tasks.forEach(task => {
        const attempt = subTasks[task.id]
        if (attempt && attempt.selectedOptionId) {
            selections[task.id] = attempt.selectedOptionId
            hasRestoredSelections = true
        } else {
            selections[task.id] = ''
        }
      })
      this.userSelections = selections
      
      if (hasRestoredSelections) {
          this.showResults = true
      }
    },
    
    async checkResults() {
      this.showResults = true
      
      const tasks = this.tasks || []
      
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        const taskId = task.id
        const selectedOptionId = this.userSelections[taskId]
        const isCorrect = this.isTaskCorrect(taskId)
        
        // Count correct/incorrect (always 1 or 0 for single select sub-task)
        const correctOptions = 1
        const incorrectOptions = this.options.length - 1
        const selectedCorrect = isCorrect ? 1 : 0
        const selectedIncorrect = isCorrect ? 0 : (selectedOptionId ? 1 : 0)

        const payload = {
            // Context
            topicId: this.topicId || this.node.topicId,
            lessonId: this.lessonId || this.node.lessonId,
            lessonVersion: this.lessonVersion,
            ruleId: null,

            taskId: this.node.id, // Parent Task ID
            subTaskId: taskId,    // Sub-task ID
            taskType: 'SelectList',
            answerType: 'select',
            taskVersion: this.node.taskVersion || null,
            skillId: this.node.skill_id || null, 

            // Answer
            selectedOptionId: selectedOptionId || null,
            userAnswerIsCorrect: isCorrect,

            // Counters
            correctOptions: correctOptions,
            incorrectOptions: incorrectOptions,
            selectedCorrectOptions: selectedCorrect,
            selectedIncorrectOptions: selectedIncorrect,
            
            responseMs: Date.now() - this.startTime
        }

        try {
            await AnalyticsService.logAttempt(payload)
        } catch (e) {
            console.error('Failed to log SelectList attempt', e)
        }
      }
    },
    
    resetSelections() {
      this.initSelections()
      this.showResults = false
    },
    
    isTaskCorrect(taskId) {
      const task = this.tasks.find(t => t.id === taskId)
      if (!task) return false
      return this.userSelections[taskId] === task.correct_option
    },
    
    getOptionContent(optionId) {
      return this.optionById[optionId]?.content || ''
    },
    
    // Проверяет, используется ли опция в любом задании
    isOptionUsed(optionId) {
      return Object.values(this.userSelections).includes(optionId)
    },
    
    // Проверяет, используется ли опция в другом задании (не в текущем)
    isOptionUsedElsewhere(currentTaskId, optionId) {
      return Object.keys(this.userSelections).some(taskId => 
        taskId !== currentTaskId && this.userSelections[taskId] === optionId
      )
    }
  },
  created() {
    this.initSelections()
  }
}
</script>

<style scoped>
.select-list {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  border: 1px solid #e9ecef;
}

.quiz-header {
  margin-bottom: 20px;
}

.question {
  font-size: 1.1em;
  line-height: 1.5;
  font-weight: 500;
}

.tasks-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  background-color: white;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  min-height: auto;
}

.task-item.unchecked {
  border-color: #e9ecef;
}

.task-item.correct {
  border-color: #28a745;
  background-color: #f8fff9;
}

.task-item.incorrect {
  border-color: #dc3545;
  background-color: #fff8f8;
}

/* Контейнер для задачи и выпадающего списка в одной строке */
.task-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 0px;
}

/* Контейнер для текста задачи - занимает 50% ширины */
.task-content {
  flex: 1;
  font-weight: 500;
  line-height: 1.4;
  margin: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  min-width: 0; /* Важно для правильного переноса в flex-контейнере */
}

/* Контейнер для выпадающего списка и иконки - занимает 50% ширины */
.select-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.task-select {
  padding: 6px 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.95em;
  background-color: white;
  flex: 1;
  transition: all 0.3s ease;
  min-width: 0;
  min-height: 34px;
  line-height: inherit;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* Стили для раскрытого списка */
.task-select:focus {
  outline: none;
  border-color: #007bff;
}

.task-select.correct {
  border-color: #28a745;
  background-color: #d4edda;
}

.task-select.incorrect {
  border-color: #dc3545;
  background-color: #f8d7da;
}

.task-select:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

/* Стили для опций в выпадающем списке */
.task-select option.select-option {
  padding: 4px;
}

/* Убираем последнюю границу */
.task-select option.select-option:last-child {
  border-bottom: none;
}

/* Стили для галочки внутри option */
.option-checkmark {
  color: #28a745;
  font-weight: bold;
  margin-left: 8px;
  font-size: 1em;
}

/* Иконка использования опции */
.option-used-hint {
  color: #28a745;
  font-weight: bold;
  font-size: 1.2em;
  width: 20px;
  text-align: center;
  margin-top: 8px;
  flex-shrink: 0;
}

.task-feedback {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e9ecef;
}

.feedback-text {
  padding: 8px 12px;
  border-radius: 6px;
  line-height: 1.3;
  word-wrap: break-word;
  overflow-wrap: break-word;
  font-size: 0.9em;
}

.correct-feedback {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.incorrect-feedback {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.quiz-actions {
  text-align: center;
  margin: 20px 0 12px 0;
}

.check-button, .reset-button {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.95em;
  cursor: pointer;
  transition: background-color 0.2s;
  border: none;
  min-width: 120px;
  line-height: 1.4;
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

.reset-button {
  background-color: #6c757d;
  color: white;
}

.reset-button:hover {
  background-color: #545b62;
}

.final-result {
  margin-top: 16px;
  padding: 14px;
  background-color: #e7f3ff;
  border-radius: 6px;
  text-align: left;
  font-weight: 500;
  line-height: 1.5;
}

/* Анимации */
.task-item {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Стили для Markdown внутри компонента */
.select-list :deep(.question) strong {
  font-weight: 600;
}

.select-list :deep(.task-content) strong {
  font-weight: 600;
}

.select-list :deep(.final-result) strong {
  font-weight: 600;
}

.select-list :deep(.final-result) em {
  font-style: italic;
}

/* Удаление отступов по умолчанию у параграфов от Markdown */
.select-list :deep(.feedback-text p),
.select-list :deep(.task-content p),
.select-list :deep(.final-result p) {
  margin: 0;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .select-list {
    padding: 16px;
  }
  
  .task-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .task-content,
  .select-wrapper {
    flex: none;
    width: 100%;
  }
  
  .quiz-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .check-button, .reset-button {
    width: 100%;
  }
}

/* Улучшенные стили для выпадающего списка в разных браузерах */
.task-select::-ms-expand {
  display: none;
}

.task-select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}
</style>