import { defineEventHandler, getCookie } from 'h3'
import { db } from '../../db/client'
import { attempts } from '../../db/schema'
import { eq, and, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    const lessonId = event.context.params?.lessonId
    const userId = getCookie(event, 'uid')

    if (!userId || !lessonId) {
        return {}
    }

    try {
        // Fetch all attempts for this lesson and user, ordered by time desc (latest first)
        const userAttempts = await db.select().from(attempts)
            .where(and(
                eq(attempts.userId, userId),
                eq(attempts.lessonId, lessonId)
            ))
            .orderBy(desc(attempts.createdAt))

        const progressMap: Record<string, any> = {}

        for (const attempt of userAttempts) {
            const tId = attempt.taskId
            const sId = attempt.subTaskId

            if (!progressMap[tId]) {
                progressMap[tId] = {
                    latestAttempt: null,
                    subTasks: {}
                }
            }

            if (sId) {
                // If we haven't seen this subtask yet, store it (it's the latest because of sort order)
                if (!progressMap[tId].subTasks[sId]) {
                    progressMap[tId].subTasks[sId] = attempt
                }
            } else {
                // If we haven't seen the main task yet, store it
                if (!progressMap[tId].latestAttempt) {
                    progressMap[tId].latestAttempt = attempt
                }
            }
        }

        return progressMap
    } catch (e) {
        console.error('Failed to fetch progress', e)
        return {}
    }
})
