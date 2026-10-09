
import { attemptRepo } from '../repositories/attemptRepo'
import { validateGraphNode } from '../utils/graphRegistry'

export default defineEventHandler(async (event) => {
    // 1. Session & User
    const uid = getCookie(event, 'uid')
    if (!uid) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized: missing uid' })
    }

    // session_id (optional, logic simplified as discussed)
    const sid = getCookie(event, 'sid') || null // or from header

    const body = await readBody(event)

    // 2. Strict Validation: Required Fields
    const required = [
        'topicId', 'lessonId',
        'taskId', 'taskType', 'answerType',
        'userAnswerIsCorrect'
    ]
    const missing = required.filter(f => body[f] === undefined || body[f] === null || body[f] === '')
    if (missing.length > 0) {
        throw createError({
            statusCode: 400,
            statusMessage: `Missing fields: ${missing.join(', ')}`
        })
    }

    // 3. Graph Validation (if graph context provided)
    // Validate only if it's NOT an input task (inputs are precursors to graph, not nodes within it)
    if (body.graphId && body.subTaskId && body.answerType !== 'input') {
        const { valid, error } = validateGraphNode(
            body.graphId,
            body.subTaskId,
            body.selectedOptionId // checks if option belongs to node (for selectedOptionId)
        )
        // Additional checks for multi-select/match could be added here or in registry

        if (!valid) {
            console.warn(`[API] Graph validation failed: ${error}`, body)
            throw createError({ statusCode: 400, statusMessage: `Graph validation failed: ${error}` })
        }
    }

    // 4. Payload Construction
    // Enforce server-side rules (score = isCorrect ? 1 : 0)
    const isCorrect = Boolean(body.userAnswerIsCorrect)

    // Normalize data (nullify empty strings if any remain, though client should send null)
    const normalize = (v: any) => (v === '' || v === undefined) ? null : v

    try {
        const payload = {
            userId: uid,
            sessionId: sid,

            // Context
            topicId: String(body.topicId),
            lessonId: String(body.lessonId),
            lessonVersion: normalize(body.lessonVersion),
            ruleId: normalize(body.ruleId),

            // Task
            taskId: String(body.taskId),
            taskType: String(body.taskType),
            answerType: String(body.answerType),
            taskVersion: normalize(body.taskVersion),

            // Graph
            graphId: normalize(body.graphId),
            subTaskId: normalize(body.subTaskId),
            skillId: normalize(body.skillId),

            // Counters (nullable for input tasks)
            correctOptions: body.correctOptions !== undefined && body.correctOptions !== null ? Number(body.correctOptions) : null,
            incorrectOptions: body.incorrectOptions !== undefined && body.incorrectOptions !== null ? Number(body.incorrectOptions) : null,
            selectedCorrectOptions: body.selectedCorrectOptions !== undefined && body.selectedCorrectOptions !== null ? Number(body.selectedCorrectOptions) : null,
            selectedIncorrectOptions: body.selectedIncorrectOptions !== undefined && body.selectedIncorrectOptions !== null ? Number(body.selectedIncorrectOptions) : null,

            // Answer
            answerText: normalize(body.answerText),
            selectedOptionId: normalize(body.selectedOptionId),
            selectedOptionIds: body.selectedOptionIds || null, // Expecting array or null

            // Score
            isCorrect: isCorrect,
            score: isCorrect ? 1 : 0,

            responseMs: body.responseMs ? Number(body.responseMs) : null
        }

        const attempt = await attemptRepo.create(payload)

        return {
            ok: true,
            attemptId: attempt.attemptId,
            taskAttempt: attempt.taskAttempt
        }

    } catch (e) {
        console.error('[API] Save attempt failed', e)
        throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    }
})
