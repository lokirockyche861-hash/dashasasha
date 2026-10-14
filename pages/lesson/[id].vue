<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { lessons } from '@/lessons'
import SimpleRenderer from '@/components/SimpleRenderer.vue'
import DecisionTreeLesson from '@/components/decision-tree/DecisionTreeLesson.vue'
import BookLayout from '@/layouts/BookLayout.vue'
import GraphLayout from '@/layouts/GraphLayout.vue'

import { useLessonProgress } from '@/composables/useLessonProgress'

const route = useRoute()
const loading = ref(true)
const error = ref(null)
const lesson = ref(null)

const { progress, isLoading: isProgressLoading, loadProgress } = useLessonProgress()

const isDecisionTree = computed(() => lesson.value?.isDecisionTree)
const currentLayout = computed(() => isDecisionTree.value ? GraphLayout : BookLayout)

// Список уроков текущего раздела
const topicLessons = computed(() => {
  if (!lesson.value || !lesson.value.topicId) return []
  return lessons.filter(l => !l.isDecisionTree && l.topicId === lesson.value.topicId)
})

const currentLessonIndex = computed(() => {
  if (!lesson.value) return -1
  return topicLessons.value.findIndex(l => l.id === lesson.value.id)
})

const prevLesson = computed(() => {
  if (currentLessonIndex.value > 0) {
    return topicLessons.value[currentLessonIndex.value - 1]
  }
  return null
})

const nextLesson = computed(() => {
  if (currentLessonIndex.value >= 0 && currentLessonIndex.value < topicLessons.value.length - 1) {
    return topicLessons.value[currentLessonIndex.value + 1]
  }
  return null
})

// Если текущий урок — последний в теме, переход к следующему разделу
const nextSection = computed(() => {
  if (currentLessonIndex.value === -1 || currentLessonIndex.value < topicLessons.value.length - 1) {
    return null
  }
  if (lesson.value?.topicId === 'phonetics') {
    return {
      title: 'Морфемика',
      targetLessonId: 'lesson1',
      buttonText: 'Перейти к разделу: Морфемика'
    }
  }
  if (lesson.value?.topicId === 'morphemics') {
    return {
      title: 'Практика',
      targetLessonId: 'lesson-pol',
      buttonText: 'Перейти к разделу: Практика'
    }
  }
  return null
})

const scrollToTop = () => {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}

const loadLesson = async (id) => {
  loading.value = true
  error.value = null
  lesson.value = null
  
  const found = lessons.find(l => l.id === id)
  if (!found) {
    error.value = 'Урок не найден'
    loading.value = false
    return
  }

  try {
    if (found.isDecisionTree) {
      lesson.value = { ...found }
    } else {
      const mod = await found.loader()
      lesson.value = { ...found, ...mod.default }
      // Load progress for linear lessons
      await loadProgress(id)
    }
  } catch (e) {
    console.error(e)
    error.value = 'Ошибка загрузки урока'
  } finally {
    loading.value = false
    scrollToTop()
  }
}

onMounted(() => {
  loadLesson(route.params.id)
})

watch(() => route.params.id, (newId) => {
  if (newId) loadLesson(newId)
})
</script>

<template>
  <component :is="currentLayout">
    <div v-if="loading || isProgressLoading" class="status-msg">Загрузка...</div>
    <div v-else-if="error" class="status-msg error-msg">
      <p>{{ error }}</p>
      <NuxtLink to="/" class="back-home-link">← На главную</NuxtLink>
    </div>
    <div v-else-if="lesson">
      <div v-if="!isDecisionTree" class="lesson-top-nav">
        <NuxtLink to="/" class="back-home-link">
          ← На главную
        </NuxtLink>
      </div>

      <h1 v-if="!isDecisionTree" class="lesson-title">{{ lesson.title }}</h1>
      
      <DecisionTreeLesson 
        v-if="isDecisionTree"
        :ruleLoader="lesson.ruleLoader"
        :tasksLoader="lesson.tasksLoader"
        :lessonId="lesson.id"
      />
      <SimpleRenderer 
        v-else 
        :key="lesson.id"
        :content="lesson.content" 
        :lessonId="lesson.id"
        :topicId="lesson.topicId"
        :lessonVersion="lesson.lesson_version"
        :progress="progress"
      />

      <!-- Нижний блок навигации для теоретических уроков -->
      <nav v-if="!isDecisionTree" class="lesson-bottom-nav" aria-label="Навигация по урокам">
        <div class="nav-slot nav-slot-prev">
          <NuxtLink 
            v-if="prevLesson" 
            :to="{ name: 'lesson-id', params: { id: prevLesson.id } }" 
            class="nav-card nav-card-secondary"
          >
            <span class="nav-hint">← Предыдущий урок</span>
            <span class="nav-title">{{ prevLesson.title }}</span>
          </NuxtLink>
          <NuxtLink 
            v-else 
            to="/" 
            class="nav-card nav-card-ghost"
          >
            <span class="nav-hint">← К списку уроков</span>
            <span class="nav-title">Главная страница</span>
          </NuxtLink>
        </div>

        <div class="nav-slot nav-slot-next">
          <NuxtLink 
            v-if="nextLesson" 
            :to="{ name: 'lesson-id', params: { id: nextLesson.id } }" 
            class="nav-card nav-card-primary"
          >
            <span class="nav-hint">Следующий урок →</span>
            <span class="nav-title">{{ nextLesson.title }}</span>
          </NuxtLink>
          <NuxtLink 
            v-else-if="nextSection" 
            :to="{ name: 'lesson-id', params: { id: nextSection.targetLessonId } }" 
            class="nav-card nav-card-section"
          >
            <span class="nav-hint">Тема завершена</span>
            <span class="nav-title">{{ nextSection.buttonText }} →</span>
          </NuxtLink>
          <NuxtLink 
            v-else 
            to="/" 
            class="nav-card nav-card-primary"
          >
            <span class="nav-hint">Завершить</span>
            <span class="nav-title">Вернуться на главную →</span>
          </NuxtLink>
        </div>
      </nav>
    </div>
  </component>
</template>

<style scoped>
.status-msg {
  padding: 2rem;
  color: #64748b;
  font-size: 1.1rem;
}

.error-msg {
  color: #dc2626;
}

.lesson-top-nav {
  margin-bottom: 1.5rem;
}

.back-home-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: #64748b;
  text-decoration: none;
  padding: 0.45rem 0.85rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.back-home-link:hover {
  color: #0f172a;
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.lesson-title {
  margin-bottom: 2rem;
  font-size: 2rem;
  color: #1e293b;
  line-height: 1.3;
}

.lesson-bottom-nav {
  margin-top: 3.5rem;
  padding-top: 2rem;
  border-top: 2px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 1.25rem;
}

.nav-slot {
  flex: 1;
  display: flex;
}

.nav-slot-prev {
  justify-content: flex-start;
}

.nav-slot-next {
  justify-content: flex-end;
}

.nav-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  text-decoration: none;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.nav-slot-prev .nav-card {
  text-align: left;
}

.nav-slot-next .nav-card {
  text-align: right;
}

.nav-card-secondary {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #1e293b;
}

.nav-card-secondary:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.nav-card-ghost {
  background-color: transparent;
  border: 1px dashed #cbd5e1;
  color: #64748b;
  justify-content: center;
}

.nav-card-ghost:hover {
  background-color: #f8fafc;
  border-color: #94a3b8;
  color: #1e293b;
}

.nav-card-primary {
  background-color: #2563eb;
  border: 1px solid #2563eb;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.nav-card-primary:hover {
  background-color: #1d4ed8;
  border-color: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
}

.nav-card-section {
  background-color: #059669;
  border: 1px solid #059669;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
}

.nav-card-section:hover {
  background-color: #047857;
  border-color: #047857;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3);
}

.nav-hint {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.35rem;
  opacity: 0.85;
}

.nav-title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (max-width: 640px) {
  .lesson-bottom-nav {
    flex-direction: column-reverse;
  }
  .nav-slot-next .nav-card {
    text-align: left;
  }
}
</style>
