<template>
  <div class="quiz-select">
    <!-- Вопрос -->
    <div class="quiz-header">
      <div class="question" v-html="renderedQuestion"></div>
    </div>
    
    <!-- Опции -->
    <div class="options-container">
      <div 
        v-for="option in node.content.options" 
        :key="option.id"
        class="option"
        :class="{ 
          selected: selectedOption === option.id,
          'has-feedback': showResults && (
            (selectedOption === option.id && option['feedback-selected']) ||
            (option.correct && selectedOption !== option.id && option['feedback-not-selected'])
          ),
          correct: showResults && option.correct,
          incorrect: showResults && selectedOption === option.id && !option.correct
        }"
      >
        <label class="option-label">
          <input
            type="radio"
            :name="'quiz-' + quizId"
            :value="option.id"
            v-model="selectedOption"
            :disabled="showResults"
            class="option-input"
          />
          <span class="custom-checkbox radio"></span>
          <span class="option-content" v-html="renderMarkdownInline(option.content)"></span>
        </label>
        
        <!-- Фидбек для выбранной опции -->
        <div 
          v-if="showResults && selectedOption === option.id && option['feedback-selected']" 
          class="option-feedback"
          :class="option.correct ? 'correct-feedback' : 'incorrect-feedback'"
          v-html="renderMarkdownInline(option['feedback-selected'])"
        >
        </div>
        
        <!-- Фидбек для правильной опции (если не выбрана) -->
        <div 
          v-if="showResults && option.correct && selectedOption !== option.id && option['feedback-not-selected']" 
          class="option-feedback correct-feedback"
          v-html="renderMarkdownInline(option['feedback-not-selected'])"
        >
        </div>
      </div>
    </div>
    
    <!-- Кнопка проверки (исчезает после проверки) -->
    <div class="quiz-actions" v-if="!showResults">
      <button 
        @click="checkAnswer" 
        class="check-button"
        :disabled="!selectedOption"
      >
        {{ node.content.button_text || 'Проверить ответ' }}
      </button>
    </div>
    
    <!-- Общий результат -->
    <div v-if="showResults && node.content.result_text" class="result-text" v-html="renderedResultText">
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import MarkdownIt from 'markdown-it'
import { AnalyticsService } from '@/utils/AnalyticsService'
// useLessonProgress is auto-imported

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
})

const renderedQuestion = computed(() => {
  if (!props.node.content.question) return ''
  return md.render(props.node.content.question)
})

const renderedResultText = computed(() => {
  if (!props.node.content.result_text) return ''
  return md.render(props.node.content.result_text)
})

const renderMarkdownInline = (text) => {
  if (!text) return ''
  return md.renderInline(text)
}

const props = defineProps({
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
})

const selectedOption = ref(null)
const showResults = ref(false)
const quizId = Math.random().toString(36).substring(2, 9)
const startTime = Date.now()

const taskId = props.node.content.taskId || props.node.id

onMounted(() => {
  if (props.savedState?.latestAttempt) {
    const attempt = props.savedState.latestAttempt
    if (attempt.selectedOptionId) {
      selectedOption.value = attempt.selectedOptionId
      showResults.value = true
    }
  }
})

const checkAnswer = async () => {
    showResults.value = true

    const option = props.node.content.options.find(o => o.id === selectedOption.value)
    const isCorrect = option && option.correct

    // Analytics Payload
    const payload = {
        // Context
        topicId: props.topicId || props.node.topicId,
        lessonId: props.lessonId || props.node.lessonId,
        lessonVersion: props.lessonVersion,
        ruleId: null, 
        
        taskId: taskId,
        taskType: 'QuizSelect',
        answerType: 'select',
        taskVersion: props.node.taskVersion || null,
        skillId: props.node.skill_id || null,
        
        // Answer details
        selectedOptionId: selectedOption.value,
        userAnswerIsCorrect: !!isCorrect,
        
        // Counters
        correctOptions: 1, // Usually 1 correct for radio
        incorrectOptions: props.node.content.options.length - 1,
        selectedCorrectOptions: isCorrect ? 1 : 0,
        selectedIncorrectOptions: isCorrect ? 0 : 1
    }
    
    // Log
    try {
        await AnalyticsService.logAttempt(payload)
    } catch (e) {
        console.error('Failed to log quiz attempt', e)
    }
}
</script>

<style scoped>
.quiz-select {
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

.options-container {
  margin-bottom: 20px;
}

/* Базовые стили опции (до проверки) */
.option {
  margin-bottom: 8px; /* Компактно до проверки */
  padding: 2px;
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

/* После проверки, если есть фидбек - увеличиваем отступ */
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

/* После проверки: Верная опция */
.option.correct {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

/* После проверки: Неверная и выбрана */
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

/* Выбранные опции (до проверки) */
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

/* После проверки: Верная опция (выбранная или нет) */
.option.correct .custom-checkbox {
  border-color: #28a745;
  background-color: #28a745;
  color: white;
}

/* Верная и выбрана - точка */
.option.correct.selected .custom-checkbox::after {
  content: '✓';
  font-size: 14px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  line-height: 1;
}

/* Верная, но не выбрана - минус */
.option.correct:not(.selected) .custom-checkbox::after {
  content: '−';
  font-size: 16px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* После проверки: Неверная и выбрана */
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

/* Синий фидбек для правильных опций */
.correct-feedback {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

/* Жёлтый фидбек для неправильных выбранных опций */
.incorrect-feedback {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
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
</style>