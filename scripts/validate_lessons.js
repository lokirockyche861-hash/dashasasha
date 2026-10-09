import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetLessons = ['lesson11.json', 'lesson12.json', 'lesson13.json', 'lesson14.json'];
const LESSONS_DIR = path.join(__dirname, '../lessons');

function validateLesson(filename) {
    const filePath = path.join(LESSONS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`❌ ${filename} not found.`);
        return;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.log(`❌ ${filename} has invalid JSON: ${e.message}`);
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
        'FillTable', 'SelectList', 'FillText', 'DragAndDrop', 'DragTable'
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
        const interactivesRequiringInnerButtons = ['QuizSelect', 'QuizCheckbox', 'QuizSet', 'FillInTheBlank', 'FillTable', 'SelectList', 'FillText', 'DragAndDrop', 'DragTable'];
        if (interactivesRequiringInnerButtons.includes(node.type)) {
            if (node.button_text) errors.push(`${context}: 'button_text' should be placed inside 'content'`);
            if (node.button_next_text) errors.push(`${context}: 'button_next_text' should be placed inside 'content'`);
        }

        if (interactiveTypes.includes(node.type)) {
            if (node.skill_id === undefined) errors.push(`${context}: missing 'skill_id'`);
            if (node.taskVersion === undefined) warnings.push(`${context}: missing 'taskVersion'`);
            if (node.answer_type === undefined) errors.push(`${context}: missing 'answer_type'`);

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
        }
    });

    logResult(filename, errors, warnings);
}

function logResult(filename, errors, warnings) {
    if (errors.length === 0 && warnings.length === 0) {
        console.log(`✅ ${filename} passed validation.`);
    } else {
        console.log(`🛑 ${filename} validation issues:`);
        errors.forEach(e => console.log(`   [ERROR] ${e}`));
        warnings.forEach(w => console.log(`   [WARN]  ${w}`));
    }
}

targetLessons.forEach(validateLesson);
