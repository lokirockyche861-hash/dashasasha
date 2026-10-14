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
          <h2 class="column-title">Практика</h2>
          <ul class="lesson-list">
            <li v-for="l in practiceLessons" :key="l.id">
              <NuxtLink :to="{ name: 'lesson-id', params: { id: l.id } }" class="lesson-link">
                {{ l.title }}
              </NuxtLink>
            </li>
          </ul>
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

// Практические уроки
const practiceLessons = computed(() => lessons.filter(l => l.isDecisionTree))
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
</style>
