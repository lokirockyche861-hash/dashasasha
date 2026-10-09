import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetLessons = ['lesson1.json', 'lesson2.json', 'lesson3.json', 'lesson4.json', 'lesson5.json'];
const LESSONS_DIR = path.join(__dirname, '../lessons');

function fixMistake(filename) {
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

    if (Array.isArray(data.content)) {
        data.content.forEach((node) => {
            // Revert the misplaced buttons: moved them back INSIDE content
            const hasButtonsToMove = node.button_text || node.button_next_text || node.button_finish_text || node.button_result_text;

            if (hasButtonsToMove && node.type !== 'markdown' && node.type !== 'Table' && typeof node.content === 'object') {
                if (node.button_text) {
                    node.content.button_text = node.button_text;
                    delete node.button_text;
                }
                if (node.button_next_text) {
                    node.content.button_next_text = node.button_next_text;
                    delete node.button_next_text;
                }
                if (node.button_finish_text) {
                    node.content.button_finish_text = node.button_finish_text;
                    delete node.button_finish_text;
                }
                if (node.button_result_text) {
                    node.content.button_result_text = node.button_result_text;
                    delete node.button_result_text;
                }
                modified = true;
            }
        });
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`🛠️  Fixed backwards button placing in ${filename}.`);
    }
}

targetLessons.forEach(fixMistake);
