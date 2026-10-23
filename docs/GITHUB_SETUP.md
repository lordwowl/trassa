# Настройка GitHub-репозитория «Трасса» (всё делается с телефона)

## 1. Создать репозиторий

На github.com в мобильном браузере (в режиме «Версия для ПК», если каких-то пунктов не видно) → **New repository**:

- **Repository name:** `trassa`
- **Visibility:** Public. На бесплатном тарифе GitHub Pages работает только для публичных репозиториев. Если код нужно скрыть — Private, но тогда для Pages нужен платный план, а тестировать придётся только через APK.
- **Add a README:** да
- **.gitignore:** Node
- **License:** None (все права у автора)

## 2. Загрузить стартовые файлы

**Add file → Upload files** → загрузить в корень:
- `CLAUDE.md`
- `PROGRESS.md`
- `GDD.md`
- `GITHUB_SETUP.md`

→ **Commit changes** в `main`.

GDD и этот файл в первой сессии Claude Code перенесёт в `docs/` (это первая задача M0 в `PROGRESS.md`).

## 3. Настройки репозитория (Settings)

**Settings → Pages → Build and deployment → Source:** выбрать **GitHub Actions**.

**Settings → Actions → General:**
- Actions permissions: **Allow all actions and reusable workflows**
- Workflow permissions: **Read and write permissions** (нужно, чтобы workflow APK создавал релизы со ссылкой на скачивание)

**Settings → General → Pull Requests:**
- оставить включённым **Allow squash merging**
- включить **Automatically delete head branches**

**Защита ветки (по желанию, позже):** Settings → Rules → Rulesets → правило для `main`: «Require status checks to pass» с проверкой `check` из workflow CI. Обязательные ревью не включать, иначе не получится мержить свои PR одному.

## 4. Подключить Claude Code

На claude.ai/code подключить GitHub и выдать приложению Claude доступ к репозиторию `trassa`. Окружению сессии нужен доступ к npm-реестру для `npm install` (обычно это разрешено уровнем сетевого доступа по умолчанию; если `npm install` падает с сетевой ошибкой, расширь доступ в настройках окружения).

## 5. Первый промпт в Claude Code

```
Прочитай CLAUDE.md и PROGRESS.md. Выполни этап M0 целиком по списку в PROGRESS.md.
Workflow-файлы создай ровно по docs/GITHUB_SETUP.md (раздел 7).
В конце: npm run check, обнови PROGRESS.md, создай PR в main с чек-листом проверки на телефоне.
```

После мержа PR:
- **Actions** → дождаться зелёных «Deploy to GitHub Pages» и «Android debug APK».
- Игра в браузере: `https://<твой-логин>.github.io/trassa/` (Chrome → «Добавить на главный экран» — откроется на весь экран).
- APK: **Releases** → последний `Debug build N` → скачать `.apk` → установить (разрешить установку из браузера).

## 6. Подпись release-сборки (на этапе M8, не сейчас)

1. Попросить Claude Code в облачной сессии сгенерировать keystore через `keytool` и вывести его в base64. **Keystore не коммитить.** Сохранить файл и пароли в надёжном месте: без них нельзя будет обновлять приложение в магазине.
2. **Settings → Secrets and variables → Actions → New repository secret:**
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
3. Попросить Claude Code добавить workflow `android-release.yml` с подписью по этим секретам (AAB для магазина).

`appId` Capacitor задаётся один раз и потом не меняется (он же идентификатор в магазине). Предлагаемый: `io.github.<логин>.trassa`.

## 7. Workflow-файлы (Claude Code создаёт их в M0)

### `.github/workflows/ci.yml` — проверка PR

```yaml
name: CI
on:
  pull_request:
  workflow_dispatch:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
```

### `.github/workflows/pages.yml` — деплой на GitHub Pages

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### `.github/workflows/android.yml` — debug APK

```yaml
name: Android debug APK
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: write
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - uses: android-actions/setup-android@v3
        with:
          # по умолчанию ставится пакет 'tools', которого больше нет в sdkmanager
          packages: platform-tools
      - run: npm ci
      - run: npm run build
      - run: npx cap sync android
      - name: Build APK
        working-directory: android
        run: |
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon
      - name: Rename APK
        run: cp android/app/build/outputs/apk/debug/app-debug.apk trassa-debug-${{ github.run_number }}.apk
      - uses: actions/upload-artifact@v4
        with:
          name: trassa-debug-apk
          path: trassa-debug-*.apk
      - uses: softprops/action-gh-release@v2
        with:
          tag_name: debug-${{ github.run_number }}
          name: Debug build ${{ github.run_number }}
          prerelease: true
          files: trassa-debug-*.apk
```

Debug-релизы копятся; время от времени старые можно удалять на странице Releases.
