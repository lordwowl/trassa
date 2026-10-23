# PROGRESS — «Трасса»

## Текущий этап: M0 — Скелет (выполнен, ждёт мержа)

### Очередь задач M0
- [x] Перенести `GDD.md` и `GITHUB_SETUP.md` в `docs/`
- [x] Инициализировать проект: Vite + TypeScript (strict) + Phaser 3, Vitest; скрипты `dev`, `build`, `preview`, `typecheck`, `test`, `check`; `vite.config.ts` с `base: './'`
- [x] Структура папок по CLAUDE.md, пустые модули с заглушками
- [x] `core/rng.ts` (seeded RNG) + тест
- [x] `config.ts`: разбор URL-параметров (`debug`, `scene`, `seed`, `weather`, `time`, `car`, `money`, `fuel`)
- [x] Сцены-заглушки: Boot, Menu (кнопка «Играть» → fullscreen + блокировка альбомной ориентации), Drive (цветной экран с текстом), Map, City
- [x] Debug-оверлей: FPS + панель слайдеров для `tuning.json` с сохранением в localStorage и кнопкой «Скопировать JSON»
- [x] `render/sprites/registry.ts` с механизмом «файл или процедурная заглушка»
- [x] `public/assets/CREDITS.md` (пустой шаблон)
- [x] Capacitor: `appId` = `io.github.lordwowl.trassa`, `appName` = «Трасса», `npx cap add android`, альбомная ориентация (`sensorLandscape`), полноэкранный режим без статус-бара
- [x] Workflows из `docs/GITHUB_SETUP.md` (раздел 7): `ci.yml`, `pages.yml`, `android.yml`
- [x] README: что это, ссылка на Pages, где брать APK

### Сделано
**M0 (PR «feat: M0 — скелет проекта»)**
- Проект Vite 8 + TypeScript (strict) + Phaser 3.90 + Vitest; `npm run check` = typecheck + test + build.
- `core/`: `rng.ts` (mulberry32, состояние сериализуемо, `pick`/`weightedIndex`/`hashSeed`), `loop.ts` (фиксированный шаг 1/60 с аккумулятором), `tuning.ts` (проверка `tuning.json`, переопределения, экспорт), `state.ts` (`GameState` с `version`), `save/save.ts` (сохранение с миграциями, try/catch), заглушки `road`, `car`, `traffic`, `world`, `economy`, `events`, `passengers`. Тесты: 24 шт.
- `config.ts`: разбор URL-параметров; неверные значения игнорируются и показываются в debug-оверлее строкой `! …`.
- Сцены: Boot → Menu / Drive / Map / City (+ Debug поверх). Drive в M0 — небо по погоде/времени, условная дорога с бегущей разметкой и плавным разгоном; числа берутся из `tuning.json`, так что слайдеры видно сразу.
- Debug-панель (DOM) монтируется в контейнер `#game`, он же цель fullscreen, поэтому панель видна и в полноэкранном режиме. Переопределения тюнинга применяются **только при `?debug=1`**; без него игра всегда берёт значения из `tuning.json`.
- Реестр текстур: `car_rear`, `tree`, `sign_speed`, `hitchhiker` — процедурные заглушки; если у записи указан `file` и файл не загрузился, тоже рисуется заглушка.
- Android: Capacitor 8, `sensorLandscape`, тема `windowFullscreen` + иммерсивный режим в `MainActivity` (системные панели скрыты, появляются по свайпу). Debug APK собран локально в сессии (`./gradlew assembleDebug`, ~4.5 МБ).
- Workflows `ci.yml`, `pages.yml`, `android.yml` — дословно из `docs/GITHUB_SETUP.md`, раздел 7.

### Как проверить на телефоне
Сначала (один раз) включить Pages: **Settings → Pages → Source: GitHub Actions**, и **Settings → Actions → General → Workflow permissions: Read and write** (см. `docs/GITHUB_SETUP.md`, раздел 3).

После мержа в `main` дождаться зелёных «Deploy to GitHub Pages» и «Android debug APK» во вкладке Actions.
- Меню: https://lordwowl.github.io/trassa/ → «Играть» включает весь экран и альбомную ориентацию, открывается сцена езды; «Карта» и «Город» открывают заглушки, «Назад» возвращает в меню.
- Debug: https://lordwowl.github.io/trassa/?debug=1&scene=drive&seed=123&weather=rain&time=14&money=500 → слева сверху FPS и телеметрия (seed 123, rain, 14:00, money 500); справа кнопка «⚙ Тюнинг» → слайдеры; подвигать «Дальность прорисовки» / «Угол обзора» / «Макс. скорость» — дорога меняется сразу; перезагрузить страницу — значения сохранились; «Скопировать JSON» → вставить в чат.
- Ночь: https://lordwowl.github.io/trassa/?debug=1&scene=drive&time=22 → тёмное небо.
- Неверные параметры: https://lordwowl.github.io/trassa/?debug=1&weather=lava → в оверлее строка `! weather: неизвестная погода «lava»`.
- Портретная ориентация в браузере → надпись «Поверните телефон горизонтально».
- APK: Releases → `Debug build N` → установить → приложение «Трасса» открывается горизонтально, без статус-бара.

### Зависимости и причины
- `phaser` — игровой движок (стек проекта).
- `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` (dev) — упаковка в APK; `core` также нужен для `Capacitor.isNativePlatform()` (в APK не трогаем fullscreen API браузера).
- `vite` (dev) — сборка и dev-сервер.
- `typescript` (dev) — типизация, `tsc --noEmit`.
- `vitest` (dev) — тесты логики `core/`.

### Известные проблемы
- Бандл Phaser ~1.2 МБ (330 КБ gzip) одним чанком — для M0 нормально, Vite выводит только информацию о размере.
- Иконка и splash приложения — стандартные от Capacitor; заменить, когда появится арт.
- Параметр `render.resolutionScale` пока ни на что не влияет (появится в M1 вместе с RoadRenderer).
- `screen.orientation.lock` не работает в iOS Safari и на десктопе — там просто ничего не происходит.

## Следующий этап: M1 — Дорога
Псевдо-3D дорога (прямые, повороты, холмы), физика машины, простая кабина со спидометром, управление touch + tilt. Цель: по пустой трассе приятно ехать. Подробности — `docs/GDD.md`, разделы 5 и 6.

Первая задача M1: `core/road` — модель сегментов и генератор трассы по seed (+ тесты), затем `render/road/RoadRenderer.ts` вместо заглушки разметки в `DriveScene`.
