import { pgTable, uuid, text, integer, timestamp, boolean, index, jsonb } from 'drizzle-orm/pg-core'

export const attempts = pgTable('attempts', {
    attemptId: uuid('attempt_id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id'), // из cookie sid (nullable пока)
    userId: text('user_id').notNull(), // из cookie uid

    // Контекст контента
    topicId: text('topic_id').notNull(),
    lessonId: text('lesson_id').notNull(),
    lessonVersion: text('lesson_version'),
    ruleId: text('rule_id'),

    taskId: text('task_id').notNull(),
    taskType: text('task_type').notNull(), // QuizCheckbox | QuizSet ...
    answerType: text('answer_type').notNull(), // select | input ...

    // Граф (nullable, если не граф)
    graphId: text('graph_id'),
    subTaskId: text('sub_task_id'), // formerly node_id
    skillId: text('skill_id'),

    // Версии
    taskVersion: text('task_version'),

    // Счетчики (подробное логирование)
    // Счетчики (подробное логирование) - nullable для input-задач
    correctOptions: integer('correct_options').default(0),
    incorrectOptions: integer('incorrect_options').default(0),
    selectedCorrectOptions: integer('selected_correct_options').default(0),
    selectedIncorrectOptions: integer('selected_incorrect_options').default(0),

    // Ответ
    answerText: text('answer_text'),
    selectedOptionId: text('selected_option_id'),
    selectedOptionIds: jsonb('selected_option_ids'), // массив строк или пар

    // Оценка
    isCorrect: boolean('user_answer_is_correct').notNull(),
    score: integer('user_score').notNull().default(0),
    taskAttempt: integer('task_attempt').notNull(), // номер попытки

    responseMs: integer('response_ms'),

    // Время
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (t) => ({
    userIdx: index('user_idx').on(t.userId),
    taskIdx: index('task_idx').on(t.taskId),
    userTaskIdx: index('user_task_idx').on(t.userId, t.taskId),
    ruleIdx: index('rule_idx').on(t.ruleId),
    topicIdx: index('topic_idx').on(t.topicId),
    graphIdx: index('graph_idx').on(t.graphId),
    graphNodeIdx: index('graph_node_idx').on(t.graphId, t.subTaskId),
    createdAtIdx: index('created_at_idx').on(t.createdAt),
}))
