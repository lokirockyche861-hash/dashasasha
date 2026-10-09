<template>
  <div class="drag-table">
    <!-- Вопрос -->
    <div class="quiz-header" v-if="questionHtml" v-html="questionHtml"></div>

    <!-- Пул карточек (всегда сверху) -->
    <div class="dt-pool" @dragover.prevent @drop="onDropToPool">
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

    <!-- Таблица -->
    <div class="dt-wrapper">
      <table class="dt-table">
        <thead>
          <tr>
            <!-- левый верхний угол -->
            <th class="dt-header-cell dt-header-cell--row">
              <span v-if="rowHeaderHtml" v-html="rowHeaderHtml"></span>
            </th>
            <!-- заголовки колонок -->
            <th
              v-for="col in columns"
              :key="col.id"
              class="dt-header-cell"
            >
              <span v-html="renderColumnContent(col)"></span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <!-- подпись строки -->
            <th class="dt-row-label">
              <span v-html="renderRowContent(row)"></span>
            </th>
            <!-- ячейки-корзины -->
            <td
              v-for="col in columns"
              :key="col.id"
              class="dt-cell"
            >
              <div
                v-if="cellGroup(row.id, col.id)"
                class="dt-group"
                :class="groupClass(cellGroup(row.id, col.id).id)"
                @dragover.prevent
                @dragenter.prevent="onDragEnter(cellGroup(row.id, col.id).id)"
                @dragleave.prevent="onDragLeave(cellGroup(row.id, col.id).id)"
                @drop="onDrop(cellGroup(row.id, col.id).id)"
              >
                <div class="dd-tasks dd-tasks--in-group">
                  <div
                    v-for="task in tasksInGroup(cellGroup(row.id, col.id).id)"
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
              <div v-else class="dt-empty-cell"></div>
            </td>
          </tr>
        </tbody>
      </table>
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
  name: 'DragTable',
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
    rows() {
      return this.content.rows || []
    },
    columns() {
      return this.content.columns || []
    },
    groups() {
      return this.content.groups || []
    },
    tasks() {
      return this.content.tasks || []
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
    rowHeaderHtml() {
      if (!this.content.row_header) return ''
      return md.renderInline(this.content.row_header)
    },
    // индекс ячеек: (rowId, columnId) -> group
    groupByCell() {
      const map = {}
      this.groups.forEach(group => {
        const key = `${group.row_id}__${group.column_id}`
        map[key] = group
      })
      return map
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
    }
  },
  created() {
    this.initAssignments()
  },
  methods: {
    initAssignments() {
      const map = {}
      this.tasks.forEach(task => map[task.id] = null)
      
      let hasRestoredAnswers = false
      if (this.savedState?.latestAttempt) {
        const attempt = this.savedState.latestAttempt
        if (attempt.selectedOptionIds && Array.isArray(attempt.selectedOptionIds)) {
            attempt.selectedOptionIds.forEach(assignment => {
              const parts = assignment.split(':')
              if (parts.length === 2) {
                map[parts[0]] = parts[1]
                hasRestoredAnswers = true
              }
            })
        }
      }

      this.assignments = map
      this.showResults = hasRestoredAnswers
      this.draggedTaskId = null
      this.hoverGroupId = null
    },

    // --- helpers для выборки задач и ячеек ---

    tasksInPool() {
      return this.tasks.filter(task => !this.assignments[task.id])
    },

    tasksInGroup(groupId) {
      return this.tasks.filter(task => this.assignments[task.id] === groupId)
    },

    cellGroup(rowId, columnId) {
      const key = `${rowId}__${columnId}`
      return this.groupByCell[key] || null
    },

    // --- markdown helpers ---

    renderTaskContent(task) {
      return md.renderInline(task?.content || '')
    },

    renderRowContent(row) {
      return md.renderInline(row?.content || '')
    },

    renderColumnContent(col) {
      return md.renderInline(col?.content || '')
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
      
      let selectedCorrectOptionsTotal = 0
      let selectedIncorrectOptionsTotal = 0
      const selectedOptionIds = []
      
      for (const t of this.tasks) {
          if (this.assignments[t.id]) {
            selectedOptionIds.push(`${t.id}:${this.assignments[t.id]}`)
          }
          if (this.isTaskCorrect(t)) {
              selectedCorrectOptionsTotal++
          } else if (this.assignments[t.id]) {
              selectedIncorrectOptionsTotal++
          }
      }

      const isFullyCorrect = selectedCorrectOptionsTotal === this.tasks.length

      const payload = {
          topicId: this.topicId || this.node.topicId,
          lessonId: this.lessonId || this.node.lessonId,
          lessonVersion: this.lessonVersion,
          ruleId: null,

          taskId: this.node.id, 
          subTaskId: null,
          taskType: 'DragTable',
          answerType: 'match',
          taskVersion: this.node.taskVersion || null,
          skillId: this.node.skill_id || null, 

          selectedOptionIds: selectedOptionIds,
          userAnswerIsCorrect: isFullyCorrect,

          correctOptions: this.tasks.length,
          selectedCorrectOptions: selectedCorrectOptionsTotal,
          selectedIncorrectOptions: selectedIncorrectOptionsTotal,
          
          responseMs: Date.now() - this.startTime
      }

      try {
          await AnalyticsService.logAttempt(payload)
      } catch (e) {
          console.error('Failed to log DragTable attempt', e)
      }
    },

    reset() {
      this.initAssignments()
    },

    isTaskCorrect(task) {
      if (!task || !task.correct_group) return false
      return this.assignments[task.id] === task.correct_group
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
.drag-table {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  border: 1px solid #e9ecef;
}

.quiz-header {
  margin-bottom: 20px;
}

/* Пул карточек */

.dt-pool {
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

/* Таблица */

.dt-wrapper {
  width: 100%;
  overflow-x: auto;
}

.dt-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  background-color: #ffffff;
  border-radius: 8px;
  overflow: hidden;
}

.dt-header-cell,
.dt-row-label,
.dt-cell {
  border: 1px solid #dee2e6;
  padding: 8px 10px;
  vertical-align: top;
}

.dt-header-cell {
  background-color: #f1f3f5;
  font-weight: 600;
  font-size: 0.9em;
}

.dt-header-cell--row {
  min-width: 120px;
}

.dt-row-label {
  background-color: #f8f9fa;
  font-weight: 600;
  font-size: 0.9em;
  white-space: nowrap;
}

.dt-cell {
  min-width: 180px;
}

/* корзина внутри ячейки */

.dt-group {
  border-radius: 6px;
  border: 2px dashed #ced4da;
  min-height: 40px;
  padding: 6px;
  transition: border-color 0.2s, background-color 0.2s;
}

.dd-tasks--in-group {
  min-height: 28px;
  flex-wrap: wrap;
}

/* пустая ячейка, где нет группы */

.dt-empty-cell {
  min-height: 40px;
}

/* hover / ошибки */

.dt-group.is-hovered {
  border-color: #007bff;
  background-color: #e9f5ff;
}

.dt-group.has-incorrect {
  border-color: #dc3545;
}

/* Кнопки и результат */

.quiz-actions {
  margin-top: 8px;
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
</style>
