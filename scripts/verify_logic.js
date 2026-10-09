import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetLessons = ['lesson11.json', 'lesson12.json', 'lesson13.json', 'lesson14.json'];
const LESSONS_DIR = path.join(__dirname, '../lessons');

function verifyLogic(filename) {
    const filePath = path.join(LESSONS_DIR, filename);
    if (!fs.existsSync(filePath)) return;

    let data;
    try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) { return; }

    let issues = [];

    (data.content || []).forEach((node, idx) => {
        const ctx = `Node #${idx} (${node.type})`;
        if (!node.content || typeof node.content !== 'object') return;
        const c = node.content;

        if (node.type === 'QuizSelect') {
            const corrects = (c.options || []).filter(o => o.correct);
            if (corrects.length !== 1) issues.push(`${ctx}: QuizSelect has ${corrects.length} correct options (needs exactly 1)`);
        }
        if (node.type === 'QuizCheckbox') {
            const corrects = (c.options || []).filter(o => o.correct);
            if (corrects.length === 0) issues.push(`${ctx}: QuizCheckbox has 0 correct options!`);
        }
        if (node.type === 'DragAndDrop') {
            const groupIds = (c.groups || []).map(g => g.id);
            (c.tasks || []).forEach(t => {
                if (!groupIds.includes(t.correct_group)) issues.push(`${ctx}: Task ${t.id} points to non-existent group ${t.correct_group}`);
            });
        }
        if (node.type === 'FillInTheBlank') {
            (c.tasks || []).forEach(t => {
                if (!t.correctAnswers || t.correctAnswers.length === 0) issues.push(`${ctx}: Task ${t.id} has no correctAnswers`);
            });
        }
    });

    if (issues.length > 0) {
        console.log(`❌ ${filename} Logical Issues:`);
        issues.forEach(i => console.log(`  - ${i}`));
    } else {
        console.log(`✅ ${filename} logical integrity verified.`);
    }
}

targetLessons.forEach(verifyLogic);
