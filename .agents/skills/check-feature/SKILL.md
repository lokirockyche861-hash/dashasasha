---
name: check-feature
description: >-
  Run pre-commit verification checklist across project layers (JSON lessons,
  Vue renderer, analytics, API, DB, admin panel, docs), execute build and
  validation scripts, check for leaked secrets, and produce an acceptance report.
  Use when the user invokes /check-feature or asks to verify a completed feature or task.
---

# Проверка фичи перед завершением (/check-feature)

Выполните этот пошаговый чеклист для проверки изменений перед завершением задачи или подготовкой коммита.

## Шаг 1. Инспекция изменённых файлов
1. Выполните `git status` и `git diff --stat`.
2. Определите, какие архитектурные слои проекта затронуты:
   - **Контент уроков (`lessons/*.json`)** — требуется проверка JSON-схемы и запуск валидатора.
   - **Интерактивные компоненты (`components/*.vue`, `SimpleRenderer.vue`, `DecisionTreeLesson.vue`)** — проверьте корректность пропса `savedState`, восстановление неверного/частичного ответа (`showResults = true`) и отправку аналитики.
   - **Сервер и БД (`server/api/**`, `server/db/**`, `utils/AnalyticsService.js`)** — убедитесь в соблюдении принципа неизменяемости попыток (`attempts` только создаются, не перезаписываются).
   - **Админ-панель (`референсы/admin-panel.html`)** — если менялся JSON-контракт задания, проверьте синхронизацию шаблона и превью в конструкторе.
   - **Документация (`docs/*.md`, `README.md`, `AGENTS.md`)** — проверьте актуальность документации при изменении контрактов.

## Шаг 2. Запуск валидаторов из `scripts/`
Если затронуты файлы в `lessons/` или логика заданий, запустите проверки:
```bash
node scripts/validate_lessons.js
node scripts/verify_logic.js
```

## Шаг 3. Проверка сборки (`npm run build`)
Выполните сборку проекта, чтобы убедиться в отсутствии синтаксических и типовых ошибок Nuxt 4 / Vue 3 / Vite:
```bash
npm run build
```

## Шаг 4. Аудит безопасности и секретов
1. Проверьте по `git status` и `git diff`, что в индексируемые или новые файлы не попали:
   - файлы `.env`, `.env.*`;
   - строки подключения `postgresql://` с реальными паролями;
   - токены (`ADMIN_TOKEN`, ключи Supabase) и локальные дампы (`attempts.csv`, `attempts.json`).
2. Убедитесь, что не запускались деструктивные команды против production-базы данных.

## Шаг 5. Итоговый отчёт по критериям приёмки
Сформируйте для пользователя краткий структурированный отчёт:
- **Затронутые слои и файлы:** список изменений.
- **Статус проверок:** результат `npm run build` и скриптов валидации.
- **Соблюдение инвариантов:** подтверждение работы `savedState`, неизменяемости `attempts` и отсутствия секретов.
- **Готовность:** список ручных проверок (если требуются в браузере).

> **Важно:** Не выполняйте `git commit`, `git push` или деплой без явного подтверждения пользователя.
