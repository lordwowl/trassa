# PROGRESS — «Трасса»

## Текущий этап: M0 — Скелет

### Очередь задач M0
- [ ] Перенести `GDD.md` и `GITHUB_SETUP.md` в `docs/`
- [ ] Инициализировать проект: Vite + TypeScript (strict) + Phaser 3, Vitest; скрипты `dev`, `build`, `preview`, `typecheck`, `test`, `check`; `vite.config.ts` с `base: './'`
- [ ] Структура папок по CLAUDE.md, пустые модули с заглушками
- [ ] `core/rng.ts` (seeded RNG) + тест
- [ ] `config.ts`: разбор URL-параметров (`debug`, `scene`, `seed`, `weather`, `time`, `car`, `money`, `fuel`)
- [ ] Сцены-заглушки: Boot, Menu (кнопка «Играть» → fullscreen + блокировка альбомной ориентации), Drive (цветной экран с текстом), Map, City
- [ ] Debug-оверлей: FPS + панель слайдеров для `tuning.json` с сохранением в localStorage и кнопкой «Скопировать JSON»
- [ ] `render/sprites/registry.ts` с механизмом «файл или процедурная заглушка»
- [ ] `public/assets/CREDITS.md` (пустой шаблон)
- [ ] Capacitor: `appId` = `io.github.<логин>.trassa`, `appName` = «Трасса», `npx cap add android`, альбомная ориентация (`sensorLandscape`), полноэкранный режим без статус-бара
- [ ] Workflows из `docs/GITHUB_SETUP.md` (раздел 7): `ci.yml`, `pages.yml`, `android.yml`
- [ ] README: что это, ссылка на Pages, где брать APK

### Сделано
_(пусто)_

### Как проверить на телефоне
_(заполняется после каждой задачи)_

### Зависимости и причины
_(каждая добавленная зависимость — одна строка)_

### Известные проблемы
_(пусто)_

## Следующий этап: M1 — Дорога
Псевдо-3D дорога (прямые, повороты, холмы), физика машины, простая кабина со спидометром, управление touch + tilt. Цель: по пустой трассе приятно ехать. Подробности — `docs/GDD.md`, разделы 5 и 6.
