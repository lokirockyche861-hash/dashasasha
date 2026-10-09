
export const AnalyticsService = {
    /**
     * Sends attempt data to the server.
     * @param {Object} payload - The attempt data (matching API contract)
     */
    async logAttempt(payload) {
        // Dev logging
        if (import.meta.dev) {
            console.log('[Analytics] Logging attempt:', payload)
        }

        try {
            const response = await $fetch('/api/attempts', {
                method: 'POST',
                body: payload
            })
            return response
        } catch (error) {
            console.error('[Analytics] Failed to log attempt:', error)
            // Could implement retry queue here
            throw error // Re-throw to let component handle UI feedback if needed
        }
    },

    /**
     * Helper to retrieve progress for a lesson.
     * @param {string} lessonId
     */
    async fetchProgress(lessonId) {
        try {
            const response = await $fetch('/api/progress', {
                params: { lessonId }
            })
            return response.progress || {}
        } catch (error) {
            console.error('[Analytics] Failed to fetch progress:', error)
            return {}
        }
    }
}
