# Спецификация JSON-схемы уроков и компонентов

Файлы уроков хранятся в директории `lessons/*.json`. Документ содержит описание корневой структуры уроков и подробные спецификации всех 11 поддерживаемых типов интерактивных заданий, включая JSON-шаблоны и правила записи в базу данных (Payload).

---

## 1. Корневая структура урока

Каждый файл урока формируется по следующей схеме:

```json
{
  "lesson_id": "lesson1",
  "lesson_version": "v.1.0",
  "topicId": "topic_morphemika",
  "content": [
    /* массив узлов контента */
  ],
  "schema": "v1"
}
```

### Общие особенности всех узлов контента:
- `type` (string): Тип компонента (`markdown`, `Table`, `QuizSelect` и т.д.).
- `id` (string): Уникальный ID узла, генерируется по формату: `l{lesson}-n{nodeIndex}-{typeAbbr}-{salt}` (например, `l1-n1-qsel-abcd`).
- `content` (object): Объект с данными задания, текстами и кнопками. В целях читаемости JSON этот блок всегда размещается перед глобальными метаданными.
- **Метаданные (на одном уровне с `content`):**
  - `taskVersion`: Версия задания (например, `"v.1.0"`).
  - `skill_id`: ID проверяемого навыка/компетенции.
  - `answer_type`: Тип аналитики для бэкенда (`select`, `input`, `match`, `multi-select`).
  - `blocked`: Флаг блокировки интерфейса (boolean, по умолчанию `false`).
- **Расположение кнопок:** Кнопки управления (`button_text`, `button_next_text`, `button_finish_text`) **всегда** должны находиться внутри объекта `content`.
- **Поддержка Markdown:** Большинство текстовых полей внутри `content` (`question`, `text`, условия `tasks`, тексты обратной связи `feedback`, `result_text`) поддерживают Markdown (`markdown-it`): `**жирный**`, `*курсив*`, а также теги изображений `<img src="/lessons/image.svg" class="lesson-image">`. Исключение — элементы `options` внутри выпадающего списка `SelectList`.

---

## 2. Интерактивные компоненты

### 1. `QuizSelect` (Одиночный выбор из выпадающего списка)

#### Шаблон JSON:
```json
{
  "type": "QuizSelect",
  "id": "l1-n1-qsel-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "select",
  "blocked": false,
  "content": {
    "question": "Вопрос с единичным выбором",
    "options": [
      { "id": "l1-n1-qsel-abcd-o1", "content": "Вариант 1", "correct": false, "feedback-selected": null, "feedback-not-selected": null },
      { "id": "l1-n1-qsel-abcd-o2", "content": "Вариант 2 (верный)", "correct": true, "feedback-selected": null, "feedback-not-selected": null }
    ],
    "button_text": "Проверить",
    "result_text": "Пояснение к ответу."
  }
}
```

#### Правила записи в БД (Payload):
- `taskType`: `"QuizSelect"`
- `answerType`: `"select"`
- `subTaskId`: ID конкретного списка (`task.id`).
- `selectedOptionId`: ID выбранной опции (`option.id`).
- `isCorrect`: `true`, если выбрана опция с `correct === true`.
- **Счетчики:** `correctOptions` (1), `incorrectOptions` (кол-во опций - 1).
- **Ответ пользователя:** `selectedCorrectOptions` (1 или 0), `selectedIncorrectOptions` (0 или 1).

---

### 2. `QuizCheckbox` (Множественный выбор)

#### Шаблон JSON:
```json
{
  "type": "QuizCheckbox",
  "id": "l1-n2-qchk-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "multi-select",
  "blocked": false,
  "content": {
    "question": "Вопрос с множественным выбором",
    "options": [
      { "id": "l1-n2-qchk-abcd-o1", "content": "Вариант 1 (верный)", "correct": true, "feedback-selected": null, "feedback-not-selected": null },
      { "id": "l1-n2-qchk-abcd-o2", "content": "Вариант 2", "correct": false, "feedback-selected": null, "feedback-not-selected": null }
    ],
    "button_text": "Проверить",
    "result_text": "Пояснение к ответам."
  }
}
```

#### Особенности и Payload:
- Запись производится на уровне всего задания (без `subTasks`).
- `taskType`: `"QuizCheckbox"`
- `answerType`: `"multi-select"`
- `subTaskId`: `null`
- `selectedOptionIds`: Массив ID выбранных опций (`string[]`).
- `isCorrect`: `true`, если выбраны **все** правильные и **ни одной** неправильной опции.
- **Счетчики:** `correctOptions` (число верных опций), `incorrectOptions` (число неверных).
- **Ответ пользователя:** `selectedCorrectOptions` (совпадения правильных), `selectedIncorrectOptions` (выбранные неправильные).

---

### 3. `QuizSet` (Набор мини-заданий / радио-кнопок)

#### Шаблон JSON:
```json
{
  "type": "QuizSet",
  "id": "l1-n3-qset-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "select",
  "blocked": false,
  "content": {
    "question": "Серия мини-заданий",
    "options": [
      { "id": "l1-n3-qset-abcd-opt1", "content": "Вариант A" },
      { "id": "l1-n3-qset-abcd-opt2", "content": "Вариант B" }
    ],
    "tasks": [
      {
        "id": "l1-n3-qset-abcd-t1",
        "content": "Текст задания 1",
        "correct_option": "l1-n3-qset-abcd-opt1",
        "feedback-correct": "Верно!",
        "feedback-incorrect": "Неверно!"
      }
    ],
    "button_text": "Проверить",
    "button_next_text": "Следующее задание",
    "result_text": "Общий фидбек."
  }
}
```

#### Payload:
- `taskType`: `"QuizSet"`
- `answerType`: `"select"`
- `subTaskId`: ID вопроса (`task.id`).
- `selectedOptionId`: ID выбранного ответа.
- `isCorrect`: `true`, если `selectedOptionId` равен `task.correct_option`.
- **Счетчики:** `correctOptions` (1), `incorrectOptions` (кол-во опций - 1).

---

### 4. `FillInTheBlank` (Ввод текста в пропуски)

#### Шаблон JSON:
```json
{
  "type": "FillInTheBlank",
  "id": "l1-n4-fibl-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "input",
  "blocked": false,
  "content": {
    "question": "Заполните пропуски",
    "tasks": [
      {
        "id": "l1-n4-fibl-abcd-t1",
        "text": "Я сижу за стол___",
        "correctAnswers": ["ом"],
        "answerType": "single",
        "minWidth": null,
        "feedback-correct": null,
        "feedback-incorrect": null
      }
    ],
    "button_text": "Проверить",
    "result_text": "Молодцы!"
  }
}
```

#### Особенности и Payload:
- Поле `answerType` управляет отображением инпута: `single` (стандартное поле), `single-box` (увеличенное поле).
- В `correctAnswers` поддерживаются массивы синонимов (в формате админки `Слово 1, [син1 | син2], Слово 3`, в JSON: `["Слово 1", ["син1", "син2"], "Слово 3"]`).
- `taskType`: `"FillInTheBlank"`
- `answerType`: `"input"`
- `subTaskId`: ID пропуска (`task.id`).
- `answerText`: Текст ответа (при нескольких полях склеиваются через `; `).
- `isCorrect`: `true`, если введенный текст совпадает (без учета регистра и пробелов) с любым из `correctAnswers`.

---

### 5. `FillTable` (Заполнение таблицы)

#### Шаблон JSON:
```json
{
  "type": "FillTable",
  "id": "l1-n5-filt-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "input",
  "blocked": false,
  "content": {
    "question": "Задача: заполните окончания",
    "table": {
      "headers": ["Словосочетание", "Окончание", "Результат"],
      "rows": [
        {
          "groupId": "group1",
          "task": "",
          "id": "l1-n5-filt-abcd-r1",
          "input": {
            "correctAnswers": [""],
            "placeholder": "впишите ответ",
            "feedback-correct": null,
            "feedback-incorrect": null
          }
        }
      ]
    },
    "button_text": "Проверить",
    "button_next_text": "Далее",
    "button_finish_text": "Завершить",
    "result_text": ""
  }
}
```

#### Payload:
- Проверка производится по строкам (группам).
- `taskType`: `"FillTable"`
- `answerType`: `"input"`
- `subTaskId`: ID строки таблицы (`row.id`).
- `answerText`: Введенный текст.
- `isCorrect`: `true`, если все ячейки строки заполнены верно.

---

### 6. `SelectList` (Встроенные селекты в тексте)

#### Шаблон JSON:
```json
{
  "type": "SelectList",
  "id": "l1-n6-sell-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "select",
  "blocked": false,
  "content": {
    "selected": false,
    "question": "Выберите правильный вариант для каждого задания",
    "options": [
      { "id": "l1-n6-sell-abcd-opt1", "content": "Вариант A" },
      { "id": "l1-n6-sell-abcd-opt2", "content": "Вариант B" }
    ],
    "tasks": [
      {
        "id": "l1-n6-sell-abcd-t1",
        "content": "Задание 1",
        "correct_option": "l1-n6-sell-abcd-opt1",
        "feedback-correct": null,
        "feedback-incorrect": null
      }
    ],
    "button_text": "Проверить",
    "result_text": ""
  }
}
```

#### Payload:
- `taskType`: `"SelectList"`
- `answerType`: `"select"`
- `subTaskId`: ID списка (`task.id`).
- `selectedOptionId`: ID выбранной опции.
- `isCorrect`: `true`, если совпадает с `task.correct_option`.

---

### 7. `FillText` (Ввод в тексте по маркерам `{{taskId}}`)

#### Шаблон JSON:
```json
{
  "type": "FillText",
  "id": "l1-n7-ftxt-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "input",
  "blocked": false,
  "content": {
    "text": "Текст с пропусками, вставьте потом {{l1-n7-ftxt-abcd-t1}} ...",
    "tasks": [
      {
        "id": "l1-n7-ftxt-abcd-t1",
        "text": "подсказка внутри инпута",
        "correctAnswer": "",
        "minWidth": null,
        "feedback-correct": null,
        "feedback-incorrect": null
      }
    ],
    "button_text": "Проверить",
    "result_text": ""
  }
}
```

#### Payload:
- Маркеры вставляются в виде `{{taskId}}` (двойные фигурные скобки предотвращают конфликт с транскрипциями `[с]`).
- `taskType`: `"FillText"`
- `answerType`: `"input"`
- `subTaskId`: ID маркера (`task.id`).
- `answerText`: Введенный текст.
- `isCorrect`: `true`, если введенный текст совпадает с `task.correctAnswer` (без учета регистра и пробелов).

---

### 8. `SelectText` (Инлайн-селекты по маркерам `{{taskId}}`)

#### Шаблон JSON:
```json
{
  "type": "SelectText",
  "id": "l12-n41-stxt-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "select",
  "blocked": false,
  "content": {
    "text": "Текст с пропусками, выберите {{t1}} ответ.",
    "tasks": [
      {
        "id": "t1",
        "correct_option": "opt1",
        "options": [
          { "id": "opt1", "content": "правильный" },
          { "id": "opt2", "content": "неправильный" }
        ],
        "feedback-incorrect": "Подсказка при клике на ℹ️"
      }
    ],
    "button_text": "Проверить",
    "result_text": ""
  }
}
```

#### Payload:
- Ширина селекта автоматически подстраивается под самый длинный `option`.
- `taskType`: `"SelectText"`
- `answerType`: `"select"`
- `subTaskId`: ID маркера-селекта (`task.id`).
- `selectedOptionId`: ID выбранного `option`.
- `isCorrect`: `true`, если выбранный `option` равен `task.correct_option`.

---

### 9. `ClickWord` (Интерактивный посимвольный выбор)

#### Шаблон JSON:
```json
{
  "type": "ClickWord",
  "id": "l4-n2-clkw-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "multi-select",
  "blocked": false,
  "content": {
    "question": "Найди в словах общую часть (корень)",
    "tasks": [
      {
        "id": "t1",
        "text": "зима",
        "correct_indices": [0, 1, 2],
        "feedback-incorrect": "Корень в этом слове — зим"
      }
    ],
    "button_text": "Проверить",
    "result_text": ""
  }
}
```

#### Payload:
- `taskType`: `"ClickWord"`
- `answerType`: `"multi-select"`
- `subTaskId`: ID слова-строки (`task.id`).
- `selectedOptionIds`: Массив строковых индексов (например, `["0", "1", "2"]`).
- `isCorrect`: `true`, если массив индексов строго равен `task.correct_indices`.
- **Счетчики:** `correctOptions` (длина массива `correct_indices`), `incorrectOptions` (кол-во символов без пробелов минус правильные).

---

### 10. `DragAndDrop` (Перетаскивание карточек по зонам)

#### Шаблон JSON:
```json
{
  "type": "DragAndDrop",
  "id": "l1-n8-drop-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "match",
  "blocked": false,
  "content": {
    "question": "Перетащите карточки в группы",
    "layout": "columns",
    "show_feedback": false,
    "family": false,
    "groups": [
      { "id": "l1-n8-drop-abcd-g1", "content": "Группа 1" },
      { "id": "l1-n8-drop-abcd-g2", "content": "Группа 2" }
    ],
    "tasks": [
      {
        "id": "l1-n8-drop-abcd-t1",
        "content": "Карточка 1",
        "correct_group": "l1-n8-drop-abcd-g1",
        "feedback-correct": null,
        "feedback-incorrect": null
      }
    ],
    "button_text": "Проверить",
    "result_text": ""
  }
}
```

#### Особенности и Payload:
- `layout`: `"columns"` (колонки), `"rows"` (строки) или `"matrix"` (матрица с параметром `matrix_cols`).
- `family: true`: режим без названий корзин (группировка карточек между собой).
- `show_feedback: true`: отображение таблицы ошибок с полями `feedback-correct` и `feedback-incorrect`.
- `taskType`: `"DragAndDrop"`
- `answerType`: `"match"`
- `subTaskId`: `null`
- `selectedOptionIds`: Массив строк вида `"taskId:groupId"` (например, `["task1:groupA", "task2:groupB"]`).
- `isCorrect`: `true`, если все карточки разложены верно.
- **Счетчики:** `correctOptions` (общее кол-во карточек).
- **Ответ пользователя:** `selectedCorrectOptions` (верно распределенные), `selectedIncorrectOptions` (неверные).

---

### 11. `DragTable` (Сопоставление элементов в табличной сетке)

#### Шаблон JSON:
```json
{
  "type": "DragTable",
  "id": "l1-n9-dtab-abcd",
  "taskVersion": "v.1.0",
  "skill_id": "",
  "answer_type": "match",
  "blocked": false,
  "content": {
    "question": "Сопоставьте элементы по таблице",
    "row_header": "строки",
    "rows": [{ "id": "l1-n9-dtab-abcd-row1", "content": "Строка 1" }],
    "columns": [{ "id": "l1-n9-dtab-abcd-col1", "content": "Колонка 1" }],
    "groups": [],
    "tasks": [
      { "id": "l1-n9-dtab-abcd-t1", "content": "Карточка 1", "correct_group": "" }
    ],
    "button_text": "Проверить",
    "result_text": ""
  }
}
```

#### Payload:
- `taskType`: `"DragTable"`
- `answerType`: `"match"`
- `subTaskId`: `null`
- `selectedOptionIds`: Массив строк `"taskId:groupId"`.
- `isCorrect`: `true`, если все карточки находятся в верных `groupId`.
- **Счетчики:** `correctOptions` (общее кол-во карточек).
- **Ответ пользователя:** `selectedCorrectOptions`, `selectedIncorrectOptions`.
