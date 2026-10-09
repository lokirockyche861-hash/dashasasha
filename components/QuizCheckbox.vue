<template>
  <div class="quiz-checkbox">
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
          selected: selectedOptions.includes(option.id),
          'has-feedback': showResults && (
            (selectedOptions.includes(option.id) && option['feedback-selected']) ||
            (option.correct && !selectedOptions.includes(option.id) && option['feedback-not-selected'])
          ),
          correct: showResults && option.correct && selectedOptions.includes(option.id),
          incorrect: showResults && selectedOptions.includes(option.id) && !option.correct,
          'correct-not-selected': showResults && option.correct && !selectedOptions.includes(option.id)
        }"
      >
        <label class="option-label">
          <input
            type="checkbox"
            :name="'quiz-' + quizId"
            :value="option.id"
            v-model="selectedOptions"
            :disabled="showResults"
            class="option-input"
          />
          <span class="custom-checkbox"></span>
          <span class="option-content" v-html="renderMarkdownInline(option.content)"></span>
        </label>
        
        <!-- Фидбек для выбранной опции -->
        <div 
          v-if="showResults && selectedOptions.includes(option.id) && option['feedback-selected']" 
          class="option-feedback"
          :class="option.correct ? 'correct-feedback' : 'incorrect-feedback'"
          v-html="renderMarkdownInline(option['feedback-selected'])"
        >
        </div>
        
        <!-- Фидбек для правильной опции (если не выбрана) -->
        <div 
          v-if="showResults && option.correct && !selectedOptions.includes(option.id) && option['feedback-not-selected']" 
          class="option-feedback correct-feedback"
          v-html="renderMarkdownInline(option['feedback-not-selected'])"
        >
        </div>
      </div>
    </div>
    
    <!-- Кнопка проверки -->
    <!-- Кнопка проверки -->
<div class="quiz-actions" v-if="!showResults">
  <button 
    @click="checkAnswers" 
    class="check-button"
    :disabled="selectedOptions.length === 0"
  >
    {{ node.content.button_text || 'Проверить ответы' }}
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

const selectedOptions = ref([])
const showResults = ref(false)
const quizId = Math.random().toString(36).substring(2, 9)
const startTime = Date.now()

const taskId = props.node.content.taskId || props.node.id // Ensure we have a taskId

onMounted(() => {
  if (props.savedState?.latestAttempt) {
    const attempt = props.savedState.latestAttempt
    if (attempt.selectedOptionIds) {
      if (Array.isArray(attempt.selectedOptionIds)) {
        selectedOptions.value = attempt.selectedOptionIds
      }
      showResults.value = true
    }
  }
})

const checkAnswers = async () => {
    showResults.value = true

    // Determine correctness
    // A checkbox question is correct if all correct options are selected AND no incorrect options are selected
    const correctOptionIds = props.node.content.options.filter(o => o.correct).map(o => o.id)
    const selected = selectedOptions.value
    
    // Check if exactly the same set
    // Check if exactly the same set
    const isCorrect = correctOptionIds.length === selected.length && 
                      correctOptionIds.every(id => selected.includes(id))

    const selectedCorrectCount = selected.filter(id => correctOptionIds.includes(id)).length
    const selectedIncorrectCount = selected.filter(id => !correctOptionIds.includes(id)).length

    // Analytics Payload
    const payload = {
        // Context
        topicId: props.topicId || props.node.topicId,
        lessonId: props.lessonId || props.node.lessonId,
        lessonVersion: props.lessonVersion,
        ruleId: null, // Checkboxes usually simple tasks, might need prop or defaults
        
        taskId: taskId,
        taskType: 'QuizCheckbox',
        answerType: props.node.answer_type || 'multi-select',
        taskVersion: props.node.taskVersion || null,
        skillId: props.node.skill_id || null,
        
        // Answer
        selectedOptionIds: selected,
        userAnswerIsCorrect: isCorrect,
        
        // Counters
        correctOptions: correctOptionIds.length,
        incorrectOptions: props.node.content.options.length - correctOptionIds.length,
        selectedCorrectOptions: selectedCorrectCount,
        selectedIncorrectOptions: selectedIncorrectCount,
        
        responseMs: Date.now() - startTime
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
.quiz-checkbox {
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

/* После проверки: Верная и выбрана */
.option.correct {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

/* После проверки: Неверная и выбрана */
.option.incorrect {
  background-color: #f8d7da;
  border: 1px solid #f1b0b7;
}

/* После проверки: Верная, но не выбрана */
.option.correct-not-selected {
  background-color: #f8f9fa; /* Светло-серый */
  border: 1px solid #dee2e6;
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
  border-radius: 6px;
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
  content: '✓';
}

/* После проверки: Верная и выбрана */
.option.correct .custom-checkbox {
  border-color: #28a745;
  background-color: #28a745;
  color: white;
}

.option.correct .custom-checkbox::after {
  content: '✓';
}

/* После проверки: Неверная и выбрана */
.option.incorrect .custom-checkbox {
  border-color: #dc3545;
  background-color: #dc3545;
  color: white;
}

.option.incorrect .custom-checkbox::after {
  content: '✕';
}

/* После проверки: Верная, но не выбрана */
.option.correct-not-selected .custom-checkbox {
  border-color: #28a745;
  background-color: #28a745;
  color: white;
}

.option.correct-not-selected .custom-checkbox::after {
  content: '−'; /* Знак минуса */
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