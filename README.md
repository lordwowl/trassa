# Трасса

Мобильная игра для Android (рабочее название): вождение от первого лица из салона по псевдо-3D дорогам между городами условной страны. Топливо, повреждения, усталость, трафик, попутчики, заправки, погода, смена дня и ночи. Вдохновлено J2ME-игрой Road Chase.

Стек: TypeScript + Phaser 3 + Vite, упаковка в APK через Capacitor.

## Играть

- **В браузере:** https://lordwowl.github.io/trassa/ (в Chrome на телефоне: меню → «Добавить на главный экран» — запуск на весь экран).
- **APK для Android:** [Releases](https://github.com/lordwowl/trassa/releases) → последний `Debug build N` → скачать `trassa-debug-N.apk` → установить (разрешить установку из браузера).

Debug-режим: добавьте к ссылке `?debug=1` (FPS, телеметрия, панель тюнинга). Другие параметры — в `CLAUDE.md`, раздел «Debug-режим».

## Документы

- `docs/GDD.md` — дизайн игры
- `PROGRESS.md` — статус и очередь задач
- `docs/GITHUB_SETUP.md` — настройка репозитория и CI
- `CLAUDE.md` — правила разработки

## Команды

```
npm ci
npm run dev      # dev-сервер
npm run check    # typecheck + тесты + сборка
npx cap sync android
```
