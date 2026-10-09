import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetLessons = ['lesson11.json', 'lesson12.json', 'lesson13.json', 'lesson14.json'];
const LESSONS_DIR = path.join(__dirname, '../lessons');

function fixTopLevel(filename) {
    const filePath = path.join(LESSONS_DIR, filename);
    if (!fs.existsSync(filePath)) return;

    const raw = fs.readFileSync(filePath, 'utf-8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        return;
    }

    let modified = false;

    if (data.lesson_id === undefined) {
        data.lesson_id = filename.replace('.json', '');
        modified = true;
    }
    if (data.lesson_version === undefined) {
        data.lesson_version = "v.1.0";
        modified = true;
    }
    if (data.topicId === undefined) {
        data.topicId = "topic_default"; // Can be changed later if we know the topic
        modified = true;
    }

    // Also fix answer_types for known components
    const answerTypeMap = {
        'QuizSelect': 'select',
        'SelectList': 'select',
        'QuizCheckbox': 'multi-select',
        'QuizSet': 'select',
        'FillInTheBlank': 'input',
        'FillTable': 'input',
        'FillText': 'input',
        'DragAndDrop': 'match',
        'DragTable': 'match'
    };

    if (Array.isArray(data.content)) {
        data.content.forEach(node => {
            if (answerTypeMap[node.type] && node.answer_type === undefined) {
                node.answer_type = answerTypeMap[node.type];
                modified = true;
            }
        });
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`🛠️  Fixed top-level and answer_type for ${filename}.`);
    }
}

targetLessons.forEach(fixTopLevel);
