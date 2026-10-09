import { attemptRepo } from '../server/repositories/attemptRepo'
import { db } from '../server/db/client'
import { attempts } from '../server/db/schema'
import { eq } from 'drizzle-orm'

async function main() {
    const userId = `test-user-${Date.now()}`
    const taskId = 'test-task-1'

    console.log(`Testing attempt creation for User: ${userId}, Task: ${taskId}`)

    const commonData = {
        userId,
        taskId,
        ruleId: 'rule-test',
        graphId: 'graph-test',
        topicId: 'topic-test',
        nodeId: 'node-test',
        taskVersion: 'v1'
    }

    // Attempt 1 (Input)
    console.log('Creating Attempt 1 (Input)...')
    const a1 = await attemptRepo.create({
        ...commonData,
        isCorrect: false,
        score: 0,
        answerText: 'wrong',
        selectedOptionId: null,
        skillId: null,
        optionId: null,
        responseMs: 1200
    })
    console.log(`Attempt 1 created: attemptNo=${a1.attemptNo}, id=${a1.attemptId}`)

    if (a1.attemptNo !== 1) throw new Error(`Expected attemptNo 1, got ${a1.attemptNo}`)

    // Attempt 2 (Choice)
    console.log('Creating Attempt 2 (Choice)...')
    const a2 = await attemptRepo.create({
        ...commonData,
        isCorrect: true,
        score: 1,
        answerText: null,
        selectedOptionId: 'opt-yes',
        skillId: 's1',
        optionId: 'opt-1',
        responseMs: 800
    })
    console.log(`Attempt 2 created: attemptNo=${a2.attemptNo}, id=${a2.attemptId}`)

    if (a2.attemptNo !== 2) throw new Error(`Expected attemptNo 2, got ${a2.attemptNo}`)

    // Cleanup
    console.log('Cleaning up...')
    await db.delete(attempts).where(eq(attempts.userId, userId))

    console.log('SUCCESS: attemptNo increments correctly with valid schema.')
    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
