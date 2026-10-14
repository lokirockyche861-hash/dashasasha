import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LESSONS_DIR = path.join(__dirname, '../lessons');

const lessonFiles = fs.readdirSync(LESSONS_DIR)
    .filter(f => f.startsWith('lesson') && f.endsWith('.json') && !f.includes('stucture'))
    .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
    });

const targetLessons = process.argv[2] ? [process.argv[2]] : lessonFiles;
let totalErrors = 0;

function validateLesson(filename) {
    const filePath = path.join(LESSONS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`❌ ${filename} not found.`);
        totalErrors++;
        return;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.log(`❌ ${filename} has invalid JSON: ${e.message}`);
        totalErrors++;
        return;
    }

    const errors = [];
    const warnings = [];
    const requiredTopLevel = ['lesson_id', 'lesson_version', 'topicId', 'content', 'schema'];

    requiredTopLevel.forEach(key => {
        if (data[key] === undefined) {
            errors.push(`Missing top-level key: ${key}`);
        }
    });

    if (!Array.isArray(data.content)) {
        errors.push(`'content' must be an array`);
        return logResult(filename, errors, warnings);
    }

    const interactiveTypes = [
        'QuizSelect', 'QuizCheckbox', 'QuizSet', 'FillInTheBlank',
        'FillTable', 'SelectList', 'FillText', 'DragAndDrop', 'DragTable',
        'SelectText', 'ClickWord'
    ];

    data.content.forEach((node, index) => {
        const context = `Node #${index} (type: ${node.type || 'unknown'}, id: ${node.id || 'unknown'})`;

        if (!node.type) errors.push(`${context}: missing 'type'`);
        if (!node.id) errors.push(`${context}: missing 'id'`);
        if (!node.content) {
            if (node.type !== 'markdown' && node.type !== 'HtmlVideo' && node.type !== 'YoutubeVideo') {
                errors.push(`${context}: missing 'content' block`);
            }
        }

        // Check misplaced buttons
        const interactivesRequiringInnerButtons = [
            'QuizSelect', 'QuizCheckbox', 'QuizSet', 'FillInTheBlank',
            'FillTable', 'SelectList', 'FillText', 'DragAndDrop', 'DragTable',
            'SelectText', 'ClickWord'
        ];
        if (interactivesRequiringInnerButtons.includes(node.type)) {
            if (node.button_text) errors.push(`${context}: 'button_text' should be placed inside 'content'`);
            if (node.button_next_text) errors.push(`${context}: 'button_next_text' should be placed inside 'content'`);
        }

        if (interactiveTypes.includes(node.type)) {
            if (node.skill_id === undefined) errors.push(`${context}: missing 'skill_id'`);
            if (node.taskVersion === undefined) warnings.push(`${context}: missing 'taskVersion'`);
            if (node.answer_type === undefined) errors.push(`${context}: missing 'answer_type'`);
            if (node.blocked === undefined) errors.push(`${context}: missing 'blocked'`);

            // Specific logic validation
            if (node.type === 'QuizSelect') {
                if (!node.content.options || !Array.isArray(node.content.options)) {
                    errors.push(`${context}: missing 'options' array in content`);
                } else {
                    let correctCount = node.content.options.filter(o => o.correct === true).length;
                    if (correctCount !== 1) errors.push(`${context}: QuizSelect must have exactly 1 correct option, found ${correctCount}`);
                }
            }

            if (node.type === 'QuizCheckbox') {
                if (!node.content.options || !Array.isArray(node.content.options)) {
                    errors.push(`${context}: missing 'options' array in content`);
                }
            }

            if (node.type === 'DragAndDrop') {
                if (!node.content.groups || !Array.isArray(node.content.groups)) {
                    errors.push(`${context}: DragAndDrop missing 'groups'`);
                } else if (!node.content.tasks || !Array.isArray(node.content.tasks)) {
                    errors.push(`${context}: DragAndDrop missing 'tasks'`);
                } else {
                    const groupIds = node.content.groups.map(g => g.id);
                    node.content.tasks.forEach(t => {
                        if (!groupIds.includes(t.correct_group)) errors.push(`${context}: Task ${t.id} references unknown group '${t.correct_group}'`);
                    });
                }
            }

            if (node.type === 'FillInTheBlank') {
                if (!node.content.tasks || !Array.isArray(node.content.tasks)) {
                    errors.push(`${context}: FillInTheBlank missing 'tasks' array`);
                } else {
                    node.content.tasks.forEach(t => {
                        if (!t.correctAnswers || !Array.isArray(t.correctAnswers)) {
                            errors.push(`${context}: Task ${t.id} missing 'correctAnswers' array`);
                        }
                    });
                }
            }

            if (node.type === 'ClickWord') {
                if (!node.content.tasks || !Array.isArray(node.content.tasks)) {
                    errors.push(`${context}: ClickWord missing 'tasks' array`);
                } else {
                    node.content.tasks.forEach((t, ti) => {
                        if (!t.id) errors.push(`${context}: Task #${ti + 1} missing 'id'`);
                        if (typeof t.text !== 'string') {
                            errors.push(`${context}: Task ${t.id || ti + 1} missing or invalid 'text'`);
                        } else {
                            const match = t.text.match(/^(.*?)\{\{(.*?)\}\}(.*)$/s);
                            const targetWord = match ? match[2] : t.text;
                            if (!Array.isArray(t.correct_indices)) {
                                errors.push(`${context}: Task ${t.id} missing 'correct_indices' array`);
                            } else {
                                t.correct_indices.forEach(idx => {
                                    if (typeof idx !== 'number' || idx < 0 || idx >= targetWord.length) {
                                        errors.push(`${context}: Task ${t.id} has invalid correct_index ${idx} for target word "${targetWord}" (length: ${targetWord.length})`);
                                    }
                                });
                            }
                        }
                    });
                }
            }
        }
    });

    logResult(filename, errors, warnings);
}

function logResult(filename, errors, warnings) {
    if (errors.length === 0 && warnings.length === 0) {
        console.log(`✅ ${filename} passed validation.`);
    } else {
        totalErrors += errors.length;
        console.log(`🛑 ${filename} validation issues:`);
        errors.forEach(e => console.log(`   [ERROR] ${e}`));
        warnings.forEach(w => console.log(`   [WARN]  ${w}`));
    }
}

targetLessons.forEach(validateLesson);

if (totalErrors > 0) {
    console.log(`\n❌ Validation completed with ${totalErrors} error(s).`);
    process.exit(1);
} else {
    console.log(`\n✨ All lessons (${targetLessons.length}) passed validation successfully!`);
}
