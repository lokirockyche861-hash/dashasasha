<template>
  <PracticeLessonContainer
    :lesson="lesson"
    :lessonId="lessonId"
    :ruleLoader="ruleLoader"
    :tasksLoader="tasksLoader"
    :theoryLoader="theoryLoader"
  />
</template>

<script setup>
import PracticeLessonContainer from './PracticeLessonContainer.vue'

defineProps({
  lesson: {
    type: Object,
    default: () => ({})
  },
  lessonId: {
    type: String,
    default: ''
  },
  ruleLoader: {
    type: Function,
    default: null
  },
  tasksLoader: {
    type: Function,
    default: null
  },
  theoryLoader: {
    type: Function,
    default: null
  }
})
</script>
