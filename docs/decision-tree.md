# Архитектура дерева решений (Decision Tree / Graph)

Практические уроки русского языка моделируются в виде алгоритма — графа принятия решений. Ученик проходит по веткам дерева, отвечая на вопросы-шаги, и вводит итоговое слово.

---

## 1. Структура файлов контента

Архитектура дерева решений разделена на два связанных файла в папке `lessons/`:
1. **`graph.json`** — структура самого дерева: узлы (вопросы и шаги), переходы по вариантам ответов и финальные результаты.
2. **`graph-task.json`** — набор практических заданий (слов), привязанных к конкретному графу. Каждое задание содержит эталонный путь прохождения (`correct_path`) и верный финальный ответ.

---

## 2. Спецификация `graph.json`

Описывает топологию графа:

```json
{
  "graphId": "graph_pol_v1",
  "title": "Правописание пол- и полу-",
  "layout": "spine",
  "start_node": "q1",
  "ruleId": "rule_pol",
  "topicId": "topic_morphemika",
  "nodes": [
    {
      "id": "q1",
      "type": "question",
      "answer_type": "select",
      "text": "Это приставка ПОЛУ-?",
      "skill_id": "pristavka",
      "options": [
        { "id": "q1_op_yes", "label": "Да", "next": "r_slitno_polu" },
        { "id": "q1_op_no", "label": "Нет", "next": "q2" }
      ]
    },
    {
      "id": "r_slitno_polu",
      "type": "result",
      "label": "слитно (полу-)",
      "text": "ПОЛУ- всегда пишется слитно."
    }
  ]
}
```

### Основные поля узла (`nodes`):
- `id`: уникальный ID узла в рамках графа.
- `type`: `"question"` (шаг с выбором) или `"result"` (конечный узел правила).
- `skill_id`: навык, проверяемый на данном шаге.
- `options`: список вариантов перехода с указанием целевого узла в `next`.

---

## 3. Спецификация `graph-task.json`

Описывает задание для ученика:

```json
{
  "id": "t1",
  "type": "graph",
  "graphId": "graph_pol_v1",
  "ruleId": "rule_pol",
  "topicId": "topic_morphemika",
  "taskVersion": "v.1.0",
  "answer_type": "input",
  "input_id": "t1_input",
  "content": {
    "word": "пол…яблока",
    "correct_answer": "пол-яблока",
    "correct_result": "r_defis",
    "correct_path": [
      { "id": "q1", "skill_id": "pristavka", "option_id": "q1_op_no" },
      { "id": "q2", "skill_id": null, "option_id": "q2_op_yes" }
    ]
  }
}
```

---

## 4. Особенности работы с БД и Аналитика (Payload)

В отличие от стандартных уроков, граф фиксирует действия пользователя в базе данных **двумя отдельными событиями**:

### 1. Шаг внутри дерева (`ActiveTree.vue`)
При клике на любую опцию внутри активного дерева решений отправляется попытка шага:
- `taskType`: `"DecisionTree"`
- `answerType`: `"select"`
- `taskId`: ID самого задания (`task.id`, например `"t1"`).
- `subTaskId`: ID узла-вопроса в графе (например `"q1"`).
- `selectedOptionId`: ID выбранной опции (`"q1_op_no"`).
- `isCorrect`: `true`, если шаг совпадает с элементом `correct_path` для данного узла.
- Метаданные: обогащается полями `graphId`, `topicId`, `ruleId`, `skillId`.

### 2. Ввод и проверка финального ответа (`DecisionTreeLesson.vue`)
Когда ученик доходит до узла с результатом и вводит слово в текстовое поле:
- `taskType`: `"DecisionTreeInput"`
- `answerType`: `"input"`
- `taskId`: ID задания (`"t1"`).
- `subTaskId`: ID инпута (поле `input_id` из задания, например `"t1_input"`).
- `answerText`: Текст, введенный учеником.
- `isCorrect`: `true`, если точное совпадение с `correct_answer`.
- `responseMs`: Время решения всей задачи (в миллисекундах) с момента её открытия.
