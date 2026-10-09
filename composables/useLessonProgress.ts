import { ref } from 'vue'

// Global state to share across components if needed, or just per instance. 
// Given the linear nature, per-instance usage in LessonPage is fine, but exporting a shared reactive object works too.
// Let's keep it simple: return refs that can be used by the page.

export function useLessonProgress() {
    const progress = ref<Record<string, any>>({})
    const isLoading = ref(false)

    async function loadProgress(lessonId: string) {
        if (!lessonId) return
        isLoading.value = true
        try {
            const data = await $fetch(`/api/progress/${lessonId}`)
            progress.value = data || {}
        } catch (e) {
            console.error('Failed to load progress', e)
        } finally {
            isLoading.value = false
        }
    }

    function getTaskState(taskId: string) {
        return progress.value[taskId] || null
    }

    return {
        progress,
        isLoading,
        loadProgress,
        getTaskState
    }
}
