<script setup>
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
    <div v-if="loading || isProgressLoading">Загрузка...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else-if="lesson">
      <h1 v-if="!isDecisionTree" class="lesson-title">{{ lesson.title }}</h1>
      
      <DecisionTreeLesson 
        v-if="isDecisionTree"
        :ruleLoader="lesson.ruleLoader"
        :tasksLoader="lesson.tasksLoader"
        :lessonId="lesson.id"
      />
      <SimpleRenderer 
        v-else 
        :content="lesson.content" 
        :lessonId="lesson.id"
        :topicId="lesson.topicId"
        :lessonVersion="lesson.lesson_version"
        :progress="progress"
      />
    </div>
  </component>
</template>

<style scoped>
.lesson-title {
  margin-bottom: 2rem;
  font-size: 2rem;
  color: #1e293b;
}
</style>
