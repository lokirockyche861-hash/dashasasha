<template>
  <MainLayout>
    <div class="home-container">
      <div class="columns-grid">
        
        <!-- Left Column: Theory -->
        <div class="column theory">
          <h2 class="column-title">Теория</h2>
          
          <!-- Раздел: Фонетика -->
          <div v-if="phoneticsLessons.length" class="topic-section">
            <h3 class="topic-title">Фонетика</h3>
            <ul class="lesson-list">
              <li v-for="l in phoneticsLessons" :key="l.id">
                <NuxtLink :to="{ name: 'lesson-id', params: { id: l.id } }" class="lesson-link">
                  {{ l.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Раздел: Морфемика -->
          <div v-if="morphemicsLessons.length" class="topic-section">
            <h3 class="topic-title">Морфемика</h3>
            <ul class="lesson-list">
              <li v-for="l in morphemicsLessons" :key="l.id">
                <NuxtLink :to="{ name: 'lesson-id', params: { id: l.id } }" class="lesson-link">
                  {{ l.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Дополнительные уроки теории (если появятся без темы) -->
          <div v-if="otherTheoryLessons.length" class="topic-section">
            <ul class="lesson-list">
              <li v-for="l in otherTheoryLessons" :key="l.id">
                <NuxtLink :to="{ name: 'lesson-id', params: { id: l.id } }" class="lesson-link">
                  {{ l.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <!-- Right Column: Practice -->
        <div class="column practice">
          <h2 class="column-title">Практика (Интерактивные архетипы)</h2>
          
          <!-- 1. Хребтовое дерево решений -->
          <div v-if="spineLessons.length" class="topic-section">
            <h3 class="topic-title">1. Хребтовое дерево (SpineDecisionTree)</h3>
            <ul class="lesson-list">
              <li v-for="l in spineLessons" :key="l.id">
                <NuxtLink :to="{ name: 'lesson-id', params: { id: l.id } }" class="lesson-link">
                  {{ l.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- 2. Бинарное дерево решений -->
          <div v-if="binaryLessons.length" class="topic-section">
            <h3 class="topic-title">2. Бинарное дерево решений (BinaryDecisionTree)</h3>
            <ul class="lesson-list">
              <li v-for="l in binaryLessons" :key="l.id">
                <NuxtLink :to="{ name: 'lesson-id', params: { id: l.id } }" class="lesson-link">
                  {{ l.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- 3. Пошаговый алгоритм -->
          <div v-if="stepLessons.length" class="topic-section">
            <h3 class="topic-title">3. Пошаговый алгоритм (StepAlgorithm)</h3>
            <ul class="lesson-list">
              <li v-for="l in stepLessons" :key="l.id">
                <NuxtLink :to="{ name: 'lesson-id', params: { id: l.id } }" class="lesson-link">
                  {{ l.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- 4. Матричный классификатор -->
          <div class="topic-section">
            <h3 class="topic-title">4. Матричный классификатор (MatrixClassifier)</h3>
            <ul class="lesson-list">
              <li v-for="l in matrixLessons" :key="l.id">
                <NuxtLink :to="{ name: 'lesson-id', params: { id: l.id } }" class="lesson-link">
                  {{ l.title }}
                </NuxtLink>
              </li>
              <li v-if="!matrixLessons.length" class="lesson-item-disabled">
                <div class="lesson-link disabled">
                  <span class="lesson-title-muted">Урок 6. Безударные гласные в корне. Корни с чередованием</span>
                  <span class="archetype-badge-pending">в разработке</span>
                </div>
              </li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { computed } from 'vue'
import { lessons } from '@/lessons'
import MainLayout from '@/layouts/MainLayout.vue'

// Группировка теоретических уроков: сначала Фонетика, затем Морфемика
const phoneticsLessons = computed(() => lessons.filter(l => !l.isDecisionTree && l.topicId === 'phonetics'))
const morphemicsLessons = computed(() => lessons.filter(l => !l.isDecisionTree && l.topicId === 'morphemics'))
const otherTheoryLessons = computed(() => lessons.filter(l => !l.isDecisionTree && l.topicId !== 'phonetics' && l.topicId !== 'morphemics'))

// Вспомогательная сортировка по номеру урока автора
const getLessonNum = (title) => {
  const m = (title || '').match(/Урок\s+(\d+)/i)
  return m ? parseInt(m[1], 10) : 999
}

// Практические уроки по 4 архетипам
const spineLessons = computed(() => 
  lessons.filter(l => l.isDecisionTree && l.archetype === 'spine')
    .sort((a, b) => getLessonNum(a.title) - getLessonNum(b.title))
)

const binaryLessons = computed(() => 
  lessons.filter(l => l.isDecisionTree && l.archetype === 'binary')
    .sort((a, b) => getLessonNum(a.title) - getLessonNum(b.title))
)

const stepLessons = computed(() => 
  lessons.filter(l => l.isDecisionTree && l.archetype === 'steps')
    .sort((a, b) => getLessonNum(a.title) - getLessonNum(b.title))
)

const matrixLessons = computed(() => 
  lessons.filter(l => l.isDecisionTree && l.archetype === 'matrix')
    .sort((a, b) => getLessonNum(a.title) - getLessonNum(b.title))
)
</script>

<style scoped>
.home-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.columns-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
}

@media (max-width: 900px) {
  .columns-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}

.column-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.topic-section {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.topic-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #334155;
  margin-top: 0;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.lesson-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lesson-list li {
  margin-bottom: 0.75rem;
}

.lesson-list li:last-child {
  margin-bottom: 0;
}

.lesson-link {
  display: block;
  padding: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #334155;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
}

.lesson-link:hover {
  border-color: #3b82f6;
  color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.lesson-link.disabled {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #64748b;
  cursor: not-allowed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: none;
  transform: none;
}

.lesson-link.disabled:hover {
  border-color: #cbd5e1;
  color: #64748b;
  transform: none;
  box-shadow: none;
}

.archetype-badge-pending {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: #e2e8f0;
  color: #475569;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  white-space: nowrap;
  margin-left: 0.5rem;
}
</style>
