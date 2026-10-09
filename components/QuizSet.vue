<template>
  <div class="quiz-set">
    <!-- Прогресс в правом верхнем углу -->
    <div class="progress-indicator" v-if="!showResults">
      {{ currentTaskIndex + 1 }}/{{ node.content.tasks.length }}
    </div>
    
    <!-- Основной вопрос -->
    <div class="quiz-header">
      <div class="question" v-html="renderedQuestion"></div>
    </div>
    
    <!-- Текущее задание -->
    <div class="current-task" v-if="!showResults">
      <!-- Условие текущего задания -->
      <div class="task-content" v-html="renderMarkdown(currentTask.content)">
      </div>
      
      <!-- Опции выбора -->
      <div class="options-container">
        <div 
          v-for="option in node.content.options" 
          :key="option.id"
          class="option"
          :class="{ 
            selected: selectedOption === option.id,
            correct: showTaskResults && currentTask.correct_option === option.id,
            incorrect: showTaskResults && selectedOption === option.id && selectedOption !== currentTask.correct_option
          }"
        >
          <label class="option-label">
            <input
              type="radio"
              :name="'quiz-' + quizId"
              :value="option.id"
              v-model="selectedOption"
              :disabled="showTaskResults"
              class="option-input"
            />
            <span class="custom-checkbox radio"></span>
            <span class="option-content" v-html="renderMarkdownInline(option.content)"></span>
          </label>
          
          <!-- Фидбек для текущего задания -->
          <div 
            v-if="showTaskResults && selectedOption === option.id && (selectedOption === currentTask.correct_option ? currentTask['feedback-correct'] : currentTask['feedback-incorrect'])" 
            class="option-feedback"
            :class="selectedOption === currentTask.correct_option ? 'correct-feedback' : 'incorrect-feedback'"
            v-html="renderMarkdownInline(selectedOption === currentTask.correct_option ? currentTask['feedback-correct'] : currentTask['feedback-incorrect'])"
          >
          </div>
        </div>
      </div>
      
      <!-- Кнопки действий -->
      <div class="quiz-actions">
        <!-- Кнопка проверки (исчезает после нажатия) -->
        <button 
          v-if="!showTaskResults"
          @click="checkAnswer" 
          class="check-button"
          :disabled="!selectedOption"
        >
          {{ node.content.button_text || 'Проверить' }}
        </button>
        
        <!-- Кнопка следующего задания (видна всегда кроме последнего) -->
        <button 
          v-if="showTaskResults && hasNextTask"
          @click="nextTask" 
          class="next-button"
        >
          {{ node.content.button_next_text || 'Следующее задание' }}
        </button>

        <!-- Кнопка завершения (только на последнем задании после проверки) -->
        <button
          v-if="showTaskResults && !hasNextTask"
          @click="finishQuiz"
          class="next-button"
        >
          {{ node.content.button_finish_text || 'Завершить' }}
        </button>
      </div>
    </div>
    
    <!-- Результаты после всех заданий -->
    <div v-if="showResults" class="results-container">
      <!-- Общий результат -->
      <div v-if="node.content.result_text" class="final-result-text" v-html="renderedResultText">
      </div>

      <!-- Таблица результатов (Фидбек) -->
      <div class="feedback-table-container" v-if="sortedUserResults.length > 0">
        <h3>Результаты выполнения заданий</h3>
        <table class="results-table">
          <thead>
            <tr>
              <th class="condition-column">Условие</th>
              <th class="answer-column">Ваш ответ</th>
              <th class="feedback-column">Комментарий</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(result, index) in sortedUserResults" :key="result.taskId">
              <td class="condition-cell" v-html="renderMarkdownInline(result.condition)"></td>
              <td class="answer-cell">
                <span class="status-icon" :class="result.isCorrect ? 'correct' : 'incorrect'">
                  {{ result.isCorrect ? '✓' : '✕' }}
                </span>
                <span v-html="renderMarkdownInline(result.userAnswer)"></span>
              </td>
              <td class="feedback-cell" v-html="renderMarkdownInline(result.feedbackText)"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { AnalyticsService } from '@/utils/AnalyticsService'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
})

export default {
  name: 'QuizSet',
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
      currentTaskIndex: 0,
      selectedOption: null,
      showTaskResults: false,
      showResults: false,
      userResults: [],
      quizId: Math.random().toString(36).substring(2, 9),
      startTime: Date.now()
    }
  },
  mounted() {
    this.restoreState()
  },

  computed: {
    renderedQuestion() {
      if (!this.node.content.question) return ''
      return md.render(this.node.content.question)
    },
    renderedResultText() {
      if (!this.node.content.result_text) return ''
      return md.render(this.node.content.result_text)
    },
    currentTask() {
      return this.node.content.tasks[this.currentTaskIndex]
    },
    hasNextTask() {
      return this.currentTaskIndex < this.node.content.tasks.length - 1
    },
    sortedUserResults() {
      // Клонируем массив и сортируем: сперва верные (isCorrect: true), затем неверные.
      return [...this.userResults].sort((a, b) => {
        if (a.isCorrect && !b.isCorrect) return -1;
        if (!a.isCorrect && b.isCorrect) return 1;
        return 0;
      });
    }
  },
  methods: {
    renderMarkdown(text) {
      if (!text) return ''
      return md.render(text)
    },
    renderMarkdownInline(text) {
      if (!text) return ''
      return md.renderInline(text)
    },
    restoreState() {
      if (!this.savedState || !this.savedState.subTasks) return

      const subTasks = this.savedState.subTasks
      const tasks = this.node.content.tasks || []
      
      this.userResults = []
      let lastAnsweredIndex = -1

      tasks.forEach((task, index) => {
        const attempt = subTasks[task.id]
        if (attempt) {
           // Reconstruct result entry
           const userAnswerContent = this.node.content.options.find(opt => opt.id === attempt.selectedOptionId)?.content
           const correctAnswerContent = this.node.content.options.find(opt => opt.id === task.correct_option)?.content
           
           this.userResults.push({
             taskId: task.id,
             condition: task.content,
             userAnswer: userAnswerContent,
             correctAnswer: correctAnswerContent, // Not always needed for display but good to have
             isCorrect: attempt.isCorrect,
             feedbackText: attempt.isCorrect ? task['feedback-correct'] : task['feedback-incorrect']
           })
           
           lastAnsweredIndex = index
        }
      })

      if (lastAnsweredIndex >= 0) {
        // If we have some answers, move to the next unanswered task
        if (lastAnsweredIndex < tasks.length - 1) {
          this.currentTaskIndex = lastAnsweredIndex + 1
        } else {
          // All done
          this.currentTaskIndex = tasks.length - 1
          this.showResults = true
          this.showTaskResults = true // Just in case
        }
      }
    },
    async checkAnswer() {
      this.showTaskResults = true
      
      const userAnswer = this.node.content.options.find(opt => opt.id === this.selectedOption)?.content
      const isCorrect = this.selectedOption === this.currentTask.correct_option
      const correctAnswer = this.node.content.options.find(opt => opt.id === this.currentTask.correct_option)?.content
      
      this.userResults.push({
        taskId: this.currentTask.id,
        condition: this.currentTask.content,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        feedbackText: isCorrect ? this.currentTask['feedback-correct'] : this.currentTask['feedback-incorrect']
      })

      // Analytics
      const payload = {
        topicId: this.topicId || this.node.topicId,
        lessonId: this.lessonId || this.node.lessonId,
        lessonVersion: this.lessonVersion,
        ruleId: null,

        taskId: this.node.id, // Parent Task ID
        subTaskId: this.currentTask.id, // Current Sub-task ID
        taskType: 'QuizSet',
        answerType: 'select',
        taskVersion: this.node.taskVersion || null,
        skillId: this.node.skill_id || null,

        selectedOptionId: this.selectedOption,
        userAnswerIsCorrect: isCorrect,

        correctOptions: 1,
        incorrectOptions: this.node.content.options.length - 1,
        selectedCorrectOptions: isCorrect ? 1 : 0,
        selectedIncorrectOptions: isCorrect ? 0 : 1,

        responseMs: Date.now() - this.startTime
      }

      try {
        await AnalyticsService.logAttempt(payload)
      } catch (e) {
        console.error('Failed to log QuizSet attempt', e)
      }
    },
    
    nextTask() {
      // Анимация перехода
      this.showTaskResults = false
      this.selectedOption = null
      
      setTimeout(() => {
        this.currentTaskIndex++
      }, 300)
    },
    
    finishQuiz() {
      this.showResults = true
    }
  },
  watch: {
    currentTaskIndex(newIndex) {
      if (newIndex >= this.node.content.tasks.length) {
        this.finishQuiz()
      }
    }
  }
}
</script>

<style scoped>
.quiz-set {
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
  margin-right: 80px; /* Место для индикатора прогресса */
}

.question {
  font-size: 1.1em;
  line-height: 1.5;
  font-weight: 500;
}

/* Стили для условия задания */
.task-content {
  background-color: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid #007bff;
  font-weight: 500;
}

/* Анимация смены заданий */
.current-task {
  transition: opacity 0.3s ease;
}

/* Стили опций (взяты из QuizSelect) */
.options-container {
  margin-bottom: 20px;
}

.option {
  margin-bottom: 8px;
  padding: 2px;
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.option.has-feedback {
  margin-bottom: 16px;
  padding-bottom: 16px;
}

.option:hover {
  background-color: #e9ecef;
}

.option.selected {
  background-color: #e7f3ff;
  border: 1px solid #b3d9ff;
}

.option.correct {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.option.incorrect {
  background-color: #f8d7da;
  border: 1px solid #f1b0b7;
}

.option-label {
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  margin: 0;
}

.option-input {
  display: none;
}

.custom-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #6c757d;
  border-radius: 50%;
  margin-right: 12px;
  margin-top: 2px;
  position: relative;
  flex-shrink: 0;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.option.selected .custom-checkbox {
  border-color: #007bff;
  background-color: #007bff;
  color: white;
}

.option.selected .custom-checkbox::after {
  content: '•';
  font-size: 24px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  line-height: 1;
}

.option.correct .custom-checkbox {
  border-color: #28a745;
  background-color: #28a745;
  color: white;
}

.option.correct .custom-checkbox::after {
  content: '✓';
  font-size: 14px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
}

.option.incorrect .custom-checkbox {
  border-color: #dc3545;
  background-color: #dc3545;
  color: white;
}

.option.incorrect .custom-checkbox::after {
  content: '✕';
  font-size: 12px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.option-content {
  flex: 1;
  line-height: 1.5;
}

.option-feedback {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 0.9em;
  margin-left: 32px;
  line-height: 1.4;
  transition: all 0.3s ease;
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

.results-table {
  display: grid;
  grid-template-columns: fit-content(25%) fit-content(25%) 1fr;
  width: 100%;
  margin-top: 16px;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.results-table thead,
.results-table tbody,
.results-table tr {
  display: contents;
}

.results-table th,
.results-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
}

.results-table th {
  background-color: #f8f9fa;
  text-align: left;
  font-weight: bold;
}

.results-table td {
  vertical-align: top;
}

.condition-cell {
  font-weight: 500;
}

.answer-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feedback-cell {
  color: #495057;
  font-size: 0.95em;
  line-height: 1.4;
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
  text-align: left;
  font-weight: 500;
}

/* Анимации */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>