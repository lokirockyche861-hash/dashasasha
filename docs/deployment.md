# 🧭 Как устроен и работает ваш проект (Памятка простыми словами)

Эта памятка создана для того, чтобы в любой момент освежить в памяти, как ваш интерактивный учебник работает в интернете, из каких сервисов он состоит и как они «общаются» между собой.

---

## 🎭 Главная аналогия: Представьте ресторан или интерактивный театр

Чтобы понять устройство проекта без технических терминов, представьте работу интерактивного образовательного центра:

1. **Ваш компьютер (Мастерская автора)** — здесь вы придумываете сценарии уроков, создаете новые задания и проверяете, как они выглядят.
2. **GitHub (Сейф с чертежами и рецептами)** — место в облаке, где бережно хранятся оригинальные чертежи и инструкции вашего проекта.
3. **Netlify (Главный зал, администратор и сцена)** — сервис, который берет чертежи из GitHub, мгновенно строит красивое здание сайта и открывает двери ученикам по ссылке `dashasasha.netlify.app`.
4. **Supabase (Электронный архив и журнал успеваемости)** — неприступное хранилище (база данных), где записывается каждый шаг ученика: кто зашел, на какой вопрос ответил, верно или с ошибкой.

---

## 🧩 4 ключевых элемента системы

### 1. 💻 Ваш компьютер (Локальная разработка)
* **Что делает:** Здесь находятся все исходные файлы проекта: тексты уроков, правила, кнопки, логика деревьев решений.
* **Почему это важно:** Всё, что вы создаете или редактируете, сначала появляется здесь. Пользователи интернета пока не видят эти изменения, пока вы не решите отправить их в облако.

### 2. 🐙 GitHub (Хранилище версий кода)
* **Адрес репозитория:** [github.com/lokirockyche861-hash/dashasasha](https://github.com/lokirockyche861-hash/dashasasha)
* **Что делает:** Это облачная «флешка» для программистов с умной памятью (Git). Она хранит историю проекта и точный снимок всех файлов в ветке `main`.
* **Важное правило:** В GitHub отправляются только исходные файлы проекта. Там **нет** паролей, секретных ключей и личных данных учеников.

### 3. ⚡ Netlify (Хостинг и «мозг» сайта)
* **Адрес сайта:** [dashasasha.netlify.app](https://dashasasha.netlify.app/)
* **Что делает:** 
  1. **Показывает сайт (Фронтенд):** Когда ученик открывает ссылку, Netlify быстро отдает ему страницы уроков, картинки и интерактивные механики.
  2. **Выполняет невидимую работу (Бэкенд):** Когда ученик нажимает кнопку «Проверить», Netlify принимает ответ, проверяет его и передает дальше в базу данных.
  3. **Следит за GitHub:** Netlify постоянно «подсматривает» за вашим репозиторием на GitHub. Как только там появляется обновление, Netlify автоматически пересобирает сайт за 1–2 минуты.

### 4. 🗄️ Supabase (Облачная база данных PostgreSQL)
* **Панель управления:** [supabase.com](https://supabase.com)
* **Что делает:** Это надежная база данных в европейском дата-центре. В ней создана таблица `attempts` (попытки).
* **Что сохраняется:**
  * Уникальный номер ученика (`userId`).
  * Номер урока и идентификатор задания (`lessonId`, `taskId`).
  * Текст ответа или выбранные варианты (`answerText`, `selectedOptionId`).
  * Правильно или нет (`isCorrect`).
  * Набранный балл и точное время ответа (`createdAt`).

---

## 🔄 Как всё работает вместе в реальной жизни

```mermaid
sequenceDiagram
    autonumber
    actor Ученик as 🧑‍🎓 Ученик (Браузер)
    participant Netlify as ⚡ Netlify (Сайт и сервер)
    participant Supabase as 🗄️ Supabase (База данных)

    Ученик->>Netlify: Открывает dashasasha.netlify.app/lesson/lesson1
    Netlify-->>Ученик: Отдает интерактивный урок с заданиями
    
    Note over Ученик: Ученик выбирает ответ и нажимает «Проверить»
    
    Ученик->>Netlify: Отправляет результат решения (POST /api/attempts)
    Netlify->>Supabase: Безопасно записывает попытку в таблицу attempts
    Supabase-->>Netlify: Подтверждает: «Запись успешно сохранена»
    Netlify-->>Ученик: Показывает фидбек: «Верно! Мороженое / Отличная работа!»
```

1. Ученик переходит по ссылке `dashasasha.netlify.app`.
2. **Netlify** загружает интерфейс урока.
3. Ученик проходит шаг интерактивного задания и нажимает кнопку проверки.
4. Программа на **Netlify** берет ответ и связывается с **Supabase** по зашифрованному каналу.
5. **Supabase** фиксирует попытку в таблице `attempts`.
6. Вы в любой момент можете открыть панель Supabase (вкладку **Table Editor**) или экспортировать результаты в файл через защищенный адрес админки.

---

## 🔐 Безопасность: почему пароли не лежат в коде?

* **Секреты хранятся в Netlify:** Строка подключения к базе данных (`DATABASE_URL`) и административный пароль (`ADMIN_TOKEN`) находятся **только** в закрытых настройках Netlify (*Site configuration → Environment variables*).
* **Файл `.gitignore`:** Это специальный список-фильтр. Он следит за тем, чтобы файлы с паролями (например, `.env`) и служебные файлы никогда случайно не попали на GitHub.
* Таким образом, даже если ваш репозиторий на GitHub увидят посторонние, никто не сможет получить доступ к вашей базе данных в Supabase.

---

## 🚀 Пошаговая инструкция: Как публиковать изменения на сайте

Когда вы или ИИ-помощник создали новый урок, исправили текст или добавили новую интерактивную механику, изменения нужно доставить в интернет. 

Благодаря связке **GitHub + Netlify**, вам не нужно вручную загружать файлы на сервер — всё происходит автоматически через систему версий.

---

### 🟢 Сценарий 1: Стандартный (новый урок, исправление текста или заданий)

Это самый частый сценарий. Например, вы отредактировали файл в папке `lessons/` или исправили опечатку.

#### Шаг 1. Проверьте результат на своем компьютере
Перед публикацией в интернет всегда полезно посмотреть, как урок выглядит локально:
1. В терминале запустите локальный сервер:
   ```bash
   npm run dev
   ```
2. Откройте в браузере: `http://localhost:3000`
3. Убедитесь, что новый урок открывается, кнопки нажимаются, а текст выглядит аккуратно.
4. *(Опционально)* Можно запустить проверку структуры уроков:
   ```bash
   node scripts/validate_lessons.js
   ```

#### Шаг 2. Сохраните и отправьте изменения в облако (всего 3 команды)
Откройте терминал в папке проекта и выполните по очереди 3 простые команды:

1. **Подготовить все измененные файлы:**
   ```bash
   git add .
   ```
   *(Точка означает «взять все файлы, которые изменились или добавились»).*

2. **Запечатать изменения в «пакет» с понятным описанием:**
   ```bash
   git commit -m "Добавил Урок 16 и исправил опечатки в Уроке 1"
   ```
   *(Текст в кавычках пишите любой понятный для вас — что именно вы изменили).*

3. **Отправить пакет на GitHub:**
   ```bash
   git push origin main
   ```

#### Шаг 3. Что происходит дальше (магия автоматизации)
Как только сработала команда `git push`:
1. **GitHub** получает ваши новые файлы.
2. **Netlify** тут же «видит» обновление на GitHub и автоматически запускает сборку сайта.
3. Через **1–2 минуты** сайт в интернете сам обновится.
4. Откройте **[dashasasha.netlify.app](https://dashasasha.netlify.app/)** и проверьте изменения!

> 💡 **Лайфхак:** Все три команды можно выполнить одной строкой:
> ```bash
> git add . && git commit -m "Обновление уроков" && git push origin main
> ```

---

### 🟡 Сценарий 2: Добавлена новая механика (новый Vue-компонент)

Если вы или разработчик создали совершенно новый тип задания (например, новый компонент в папке `components/`):

1. **Проверьте сборку перед отправкой:**
   Новый программный код может содержать синтаксическую ошибку. Чтобы Netlify не упал при сборке, запустите тестовую проверку у себя:
   ```bash
   npm run build
   ```
   Если в конце написано `✨ Build complete!`, значит всё собралось без ошибок.
2. **Отправьте в Git:**
   ```bash
   git add . && git commit -m "Добавлена новая механика задания" && git push origin main
   ```
3. Netlify автоматически обновит живой сайт.

---

### 🔴 Сценарий 3: Изменилась структура базы данных (очень редко)

Этот сценарий нужен **только** тогда, когда программист добавил новую колонку для аналитики в файл `server/db/schema.ts` (например, решили записывать дополнительный параметр):

1. **Примените изменения к рабочей базе Supabase:**
   *(Команда за 5 секунд добавит новые колонки в таблицу Supabase).*
2. **Отправьте обновленный код на GitHub:**
   ```bash
   git add . && git commit -m "Обновление схемы базы данных" && git push origin main
   ```

---

### ❓ Что делать, если изменения не видны на сайте?

1. **Жестко обновите страницу в браузере (сброс кэша):**
   Браузер часто сохраняет старые файлы в памяти. Нажмите:
   * На Mac: `Cmd + Shift + R`
   * На Windows: `Ctrl + F5`
2. **Проверьте статус деплоя в Netlify:**
   * Зайдите на [app.netlify.com](https://app.netlify.com) во вкладку **Deploys**.
   * Если верхний деплой зеленый (**Published**) — сайт обновлен.
   * Если статус желтый (**Building**) — подождите еще 30–60 секунд.
   * Если статус красный (**Failed**) — нажмите на него, там будет написано, в каком файле допущена ошибка.

---
---

# 🛠️ Техническое описание архитектуры проекта (для разработчика)

> Данный раздел предназначен для инженера-разработчика, принимающего или развивающего проект. Здесь описан стек, архитектурные решения, структура базы данных, API-контракты и процесс сборки/деплоя.

---

## 1. Стек технологий и инфраструктура

| Компонент | Технология / Сервис | Версия / Конфигурация | Примечание |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `>= 20.x` | ESM (`"type": "module"`) |
| **Framework** | Nuxt | `^4.4.8` | Vue 3.5, TypeScript 5, Vite 7/8 |
| **Server Engine** | Nitro | Встроенный в Nuxt | Пресет: `nitro: { preset: 'netlify' }` |
| **Database** | PostgreSQL | `15+` (Supabase) | Развернут в регионе EU (Frankfurt) |
| **Connection Pooling** | Supavisor / PgBouncer | Режим **Transaction**, порт `6543` | Для Serverless AWS Lambda |
| **ORM & Driver** | Drizzle ORM + `postgres.js` | `drizzle-orm ^0.45`, `postgres ^3.4` | Опция `{ prepare: false }` |
| **Hosting & CI/CD** | Netlify | Бесплатный тариф | Edge CDN + Serverless Functions |
| **VCS** | Git + GitHub | Ветка `main` | Репозиторий: `lokirockyche861-hash/dashasasha` |

---

## 2. Архитектурная модель приложения

Приложение представляет собой гибридную SSR/SPA платформу для интерактивного адаптивного обучения.

```mermaid
graph TD
    User["🧑‍💻 Браузер пользователя"] -->|"HTTPS / CDN"| NetlifyEdge["Netlify Edge (CDN: dist/)"]
    User -->|"API Requests (Cookies: uid)"| Serverless["Netlify Functions (Nitro Server)"]
    
    subgraph "Nitro Server Layer"
        UserMiddleware["server/middleware/user.ts (UID Cookie)"]
        AttemptsAPI["/api/attempts (POST)"]
        ProgressAPI["/api/progress (GET)"]
        AdminAPI["/api/admin/export/attempts (GET)"]
        DrizzleClient["server/db/client.ts (postgres.js)"]
    end

    Serverless --> UserMiddleware
    UserMiddleware --> AttemptsAPI
    UserMiddleware --> ProgressAPI
    UserMiddleware --> AdminAPI
    
    AttemptsAPI --> DrizzleClient
    ProgressAPI --> DrizzleClient
    AdminAPI --> DrizzleClient
    
    DrizzleClient -->|"Port 6543 (Transaction Pooler)"| Supabase[("Supabase PostgreSQL (Таблица attempts)")]
```

### 2.1 Идентификация пользователей и сессии
В проекте реализован бесшовный анонимный онбординг без необходимости регистрации:
* В [`server/middleware/user.ts`](file:///Users/starkoff/Documents/tests/new-render/server/middleware/user.ts) каждый входящий запрос проверяется на наличие cookie `uid`.
* Если cookie отсутствует, сервер генерирует новый `UUID v4` и выставляет его в ответе с флагами `HttpOnly`, `Path=/`, `Max-Age: 1 год`.
* Все результаты решения привязываются к этому `userId`.

### 2.2 Модели уроков
Учебный контент разделен на две парадигмы:
1. **Теоретические / линейные уроки (`lessons/lesson[N].json`)**:
   * Лонгрид с вкраплениями интерактивных компонентов:
     * `QuizSelect`, `QuizCheckbox`, `QuizSet` — тестовые механики.
     * `ClickWord`, `SelectList`, `SelectText` — механики выделения и синтаксического разбора.
     * `DragAndDrop`, `DragTable`, `FillTable`, `FillText`, `FillInTheBlank` — сопоставление, таблицы и ввод пропусков.
     * `Markdown` — поддержка форматированного текста через `markdown-it`.
2. **Практические / графовые уроки (Деревья решений)**:
   * Реализованы в [`components/decision-tree/`](file:///Users/starkoff/Documents/tests/new-render/components/decision-tree/) (`DecisionTreeLesson.vue`, `ActiveTree.vue`, `ReferenceTree.vue`).
   * Построены на графовых структурах (`lessons/graph.json`, `lessons/graph-task.json`), где каждый шаг — узел принятия решений с ветвлением алгоритма.
   * Валидация переходов между узлами графа выполняется на бэкенде через [`server/utils/graphRegistry.ts`](file:///Users/starkoff/Documents/tests/new-render/server/utils/graphRegistry.ts).

### 2.3 Управление состоянием (State Management)
* Композабл [`composables/useLessonProgress.ts`](file:///Users/starkoff/Documents/tests/new-render/composables/useLessonProgress.ts) управляет локальным состоянием решения задач.
* При входе на страницу урока запрашивается актуальный прогресс (`/api/progress?lessonId=...`), восстанавливая ранее введенные ответы и статус прохождения.
* Модуль [`utils/AnalyticsService.js`](file:///Users/starkoff/Documents/tests/new-render/utils/AnalyticsService.js) инкапсулирует сбор телеметрии перед отправкой на бэкенд.

---

## 3. Спецификация Backend API

Серверная часть построена на встроенном в Nuxt движке **Nitro** ([`server/api/`](file:///Users/starkoff/Documents/tests/new-render/server/api/)):

### `GET /api/health`
* **Назначение:** Проверка доступности серверных функций (Liveness probe).
* **Ответ:** `200 OK` `{"status":"ok"}`.

### `GET /api/progress` (или `GET /api/progress/:lessonId`)
* **Назначение:** Получение сохраненного прогресса пользователя по конкретному уроку.
* **Авторизация:** Требуется cookie `uid`.
* **Параметры query:** `lessonId` (строка, например `lesson1`).
* **Логика SQL:** Использует PostgreSQL `DISTINCT ON (task_id)` с сортировкой `ORDER BY task_id, created_at DESC`, чтобы вернуть ровно одну самую свежую попытку для каждого задания.
* **Ответ:**
  ```json
  {
    "ok": true,
    "progress": {
      "task_1": {
        "taskId": "task_1",
        "isCorrect": true,
        "score": 1,
        "answerText": "ответ",
        "selectedOptionId": "opt_1",
        "taskAttempt": 1
      }
    }
  }
  ```

### `POST /api/attempts`
* **Назначение:** Фиксация попытки прохождения задания учеником.
* **Тело запроса (JSON):**
  * `topicId` *(string, обязательное)*
  * `lessonId` *(string, обязательное)*
  * `taskId` *(string, обязательное)*
  * `taskType` *(string, обязательное)*
  * `answerType` *(string, обязательное: 'input', 'select', 'match' и т.д.)*
  * `userAnswerIsCorrect` *(boolean, обязательное)*
  * `userScore` *(number, опционально)*
  * `answerText` *(string, опционально)*
  * `selectedOptionId` / `selectedOptionIds` *(опционально)*
  * `graphId` / `subTaskId` *(опционально, для графовых деревьев решений)*
* **Логика обработки:**
  1. Проверка обязательных полей.
  2. Валидация графа через `validateGraphNode` (если передан `graphId`).
  3. Определение номера попытки (`taskAttempt` инкрементируется через поиск предыдущих попыток пользователя).
  4. Асинхронная запись в PostgreSQL через Drizzle репозиторий [`server/repositories/attemptRepo.ts`](file:///Users/starkoff/Documents/tests/new-render/server/repositories/attemptRepo.ts).
* **Ответ:** `{"ok": true, "attemptId": "uuid...", "taskAttempt": 1}`.

### `GET /api/admin/export/attempts`
* **Назначение:** Экспорт сырых данных психометрии и аналитики для исследователей.
* **Авторизация:** Заголовок `Authorization: Bearer <ADMIN_TOKEN>`.
* **Параметры query:** `format=json` (по умолчанию) или `format=csv`.
* **Ответ:** Выгрузка всей таблицы попыток в JSON или скачиваемый CSV-файл с корректным экранированием кавычек и заголовками `Content-Disposition`.

---

## 4. База данных и схема Drizzle

Схема описана в [`server/db/schema.ts`](file:///Users/starkoff/Documents/tests/new-render/server/db/schema.ts).

### Таблица `attempts`
```sql
CREATE TABLE attempts (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    user_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    lesson_version TEXT,
    rule_id TEXT,
    task_id TEXT NOT NULL,
    task_type TEXT,
    answer_type TEXT,
    graph_id TEXT,
    sub_task_id TEXT,
    skill_id TEXT,
    task_version TEXT,
    correct_options INTEGER DEFAULT 0,
    incorrect_options INTEGER DEFAULT 0,
    selected_correct_options INTEGER DEFAULT 0,
    selected_incorrect_options INTEGER DEFAULT 0,
    answer_text TEXT,
    selected_option_id TEXT,
    selected_option_ids TEXT,
    user_answer_is_correct BOOLEAN NOT NULL,
    user_score INTEGER DEFAULT 0,
    task_attempt INTEGER DEFAULT 1,
    response_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Важные нюансы подключения к Supabase:
1. **Serverless Connection Pooler:** В Netlify функции выполняются как эфемерные контейнеры AWS Lambda. Прямое подключение к порту 5432 быстро исчерпывает пул соединений. Поэтому используется **Transaction Pooler (порт 6543)**.
2. **Отключение prepared statements:** В файле [`server/db/client.ts`](file:///Users/starkoff/Documents/tests/new-render/server/db/client.ts) клиент `postgres` инициализирован с параметром `{ prepare: false }`. Это строго необходимо, так как режим транзакционного пулера PgBouncer/Supavisor не поддерживает кеширование именованных подготовленных выражений между разными сессиями пула.

---

## 5. Структура директорий проекта

```text
├── assets/                 # Глобальные CSS-стили (style.css, шрифты, svg)
├── components/             # Интерактивные компоненты заданий (Vue 3 SFC)
│   └── decision-tree/      # Движок и раскладки дерева решений (SpineTreeLayout и др.)
├── composables/            # Реактивные композаблы (useLessonProgress.ts)
├── layouts/                # Макеты страниц (MainLayout, BookLayout, GraphLayout)
├── lessons/                # JSON-манифесты уроков и конфигурации графов
├── pages/                  # Файловый роутинг Nuxt (index.vue, lesson/[id].vue)
├── public/                 # Статические ассеты (картинки к урокам в /lessons/)
├── scripts/                # Утилиты верификации и миграций
├── server/                 # Бэкенд на базе Nitro
│   ├── api/                # API роуты (attempts, progress, health, export)
│   ├── db/                 # Схема Drizzle (schema.ts), клиент (client.ts), миграции
│   ├── middleware/         # Серверные мидлвары (user.ts генерация uid)
│   ├── repositories/       # Слой абстракции данных (attemptRepo.ts)
│   └── utils/              # Серверные утилиты (graphRegistry.ts)
├── drizzle.config.ts       # Конфигурация миграций Drizzle Kit
├── nuxt.config.ts          # Конфигурация Nuxt (compatibilityDate, nitro preset)
├── package.json            # Зависимости и npm-скрипты
└── .gitignore              # Исключения версионирования (секреты, дампы, кэш)
```

---

## 6. Локальный запуск и разработка

### Предварительные требования
* Node.js `>= 20.x`
* Docker (опционально, для локальной БД Postgres)

### Установка и запуск:
```bash
# 1. Клонирование репозитория
git clone https://github.com/lokirockyche861-hash/dashasasha.git
cd dashasasha

# 2. Установка зависимостей
npm install

# 3. Настройка локального окружения
# Создайте файл .env со следующими переменными:
DATABASE_URL="postgresql://app:app@localhost:5432/appdb"
ADMIN_TOKEN="любой_секретный_токен"

# 4. Запуск локальной базы данных (если используется локальный Docker)
docker compose up -d

# 5. Применение схемы к локальной базе
npx drizzle-kit push

# 6. Запуск сервера разработки
npm run dev
# Приложение доступно на http://localhost:3000
```

---

## 7. CI/CD и деплой на Netlify

1. **Репозиторий:** `main` ветка на GitHub является источником правды для продакшена.
2. **Пресет сборки:** В `nuxt.config.ts` зафиксирован `nitro: { preset: 'netlify' }`.
3. **Результат билда (`npm run build`):**
   * Клиентская статика генерируется в каталог `dist/`.
   * Серверные функции компилируются в `.netlify/functions-internal/`.
4. **Переменные окружения:** В панели управления Netlify (*Site configuration → Environment variables*) заданы:
   * `DATABASE_URL` — строка подключения к Transaction Pooler Supabase (порт 6543, без квадратных скобок).
   * `ADMIN_TOKEN` — секретный токен для доступа к эндпоинту `/api/admin/export/attempts`.
5. **Автоматический деплой:** Любой коммит/push в ветку `main` на GitHub автоматически запускает пайплайн сборки Netlify, обновляя сайт без простоя (Zero-downtime deployment).
