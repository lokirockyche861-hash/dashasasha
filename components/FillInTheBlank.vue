<template>
  <div class="fill-in-the-blank">
    <!-- Вопрос -->
    <div class="quiz-header">
      <div class="question" v-html="renderedQuestion"></div>
    </div>
    
    <!-- Задания с пропусками -->
    <div class="tasks-container">
      <div 
        v-for="(task, taskIndex) in node.content.tasks" 
        :key="task.id"
        class="task"
        :class="{ 
          'checked': showResults,
          'correct': showResults && isTaskCorrect(taskIndex),
          'incorrect': showResults && !isTaskCorrect(taskIndex)
        }"
      >
        <!-- Текст задания с полями ввода -->
        <div class="task-text">
          <span 
            v-for="(part, partIndex) in getTaskParts(task)" 
            :key="partIndex"
            class="task-part"
          >
            <span v-if="part.type === 'text'" class="text-part" v-html="renderMarkdownInline(part.content)"></span>
            <input
              v-else-if="part.type === 'input'"
              v-model="userAnswers[taskIndex][part.inputIndex]"
              :ref="el => setInputRef(taskIndex, part.inputIndex, el)"
              :style="{ width: inputWidths[taskIndex]?.[part.inputIndex] || '40px' }"
              :class="{ 
                'correct': showResults && isInputCorrect(taskIndex, part.inputIndex),
                'incorrect': showResults && !isInputCorrect(taskIndex, part.inputIndex)
              }"
              :disabled="showResults"
              class="blank-input"
              type="text"
              :placeholder="showResults ? '' : '__'"
            />
          </span>
        </div>
        
          <!-- Фидбек для задания -->
  <div v-if="showResults" class="task-feedback">
    <div v-if="isTaskCorrect(taskIndex) && task['feedback-correct']" class="feedback-correct" v-html="renderMarkdownInline(task['feedback-correct'])">
    </div>
    <div v-else-if="!isTaskCorrect(taskIndex) && task['feedback-incorrect']" class="feedback-incorrect" v-html="renderMarkdownInline(task['feedback-incorrect'])">
    </div>
  </div>

      </div>
    </div>
    
    <!-- Кнопка проверки -->
    <div class="quiz-actions">
      <button 
        @click="checkAnswers" 
        class="check-button"
        :disabled="showResults"
      >
        {{ node.content.button_text || 'Проверить ответы' }}
      </button>
    </div>
    
    <!-- Общий результат -->
    <div v-if="showResults && node.content.result_text" class="result-text" v-html="renderedResultText"></div>
  </div>
</template>

<script>
import MarkdownIt from 'markdown-it'
import { AnalyticsService } from '@/utils/AnalyticsService'
// useLessonProgress is auto-imported

export default {
  name: 'FillInTheBlank',
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
      userAnswers: [],
      showResults: false,
      inputRefs: {},
      inputWidths: {}, // Хранит вычисленные ширины для каждого поля
      startTime: Date.now()
    }
  },
  computed: {
    renderedQuestion() {
      if (!this.node.content.question) return ''
      const md = new MarkdownIt({
        html: true,
        linkify: true,
        breaks: true,
      })
      return md.render(this.node.content.question)
    },
    renderedResultText() {
      if (!this.node.content.result_text) return ''
      const md = new MarkdownIt({
        html: true,
        linkify: true,
        breaks: true,
      })
      return md.render(this.node.content.result_text)
    }
  },
  watch: {
    'node.content.tasks': {
      handler() {
        this.initializeAnswers()
      },
      deep: true,
      immediate: true
    }
  },
  mounted() {
    this.initializeAnswers()
    // Инициализируем ширину после рендера
    this.$nextTick(() => {
      this.initializeWidths()
    })
  },
  methods: {
    renderMarkdownInline(text) {
      if (!text) return ''
      const md = new MarkdownIt({
        html: true,
        linkify: true,
        breaks: true,
      })
      // renderInline prevents <p> tag wrapper from being added to short structural texts
      return md.renderInline(text)
    },
    
    initializeAnswers() {
      if (!this.node.content.tasks) return
      
      const subTasksState = this.savedState?.subTasks || {}
      
      this.userAnswers = this.node.content.tasks.map(task => {
        // Определяем количество полей ввода по количеству пропусков "___" в тексте
        const blanksCount = task.text ? (task.text.match(/___/g) || []).length : 0;
        
        // Restore from saved state if available
        const attempt = subTasksState[task.id]
        if (attempt && attempt.answerText) {
          // answerText is joined by "; "
          const restoredAnswers = attempt.answerText.split('; ')
          if (restoredAnswers.length === blanksCount) {
             return restoredAnswers
          }
        }
        
        return Array(blanksCount).fill('')
      })

      // Check if any tasks have been attempted
      let hasAttempts = false
      this.node.content.tasks.forEach(task => {
          if (subTasksState[task.id]) {
              hasAttempts = true
          }
      })

      if (hasAttempts) {
          this.showResults = true
      }
    },
    
    initializeWidths() {
      this.node.content.tasks.forEach((task, taskIndex) => {
        const parts = this.getTaskParts(task)
        parts.forEach((part, partIndex) => {
          if (part.type === 'input') {
            this.updateInputWidth(taskIndex, part.inputIndex)
          }
        })
      })
    },
    
    getTaskParts(task) {
      if (!task.text) return []
      
      const parts = []
      const text = task.text
      const blankMarker = '___' // маркер пропуска
      let currentIndex = 0
      let blankIndex = 0
      
      while (currentIndex < text.length) {
        const blankStart = text.indexOf(blankMarker, currentIndex)
        
        // Добавляем текст до пропуска
        if (blankStart > currentIndex) {
          parts.push({
            type: 'text',
            content: text.substring(currentIndex, blankStart)
          })
        } else if (blankStart === -1) {
          // Добавляем оставшийся текст
          parts.push({
            type: 'text', 
            content: text.substring(currentIndex)
          })
          break
        }
        
        // Добавляем поле ввода для пропуска
        if (blankStart !== -1) {
          parts.push({
            type: 'input',
            inputIndex: blankIndex
          })
          blankIndex++
          currentIndex = blankStart + blankMarker.length
        }
      }
      
      return parts
    },
    
    setInputRef(taskIndex, inputIndex, el) {
      if (!this.inputRefs[taskIndex]) {
        this.inputRefs[taskIndex] = {}
      }
      this.inputRefs[taskIndex][inputIndex] = el
      
      if (el) {
        // Добавляем обработчики
        el.addEventListener('input', () => {
          this.updateInputWidth(taskIndex, inputIndex)
        })
        
        // Обработчики для фокуса/блюра
        el.addEventListener('focus', () => {
          this.updateInputWidth(taskIndex, inputIndex)
        })
        
        el.addEventListener('blur', () => {
          this.updateInputWidth(taskIndex, inputIndex)
        })
        
        // Инициализируем начальную ширину
        this.$nextTick(() => {
          this.updateInputWidth(taskIndex, inputIndex)
        })
      }
    },
    
    updateInputWidth(taskIndex, inputIndex) {
      const input = this.inputRefs[taskIndex]?.[inputIndex]
      if (!input) return
      
  const task = this.node.content.tasks[taskIndex]
  
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
  
  // Вычисление ширины с учетом кастомных настроек
  const computedStyle = window.getComputedStyle(input)
  const horizontalPadding = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight)
  const horizontalBorder = parseFloat(computedStyle.borderLeftWidth) + parseFloat(computedStyle.borderRightWidth)
  const extraSpace = 4
  
  const contentWidth = tempSpan.scrollWidth
  const totalWidth = contentWidth + horizontalPadding + horizontalBorder + extraSpace
  
  const finalWidth = Math.max(currentMinWidth, totalWidth)
  
  document.body.removeChild(tempSpan)
  
  // Сохраняем ширину
  if (!this.inputWidths[taskIndex]) {
    this.inputWidths[taskIndex] = {}
  }
  this.inputWidths[taskIndex][inputIndex] = Math.ceil(finalWidth) + 'px'
    },
    
    async checkAnswers() {
      this.showResults = true
      
      // Log attempts for each task (sentence)
      const tasks = this.node.content.tasks || []
      
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        const userAnswersForTask = this.userAnswers[i] || []
        const isCorrect = this.isTaskCorrect(i)
        
        // Count correct/incorrect inputs within this task
        let correctInputs = 0
        let incorrectInputs = 0
        let totalOptions = 0
        
        if (task.answerType === 'single-box') {
           const correctAnswers = task.correctAnswers ? task.correctAnswers.map(ans => (ans || '').toLowerCase().trim()) : []
           const userAnswers = (this.userAnswers[i] || []).map(ans => (ans || '').toLowerCase().trim()).filter(ans => ans !== '')
           
           totalOptions = correctAnswers.length
           
           const remainingCorrect = [...correctAnswers]
           for (const ans of userAnswers) {
             const idx = remainingCorrect.indexOf(ans)
             if (idx !== -1) {
                correctInputs++
                remainingCorrect.splice(idx, 1)
             } else {
                incorrectInputs++
             }
           }
        } else {
           const blanksCount = task.text ? (task.text.match(/___/g) || []).length : 0
           totalOptions = blanksCount
           if (task.correctAnswers) {
                for(let inputIdx = 0; inputIdx < blanksCount; inputIdx++) {
                    if (this.isInputCorrect(i, inputIdx)) {
                        correctInputs++
                    } else {
                        incorrectInputs++
                    }
                }
           }
        }

        const payload = {
            // Context
            topicId: this.topicId || this.node.topicId,
            lessonId: this.lessonId || this.node.lessonId,
            lessonVersion: this.lessonVersion,
            ruleId: null,

            taskId: this.node.id, // Parent Task ID
            subTaskId: task.id, // Sub-task ID
            taskType: 'FillInTheBlank',
            answerType: 'input',
            taskVersion: this.node.taskVersion || null,
            skillId: this.node.skill_id || null, // From parent node for now, or task.skill_id if available

            // Answer
            answerText: userAnswersForTask.join('; '), // Combine answers if multiple blanks
            userAnswerIsCorrect: isCorrect,

            // Counters
            correctOptions: totalOptions,
            incorrectOptions: null, // Depending on component type, may not be relevant
            selectedCorrectOptions: correctInputs,
            selectedIncorrectOptions: incorrectInputs,
            
            responseMs: Date.now() - this.startTime
        }

        try {
            await AnalyticsService.logAttempt(payload)
        } catch (e) {
            console.error('Failed to log FillInTheBlank attempt', e)
        }
      }
    },
    
    isInputCorrect(taskIndex, inputIndex) {
      const task = this.node.content.tasks[taskIndex]
      const userAnswer = (this.userAnswers[taskIndex]?.[inputIndex] || '').toLowerCase().trim()
      
      // Если массив правильных ответов пуст или не задан, значит правильный ответ - оставить поле пустым
      if (!task.correctAnswers || task.correctAnswers.length === 0) {
        return userAnswer === '';
      }
      
      if (task.answerType === 'single-box') {
         // Для 'single-box' важен сам факт присутствия ответа в любом окне ввода. 
         // Подсветка конкретного окна считается зеленой, если введенное слово вообще есть в списке правильных
         if (userAnswer === '') return false;
         
         const correctSet = task.correctAnswers.map(ans => (ans || '').toLowerCase().trim());
         return correctSet.includes(userAnswer);
      } else {
        // Обычная логика ('single'), обрабатывающая как один пропуск (input), так и несколько.
        // Ответ для конкретного поля может быть строкой (строгий вариант) 
        // или массивом (список синонимов для данного пропуска)
        const expectedAnswer = task.correctAnswers[inputIndex];
        
        if (Array.isArray(expectedAnswer)) {
          return expectedAnswer.some(ans => (ans || '').toLowerCase().trim() === userAnswer);
        } else {
          const correctAnswer = (expectedAnswer || '').toLowerCase().trim();
          return userAnswer === correctAnswer;
        }
      }
    },
    
    isTaskCorrect(taskIndex) {
      const task = this.node.content.tasks[taskIndex]
      if (!task) return false;
      
      const blanksCount = task.text ? (task.text.match(/___/g) || []).length : 0;
      if (blanksCount === 0) return true;
      
      if (task.answerType === 'single-box') {
        const correctAnswers = task.correctAnswers.map(ans => (ans || '').toLowerCase().trim());
        const userAnswers = (this.userAnswers[taskIndex] || []).map(ans => (ans || '').toLowerCase().trim()).filter(ans => ans !== '');
        
        // Для успеха все нужные элементы должны быть найдены, и не должно быть лишних/неправильных
        if (userAnswers.length !== correctAnswers.length) return false;
        
        // Копируем чтобы вычеркивать найденные
        const remainingCorrect = [...correctAnswers];
        for (const ans of userAnswers) {
          const idx = remainingCorrect.indexOf(ans);
          if (idx === -1) return false; // Ввел слово, которого нет в ответах
          remainingCorrect.splice(idx, 1);
        }
        return remainingCorrect.length === 0;
      } else {
        // Обычная логика (строгое соответствие индексам)
        for (let i = 0; i < blanksCount; i++) {
          if (!this.isInputCorrect(taskIndex, i)) {
            return false
          }
        }
        return true;
      }
    },
    
    getCorrectAnswerText(task) {
      if (!task.correctAnswers || task.correctAnswers.length === 0) return '(оставить пустым)';
      
      const formatNode = (ans) => {
        if (Array.isArray(ans)) {
          return ans.join(' / ');
        }
        return ans || '(ничего)';
      }
      
      return task.correctAnswers.map(formatNode).join('; ');
    }
  }
}
</script>

<style scoped>
.fill-in-the-blank {
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
  margin-bottom: 20px;
}

.task {
  margin-bottom: 16px;
  padding: 8px; /*тут настраиваем высоту опций*/
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.05s ease;
  background-color: white;
}



.task-text {
  font-size: 1em;
  line-height: 1.5;
  margin-bottom: 8px;
}

.task-part {
  display: inline;
}

.text-part {
  white-space: pre-wrap;
}

.blank-input {
  border: 2px solid #6c757d;
  border-radius: 4px;
  padding: 4px 8px;           /* ВНУТРЕННИЕ ОТСТУПЫ - можно регулировать */
  margin: 0 2px;              /* ВНЕШНИЕ ОТСТУПЫ - можно регулировать */
  
  text-align: center;
  font-size: 0.9em;
  transition: all 0.1s ease;  /* СКОРОСТЬ АНИМАЦИИ - можно регулировать */
  background-color: white;
  box-sizing: border-box;     /* Важно для правильного расчета размеров */
  font-family: inherit;       /* Наследуем шрифт страницы */
  display: inline-block;
  vertical-align: middle;
  
  /* Для красивого перехода ширины */
  transition: 
    width 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.blank-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.blank-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.blank-input.correct {
  border-color: #28a745;
  background-color: #d4edda;
  color: #155724;
}

.blank-input.incorrect {
  border-color: #dc3545;
  background-color: #f8d7da;
  color: #721c24;
}

.correct-answer {
  font-size: 0.9em;
  color: #155724;
  font-weight: 500;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #d1ecf1;
  border-radius: 4px;
  border: 1px solid #bee5eb;
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
  text-align: left;
  font-weight: 500;
}

/* Стили для Markdown в вопросе */
.fill-in-the-blank :deep(strong) {
  font-weight: bold;
}

.fill-in-the-blank :deep(em) {
  font-style: italic;
}

.fill-in-the-blank :deep(code) {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

.task-feedback {
  margin-top: 12px;
}

.feedback-correct {
  padding: 10px 12px;
  background-color: #fdfdfd;
  color: #155724;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.95em;
}

.feedback-incorrect {
  padding: 10px 12px;
  background-color: #fdfdfd;
  color: #721c24;
  border: 1px solid #f1b0b7;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.95em;
}
</style>