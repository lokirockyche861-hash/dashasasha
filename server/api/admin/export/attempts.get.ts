
import { attemptRepo } from '~/server/repositories/attemptRepo'

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'secret-admin-token'

export default defineEventHandler(async (event) => {
    // 1. Basic Auth Check
    const authHeader = getRequestHeader(event, 'Authorization')
    if (authHeader !== `Bearer ${ADMIN_TOKEN}`) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // 2. Parse Query
    const query = getQuery(event)
    const format = (query.format as string || 'json').toLowerCase()

    if (!['csv', 'json'].includes(format)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid format. Use csv or json.' })
    }

    // 3. Fetch Data
    const attempts = await attemptRepo.findAll()

    // 4. Return JSON
    if (format === 'json') {
        return {
            ok: true,
            count: attempts.length,
            data: attempts
        }
    }

    // 5. Return CSV
    const header = [
        'attempt_id', 'session_id', 'user_id',
        'lesson_id', 'lesson_version', 'topic_id', 'rule_id',
        'task_id', 'task_type', 'task_version', 'task_attempt',
        'graph_id', 'sub_task_id', 'skill_id',
        'answer_type', 'answer_text', 'selected_option_id', 'selected_option_ids',
        'user_answer_is_correct', 'user_score', 'response_ms',
        'correct_options', 'incorrect_options', 'selected_correct_options', 'selected_incorrect_options',
        'created_at'
    ]

    const normalize = (val: any) => {
        if (val === null || val === undefined) return ''
        let s = val
        if (typeof val === 'object') {
            s = JSON.stringify(val)
        } else {
            s = String(val)
        }
        // Escape quotes
        return `"${s.replace(/"/g, '""')}"`
    }

    const rows = attempts.map(a => [
        a.attemptId, a.sessionId, a.userId,
        a.lessonId, a.lessonVersion, a.topicId, a.ruleId,
        a.taskId, a.taskType, a.taskVersion, a.taskAttempt,
        a.graphId, a.subTaskId, a.skillId,
        a.answerType, a.answerText, a.selectedOptionId, a.selectedOptionIds,
        a.isCorrect, a.score, a.responseMs,
        a.correctOptions, a.incorrectOptions, a.selectedCorrectOptions, a.selectedIncorrectOptions,
        a.createdAt?.toISOString()
    ].map(normalize))

    const csvContent = [
        header.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n')

    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="attempts-${new Date().toISOString().slice(0, 10)}.csv"`)

    return csvContent
})
