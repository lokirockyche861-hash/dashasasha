
import { db } from '~/server/db/client'
import { attempts } from '~/server/db/schema' // check path relative to server/api/progress.get.ts -> ../../db/schema
import { eq, and, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    const uid = getCookie(event, 'uid')
    if (!uid) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const query = getQuery(event)
    const lessonId = query.lessonId

    if (!lessonId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing lessonId' })
    }

    try {
        // Fetch latest attempt per task for this lesson
        // Using Postgres DISTINCT ON to get the single latest row per taskId
        const results = await db
            .selectDistinctOn([attempts.taskId])
            .from(attempts)
            .where(and(
                eq(attempts.userId, uid),
                eq(attempts.lessonId, String(lessonId))
            ))
            .orderBy(attempts.taskId, desc(attempts.createdAt))

        // Transform to map: taskId -> status
        const progress: Record<string, any> = {}
        for (const row of results) {
            progress[row.taskId] = {
                taskId: row.taskId,
                isCorrect: row.isCorrect,
                score: row.score,
                // Return answer details for restoration
                answerText: row.answerText,
                selectedOptionId: row.selectedOptionId,
                selectedOptionIds: row.selectedOptionIds,
                taskAttempt: row.taskAttempt
            }
        }

        return {
            ok: true,
            progress
        }

    } catch (e) {
        console.error('[API] Failed to fetch progress', e)
        throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    }
})
