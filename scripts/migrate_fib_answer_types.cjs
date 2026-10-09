const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('lessons/lesson*.json');
let changedItems = 0;

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let modified = false;

  const processNode = (node) => {
    if (node.type === 'FillInTheBlank' && node.content && node.content.tasks) {
      node.content.tasks.forEach(task => {
        const blanksCount = task.text ? (task.text.match(/___/g) || []).length : 0;
        
        let changedTask = false;
        
        // 1. Convert 'multiple' to 'single'
        if (task.answerType === 'multiple') {
            task.answerType = 'single';
            changedTask = true;
        }
        
        // 2. If it's a single blank but correctAnswers has > 1 string element (list of synonyms),
        // we wrap it in an array to match the new logic [[ "syn1", "syn2" ]]
        if (task.answerType === 'single' && blanksCount === 1 && task.correctAnswers && task.correctAnswers.length > 1) {
            // Check if it's already an array of arrays. If the first element is a string, then it needs wrapping.
            if (typeof task.correctAnswers[0] === 'string') {
               task.correctAnswers = [task.correctAnswers];
               changedTask = true;
            }
        }

        // 3. For multiple blanks, ensure the task.correctAnswers length matches blanksCount 
        // to conform to the new format (unless it's empty)
        if (task.answerType === 'single' && blanksCount > 1 && task.correctAnswers && task.correctAnswers.length > 0) {
            // Note: earlier I converted tasks with blanksCount > 1 and correctAnswers.length > 1 and answerType='single' 
            // to 'single-box'. But let's just make sure things are aligned.
        }
        
        if (changedTask) {
           modified = true;
           changedItems++;
        }
      });
    }
  };

  if (Array.isArray(data)) {
      data.forEach(processNode);
  } else if (data.nodes && Array.isArray(data.nodes)) {
      data.nodes.forEach(processNode);
  } else {
      for(const key in data) {
         if (Array.isArray(data[key])) {
             data[key].forEach(processNode);
         }
      }
  }

  if (modified) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    console.log(`Saved ${file}`);
  }
});
console.log(`Total tasks migrated: ${changedItems}`);
