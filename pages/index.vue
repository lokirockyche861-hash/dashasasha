<template>
  <MainLayout>
    <div class="home-container">
      <div class="columns-grid">
        
        <!-- Left Column: Theory -->
        <div class="column theory">
          <h2 class="column-title">Теория</h2>
          <ul class="lesson-list">
            <li v-for="l in theoryLessons" :key="l.id">
              <NuxtLink :to="{ name: 'lesson-id', params: { id: l.id } }" class="lesson-link">
                {{ l.title }}
              </NuxtLink>
            </li>
          </ul>
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
import { lessons } from '@/lessons'
import MainLayout from '@/layouts/MainLayout.vue'


// Split lessons based on isDecisionTree flag
// Note: In index.js, we need to ensure lessons have this flag. 
// Currently only lesson-pol has it. We'll assume others don't.
const theoryLessons = computed(() => lessons.filter(l => !l.isDecisionTree))
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

.lesson-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lesson-list li {
  margin-bottom: 1rem;
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
