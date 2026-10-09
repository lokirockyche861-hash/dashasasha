<template>
  <div class="drag-and-drop">
    <!-- Вопрос -->
    <div class="quiz-header" v-if="questionHtml" v-html="questionHtml"></div>

    <!-- Пул карточек (всегда сверху) -->
    <div class="dd-pool" @dragover.prevent @drop="onDropToPool">
      <div class="section-title">Карточки</div>
      <div class="dd-tasks">
        <div
          v-for="task in tasksInPool()"
          :key="task.id"
          class="dd-task"
          :class="taskClass(task)"
          draggable="true"
          @dragstart="onDragStart(task.id)"
          @dragend="onDragEnd"
        >
          <span v-html="renderTaskContent(task)"></span>
        </div>
      </div>
    </div>

    <!-- Группы (под пулом) -->
    <div
      class="dd-groups"
      :class="{
        'dd-groups--rows': layout === 'rows',
        'dd-groups--columns': layout === 'columns',
        'dd-groups--matrix': layout === 'matrix',
        'is-4-groups': layout === 'columns' && groups.length === 4
      }"
      :style="layout === 'matrix' ? { gridTemplateColumns: `repeat(${matrixColumns}, 1fr)` } : {}"
    >
      <div
        v-for="group in groups"
        :key="group.id"
        class="dd-group"
        :class="groupClass(group.id)"
        @dragover.prevent
        @dragenter.prevent="onDragEnter(group.id)"
        @dragleave.prevent="onDragLeave(group.id)"
        @drop="onDrop(group.id)"
      >
        <div class="group-label" v-if="renderGroupTitle(group, index)" v-html="renderGroupTitle(group, index)"></div>
        <div class="dd-tasks dd-tasks--in-group">
          <div
            v-for="task in tasksInGroup(group.id)"
            :key="task.id"
            class="dd-task"
            :class="taskClass(task)"
            draggable="true"
            @dragstart="onDragStart(task.id)"
            @dragend="onDragEnd"
          >
            <span v-html="renderTaskContent(task)"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Кнопки + результат -->
    <div class="quiz-actions">
      <button
        class="check-button"
        type="button"
        @click="checkAnswers"
        :disabled="showResults || !allPlaced"
      >
        {{ buttonText }}
      </button>
      <button
        class="secondary-button"
        type="button"
        @click="reset"
      >
        Сбросить
      </button>
      <span v-if="showResults" class="score-text">
        {{ resultSummary }}
      </span>
    </div>

    <!-- Общий текст результата -->
    <div
      v-if="showResults && resultHtml"
      class="result-text"
      v-html="resultHtml"
    ></div>

    <!-- Таблица фидбека (появляется только если show_feedback === true) -->
    <div v-if="showResults && content.show_feedback" class="results-container">
      <h3>Результаты сортировки</h3>
      <table class="results-table">
        <thead>
          <tr>
            <th class="task-column">Слово / Карточка</th>
            <th class="group-column">Ваш выбор</th>
            <th class="feedback-column">Комментарий</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="res in feedbackResults" :key="res.taskId">
            <td class="task-cell" v-html="renderTaskContent(res.task)"></td>
            <td class="group-cell">
              <span class="status-icon" :class="res.isCorrect ? 'correct' : 'incorrect'">
                {{ res.isCorrect ? '✓' : '✕' }}
              </span>
              <span v-html="renderMarkdownInline(res.chosenGroupContent)"></span>
            </td>
            <td class="feedback-cell" v-html="renderMarkdownInline(res.feedbackText)"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import MarkdownIt from 'markdown-it'
import { AnalyticsService } from '@/utils/AnalyticsService'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true
})

export default {
  name: 'DragAndDrop',
  props: {
    node: {
      type: Object,
      required: true
    },
    lessonId: { type: String, default: '' },
    topicId: { type: String, default: '' },
    lessonVersion: { type: String, default: null },
    savedState: { type: Object, default: null }
  },
  data() {
    return {
      draggedTaskId: null,
      hoverGroupId: null,
      // taskId -> groupId | null
      assignments: {},
      showResults: false,
      startTime: Date.now()
    }
  },
  computed: {
    content() {
      return this.node?.content || {}
    },
    layout() {
      // Поддерживаем 'rows', 'matrix', по умолчанию 'columns'
      if (this.content.layout === 'rows') return 'rows'
      if (this.content.layout === 'matrix') return 'matrix'
      return 'columns'
    },
    // Режим безымянных корзин "family": true
    resolvedFamilyMapping() {
      if (!this.content.family) return null;
      
      const basketCounts = {}; 
      // basketCounts[correctGroupId][basketId] = count
      this.tasks.forEach(t => {
         const bId = this.assignments[t.id];
         if (!bId) return;
         if (!basketCounts[t.correct_group]) basketCounts[t.correct_group] = {};
         basketCounts[t.correct_group][bId] = (basketCounts[t.correct_group][bId] || 0) + 1;
      });

      const assignedBaskets = new Set();
      const basketToOriginal = {};

      // Сортируем оригинальные correct_group по тому, у какой группы есть корзина с максимальным скоплением
      const groups = Object.keys(basketCounts).sort((g1, g2) => {
         const max1 = Math.max(...Object.values(basketCounts[g1]), 0);
         const max2 = Math.max(...Object.values(basketCounts[g2]), 0);
         return max2 - max1; 
      });

      for (const g of groups) {
         const counts = basketCounts[g];
         // Ищем корзину с наибольшим количеством карточек этой группы, которая еще не занята
         const sortedBaskets = Object.keys(counts)
             .filter(b => !assignedBaskets.has(b))
             .sort((b1, b2) => counts[b2] - counts[b1]);
         
         if (sortedBaskets.length > 0) {
             const bestBasket = sortedBaskets[0];
             basketToOriginal[bestBasket] = g;
             assignedBaskets.add(bestBasket);
         }
      }

      return basketToOriginal;
    },
    matrixColumns() {
      // Если автор явно задал настройку колонок для матрицы в JSON
      if (this.content.matrix_cols) {
        return this.content.matrix_cols
      }
      
      // Умный автоподбор для избежания "одиноких" корзин в последнем ряду
      const len = this.groups.length
      if (len <= 4) return 2 // 2x2
      if (len === 5 || len === 6) return 3 // 3,2 или 3,3
      if (len === 7 || len === 8) return 4 // 4,3 или 4,4
      if (len === 9) return 3 // 3,3,3
      if (len >= 10 && len <= 12) return 4 // 4,4,2 или 4,4,3 или 4,4,4
      
      return Math.ceil(Math.sqrt(len)) // Универсальный фоллбэк
    },
    tasks() {
      return this.content.tasks || []
    },
    groups() {
      return this.content.groups || []
    },
    buttonText() {
      return this.content.button_text || 'Проверить'
    },
    questionHtml() {
      if (!this.content.question) return ''
      return md.render(this.content.question)
    },
    resultHtml() {
      if (!this.content.result_text) return ''
      return md.render(this.content.result_text)
    },
    allPlaced() {
      if (!this.tasks.length) return false
      return this.tasks.every(task => !!this.assignments[task.id])
    },
    score() {
      return this.tasks.reduce((sum, task) => {
        return sum + (this.isTaskCorrect(task) ? 1 : 0)
      }, 0)
    },
    maxScore() {
      return this.tasks.length
    },
    resultSummary() {
      if (!this.showResults) return ''
      return `Правильно: ${this.score} из ${this.maxScore}`
    },
    // Формируем отсортированный массив для таблицы фидбека
    feedbackResults() {
      if (!this.showResults || !this.content.show_feedback) return []
      
      const results = this.tasks.map(task => {
        const groupId = this.assignments[task.id]
        const groupIndex = this.groups.findIndex(g => g.id === groupId)
        const group = this.groups[groupIndex]
        const isCorrect = this.isTaskCorrect(task)
        
        let chosenGroupContent = 'Не выбрано';
        if (group) {
          if (this.content.family) {
             chosenGroupContent = `Группа ${groupIndex + 1}`;
          } else {
             chosenGroupContent = group.content;
          }
        }
        
        return {
          taskId: task.id,
          task: task,
          chosenGroupContent,
          isCorrect: isCorrect,
          feedbackText: isCorrect ? task['feedback-correct'] : task['feedback-incorrect']
        }
      })
      
      // Сортировка: сначала верные (isCorrect === true), затем неверные (isCorrect === false)
      results.sort((a, b) => {
        if (a.isCorrect && !b.isCorrect) return -1;
        if (!a.isCorrect && b.isCorrect) return 1;
        return 0;
      })
      
      return results
    }
  },
  created() {
    this.initAssignments()
  },
  methods: {
    initAssignments() {
      const map = {}
      // Initialize with nulls
      this.tasks.forEach(task => {
        map[task.id] = null
      })
      
      let hasRestoredState = false
      if (this.savedState?.latestAttempt) {
          const attempt = this.savedState.latestAttempt
          if (attempt.selectedOptionIds && Array.isArray(attempt.selectedOptionIds)) {
              // Parse "taskId:groupId"
              attempt.selectedOptionIds.forEach(str => {
                  const [taskId, groupId] = str.split(':')
                  if (taskId && groupId && map.hasOwnProperty(taskId)) {
                      map[taskId] = groupId
                      hasRestoredState = true
                  }
              })
          }
      }

      this.assignments = map
      this.showResults = hasRestoredState // Auto-show results if state restored
      this.draggedTaskId = null
      this.hoverGroupId = null
    },

    // --- helpers для выборки задач ---

    tasksInPool() {
      return this.tasks.filter(task => !this.assignments[task.id])
    },

    tasksInGroup(groupId) {
      return this.tasks.filter(task => this.assignments[task.id] === groupId)
    },

    // --- markdown helpers ---

    renderMarkdownInline(text) {
      if (!text) return ''
      return md.renderInline(text)
    },

    renderTaskContent(task) {
      if (!task || !task.content) return ''
      return md.renderInline(task.content)
    },

    renderGroupContent(group) {
      if (!group || !group.content) return ''
      return md.renderInline(group.content)
    },

    renderGroupTitle(group, index) {
      if (this.content.family) return '' // Безымянная корзина
      if (!group || !group.content) return ''
      return md.renderInline(group.content)
    },

    // --- drag & drop ---

    onDragStart(taskId) {
      if (this.showResults) return
      this.draggedTaskId = taskId
    },

    onDragEnd() {
      this.draggedTaskId = null
      this.hoverGroupId = null
    },

    onDragEnter(groupId) {
      if (!this.draggedTaskId || this.showResults) return
      this.hoverGroupId = groupId
    },

    onDragLeave(groupId) {
      if (this.hoverGroupId === groupId) {
        this.hoverGroupId = null
      }
    },

    onDrop(groupId) {
      if (!this.draggedTaskId || this.showResults) return
      this.assignments = {
        ...this.assignments,
        [this.draggedTaskId]: groupId
      }
      this.draggedTaskId = null
      this.hoverGroupId = null
    },

    onDropToPool() {
      if (!this.draggedTaskId || this.showResults) return
      this.assignments = {
        ...this.assignments,
        [this.draggedTaskId]: null
      }
      this.draggedTaskId = null
      this.hoverGroupId = null
    },

    // --- проверка ---

    async checkAnswers() {
      this.showResults = true
      
      const tasks = this.tasks
      
      let correctCount = 0
      let incorrectCount = 0
      const selectedOptionIds = []
      
      tasks.forEach(task => {
          const groupId = this.assignments[task.id]
          if (this.isTaskCorrect(task)) {
              correctCount++
          } else {
              incorrectCount++
          }
          // Format: "taskId:groupId"
          if (groupId) {
             selectedOptionIds.push(`${task.id}:${groupId}`)
          }
      })
      
      const payload = {
            // Context
            topicId: this.topicId || this.node.topicId,
            lessonId: this.lessonId || this.node.lessonId,
            lessonVersion: this.lessonVersion,
            ruleId: null,

            taskId: this.node.id, 
            subTaskId: null,   // Single attempt for the whole DragAndDrop
            taskType: 'DragAndDrop',
            answerType: 'match',
            taskVersion: this.node.taskVersion || null,
            skillId: this.node.skill_id || null, 

            // Answer
            selectedOptionIds: selectedOptionIds,
            userAnswerIsCorrect: correctCount === tasks.length,

            // Counters
            correctOptions: tasks.length,
            incorrectOptions: 0, 
            selectedCorrectOptions: correctCount,
            selectedIncorrectOptions: incorrectCount,
            
            responseMs: Date.now() - this.startTime
        }

        try {
            await AnalyticsService.logAttempt(payload)
        } catch (e) {
            console.error('Failed to log DragAndDrop attempt', e)
        }
    },

    reset() {
      this.initAssignments()
    },

    isTaskCorrect(task) {
      if (!task || !task.correct_group) return false
      const assignedGroupId = this.assignments[task.id]
      if (!assignedGroupId) return false
      
      if (this.content.family) {
        const mappedCorrectGroup = this.resolvedFamilyMapping[assignedGroupId]
        return mappedCorrectGroup === task.correct_group
      }

      return assignedGroupId === task.correct_group
    },

    // --- классы ---

    taskClass(task) {
      return {
        'in-pool': !this.assignments[task.id],
        'in-group': !!this.assignments[task.id],
        'correct': this.showResults && this.isTaskCorrect(task),
        'incorrect':
          this.showResults &&
          this.assignments[task.id] &&
          !this.isTaskCorrect(task)
      }
    },

    groupClass(groupId) {
      const tasksHere = this.tasksInGroup(groupId)
      const hasIncorrect =
        this.showResults && tasksHere.some(task => !this.isTaskCorrect(task))
      return {
        'is-hovered': this.hoverGroupId === groupId,
        'has-tasks': tasksHere.length > 0,
        'has-incorrect': hasIncorrect
      }
    }
  }
}
</script>

<style scoped>
.drag-and-drop {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  border: 1px solid #e9ecef;
}

.quiz-header {
  margin-bottom: 20px;
}

/* Пул карточек (всегда сверху) */

.dd-pool {
  margin-bottom: 20px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 0.95em;
}

.dd-tasks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 48px;
}

.dd-task {
  padding: 6px 10px;
  border-radius: 999px;
  background-color: #ffffff;
  border: 1px solid #ced4da;
  cursor: grab;
  font-size: 0.95em;
  user-select: none;
}

/* состояние после проверки */

.dd-task.correct {
  background-color: #d4edda;
  border-color: #28a745;
}

.dd-task.incorrect {
  background-color: #f8d7da;
  border-color: #dc3545;
}

/* Группы (под пулом) */

.dd-groups {
  width: 100%;
}

/* режим: заполняем СТОЛБЦЫ (groups в одну строку) */
.dd-groups--columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

/* Эксклюзивно для 4-х групп: форсируем квадратную матрицу 2x2 */
.dd-groups--columns.is-4-groups {
  grid-template-columns: repeat(2, 1fr);
}



/* режим: MATRIX (матрица для множества мелких корзин) */
.dd-groups--matrix {
  display: grid;
  /* Значение grid-template-columns задается инлайн (см. шаблон) для динамических колонок,
     а это фоллбек-значение: */
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.dd-groups--matrix .dd-group {
  padding: 8px;
  min-height: 40px;
}

.dd-groups--matrix .group-label {
  font-size: 0.85em;
  margin-bottom: 6px;
}

.dd-groups--matrix .dd-tasks--in-group {
  min-height: 24px;
}

.dd-groups--matrix .dd-task {
  font-size: 0.8em;
  padding: 4px 8px;
}

/* режим: заполняем СТРОКИ (groups в один столбец) */
.dd-groups--rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* каждая группа — строка: слева заголовок, справа карточки */
.dd-groups--rows .dd-group {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* базовый стиль корзины */

.dd-group {
  background-color: #ffffff;
  border-radius: 8px;
  border: 2px dashed #ced4da;
  padding: 12px;
  min-height: 60px;
  transition: border-color 0.2s, background-color 0.2s;
}

/* подписи групп */

.group-label {
  font-weight: 600;
  font-size: 0.95em;
  margin-bottom: 8px;
}

/* в строковом режиме подпись отделяем от карточек справа */
.dd-groups--rows .group-label {
  margin-bottom: 0;
  min-width: 160px;
}

/* контейнер карточек внутри группы */

.dd-tasks--in-group {
  min-height: 32px;
}

/* hover / ошибки */

.dd-group.is-hovered {
  border-color: #007bff;
  background-color: #e9f5ff;
}

.dd-group.has-incorrect {
  border-color: #dc3545;
}

/* Кнопки и результат */

.quiz-actions {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
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

.secondary-button {
  background-color: #ffffff;
  color: #495057;
  border: 1px solid #ced4da;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.95em;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.secondary-button:hover {
  background-color: #f1f3f5;
  border-color: #adb5bd;
}

.result-text {
  margin-top: 16px;
  padding: 12px;
  background-color: #ffffff;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  font-size: 0.95em;
}

.score-text {
  font-size: 0.9em;
  color: #6c757d;
}

/* Стили для таблицы фидбека */
.results-container {
  margin-top: 24px;
  animation: fadeIn 0.5s ease;
}

.results-table {
  display: grid;
  /* 
    Первые две колонки делят между собой пространство по контенту (max-content), 
    но чтобы в сумме они не занимали более 50% ширины таблицы, можно использовать 
    относительные единицы или функцию minmax. В нашем случае: 
    fit-content(25%) fit-content(25%) 1fr
    Это позволит им быть узкими (по тексту), но никогда не шире 25% каждая
    (или 50% в сумме), отдавая весь остаток фидбеку.
  */
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

.task-cell {
  font-weight: 500;
}

.group-cell {
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
  flex-shrink: 0;
}

.status-icon.correct {
  background-color: #28a745;
}

.status-icon.incorrect {
  background-color: #dc3545;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
