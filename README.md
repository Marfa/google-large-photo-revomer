# Google Large Photos Remover

CLI на Node.js + Playwright: открывает [раздел «Фото и видео большого размера»](https://one.google.com/storage/management/photos/large) в Google One, считает объекты и **скачивает** или **удаляет** их пакетами по 100.

[English README](README.en.md)

```bash
npm install && npx playwright install chromium && npm start
```

| Возможность | Что делает |
| --- | --- |
| Интерактивный мастер | Язык UI, вход в Google, выбор «Скачать» / «Удалить» |
| Подсчёт | Скролл + «Показать ещё», итог по числу файлов |
| Скачивание | Архивы `Photos_001.zip`, `Photos_002.zip`, … в выбранную папку |
| Удаление | Пакеты по 100, диалоги согласия и «Готово» |
| Сессия | Логин сохраняется в `.auth/` между запусками |
| Раскладка | `да` / `lf`, `скачать` / `crfxfnm` |

> Нужны Node.js 20+, Chromium через Playwright и аккаунт Google с доступом к Google One / Фото.

---

## Быстрый старт

```bash
git clone https://github.com/Marfa/google-large-photo-revomer.git
cd google-large-photo-revomer
npm install
npx playwright install chromium
npm start
```

1. Выберите язык (по умолчанию — язык системы).
2. Подтвердите вход — откроется Chromium; войдите в Google, если нужно.
3. Напишите **Скачать** или **Удалить**.
4. Для скачивания укажите папку; для удаления подтвердите действие.

Не закрывайте окно браузера, пока скрипт работает.

---

## Команды

| Команда | Действие |
| --- | --- |
| `npm start` | Интерактивный режим (рекомендуется) |
| `npm run login` | Вход и далее мастер действий |
| `npm run count` | Только подсчёт |
| `npm run download` | Скачать в `./downloads/` |
| `npm run delete` | Удалить пакетами по 100 |
| `npm run debug` | Снимок состояния страницы |
| `npm run selfcheck` | Локальная проверка утилит |

---

## Важно

- Удалённые объекты попадают в **корзину Google Фото** и удаляются навсегда примерно через **60 дней**.
- Каталог `.auth/` содержит сессию браузера — **не коммитьте** его (уже в `.gitignore`).
- UI Google One меняется; при поломке смотрите селекторы в `src/large-photos.js`.
- Это неофициальный инструмент; Google его не поддерживает. Используйте на свой риск.

```bash
npm run selfcheck
```

---

## Безопасность зависимостей

```bash
npm audit
npx npm-check-updates
```

После добавления любой зависимости — сразу `npm audit`. Правила для ассистентов: [AGENTS.md](AGENTS.md). В CI на каждый push/PR гоняется `npm audit --audit-level=high`.

---

## Автор

Код подготовлен с помощью [Cursor](https://cursor.com).

Поддержка проекта:
- [DonationAlerts](https://www.donationalerts.com/r/themarfa)
- [Криптодонат NOWPayments](https://nowpayments.io/donation/themarfa)

## Лицензия

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

См. [LICENSE](LICENSE) · https://creativecommons.org/licenses/by-nc-sa/4.0/
