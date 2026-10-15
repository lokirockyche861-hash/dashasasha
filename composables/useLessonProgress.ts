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

    function isTaskSolved(taskId: string): boolean {
        const state = getTaskState(taskId)
        if (!state) return false

        // Check if top-level latestAttempt is correct
        if (state.latestAttempt?.isCorrect) {
            return true
        }

        // Check subTasks
        if (state.subTasks && typeof state.subTasks === 'object') {
            // Direct input subtask check (e.g. t1_input or ${taskId}_input)
            const inputSubTaskId = `${taskId}_input`
            if (state.subTasks[inputSubTaskId]?.isCorrect) {
                return true
            }

            const subList = Object.values(state.subTasks) as any[]
            // Find input subtask or DecisionTreeInput
            const inputAttempt = subList.find(s => s && (s.taskType === 'DecisionTreeInput' || s.answerType === 'input'))
            if (inputAttempt?.isCorrect) {
                return true
            }

            // If all subtasks are correct (for multi-subtask tasks)
            if (subList.length > 0 && subList.every(s => s?.isCorrect)) {
                return true
            }
        }

        return false
    }

    function getRestoredAnswer(taskId: string): any {
        const state = getTaskState(taskId)
        if (!state) return null

        if (state.latestAttempt && state.latestAttempt.answerText !== undefined && state.latestAttempt.answerText !== null) {
            return state.latestAttempt
        }

        if (state.subTasks && typeof state.subTasks === 'object') {
            const inputSubTaskId = `${taskId}_input`
            if (state.subTasks[inputSubTaskId] && state.subTasks[inputSubTaskId].answerText !== undefined && state.subTasks[inputSubTaskId].answerText !== null) {
                return state.subTasks[inputSubTaskId]
            }

            const subList = Object.values(state.subTasks) as any[]
            const inputAttempt = subList.find(s => s && (s.taskType === 'DecisionTreeInput' || s.answerType === 'input' || s.answerText != null))
            if (inputAttempt) {
                return inputAttempt
            }
        }

        return state.latestAttempt || null
    }

    function markSolved(taskId: string, answer?: any) {
        if (!progress.value[taskId]) {
            progress.value[taskId] = {
                latestAttempt: null,
                subTasks: {}
            }
        }
        const answerObj = typeof answer === 'object' && answer !== null ? answer : { answerText: answer }
        const attemptData = {
            taskId,
            isCorrect: true,
            ...answerObj
        }
        progress.value[taskId].latestAttempt = {
            ...progress.value[taskId].latestAttempt,
            ...attemptData
        }
        if (!progress.value[taskId].subTasks) {
            progress.value[taskId].subTasks = {}
        }
        const inputSubTaskId = `${taskId}_input`
        progress.value[taskId].subTasks[inputSubTaskId] = {
            ...progress.value[taskId].subTasks[inputSubTaskId],
            ...attemptData
        }
    }

    return {
        progress,
        isLoading,
        loadProgress,
        getTaskState,
        isTaskSolved,
        getRestoredAnswer,
        markSolved
    }
}
