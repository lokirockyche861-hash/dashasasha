import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { attempts } from '../db/schema'

export const attemptRepo = {
    async create(data: Omit<typeof attempts.$inferInsert, 'attemptId' | 'taskAttempt' | 'createdAt'>) {
        // Calculate task attempt number
        const existingAttempts = await db
            .select({ count: sql`count(*)` })
            .from(attempts)
            .where(and(
                eq(attempts.userId, data.userId),
                eq(attempts.taskId, data.taskId),
                // If subTaskId is present, scope attempt count to it
                data.subTaskId ? eq(attempts.subTaskId, data.subTaskId) : sql`1=1`
            ))

        const taskAttempt = Number(existingAttempts[0].count) + 1

        const result = await db.insert(attempts).values({
            ...data,
            taskAttempt
        }).returning()
        return result[0]
    },

    async findAll() {
        return db.select().from(attempts).orderBy(attempts.createdAt)
    }
}
