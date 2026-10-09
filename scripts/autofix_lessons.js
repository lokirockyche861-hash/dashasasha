import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetLessons = ['lesson11.json', 'lesson12.json', 'lesson13.json', 'lesson14.json'];
const LESSONS_DIR = path.join(__dirname, '../lessons');

function generateShortId(type) {
    const hash = crypto.randomBytes(2).toString('hex');
    const abbr = type.substring(0, 4).toLowerCase();
    return `auto-${abbr}-${hash}`;
}

function fixLesson(filename) {
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
        console.log(`❌ ${filename} has invalid JSON.`);
        return;
    }

    let modified = false;

    const interactiveTypes = [
        'QuizSelect', 'QuizCheckbox', 'QuizSet', 'FillInTheBlank',
        'FillTable', 'SelectList', 'FillText', 'DragAndDrop', 'DragTable'
    ];

    if (Array.isArray(data.content)) {
        data.content.forEach((node, index) => {
            // 1. Missing ids for markdown and others
            if (!node.id) {
                node.id = generateShortId(node.type || 'mkdn');
                modified = true;
            }

            // 2. Fix misplaced buttons (move them INSIDE content)
            const interactivesRequiringInnerButtons = ['QuizSelect', 'QuizCheckbox', 'QuizSet', 'FillInTheBlank', 'FillTable', 'SelectList', 'FillText', 'DragAndDrop', 'DragTable'];
            if (interactivesRequiringInnerButtons.includes(node.type) && node.content && typeof node.content === 'object') {
                if (node.button_text) {
                    node.content.button_text = node.button_text;
                    delete node.button_text;
                    modified = true;
                }
                if (node.button_next_text) {
                    node.content.button_next_text = node.button_next_text;
                    delete node.button_next_text;
                    modified = true;
                }
                if (node.button_finish_text) {
                    node.content.button_finish_text = node.button_finish_text;
                    delete node.button_finish_text;
                    modified = true;
                }
            }

            // 3. Fix missing skill_id and taskVersion for interactive
            if (interactiveTypes.includes(node.type)) {
                if (node.skill_id === undefined) {
                    node.skill_id = ""; // Default empty string per schema logic
                    modified = true;
                }
                if (node.taskVersion === undefined) {
                    node.taskVersion = "v.1.0";
                    modified = true;
                }
            }
        });
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`🛠️  Fixed ${filename}.`);
    } else {
        console.log(`✨ ${filename} required no structural auto-fixes.`);
    }
}

targetLessons.forEach(fixLesson);
