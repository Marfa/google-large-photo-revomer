# Google Large Photos — download or delete large photos in batches

A Node.js + Playwright CLI that opens Google One’s [large photos and videos](https://one.google.com/storage/management/photos/large) page, counts items, then **downloads** or **deletes** them in batches of 100.

[Русская версия / Russian README](README.md)

```bash
npm install && npx playwright install chromium && npm start
```

| Feature | What it does |
| --- | --- |
| Interactive wizard | UI language, Google sign-in, Download / Delete |
| Count | Scroll + “Show more”, reports file count |
| Download | Archives `Photos_001.zip`, `Photos_002.zip`, … into a chosen folder |
| Delete | Batches of 100, agreement dialogs and “Done” |
| Session | Login persisted in `.auth/` between runs |
| Keyboard layout | `yes` / layout typos, `download` / `скачать` / `crfxfnm` |

> Requires Node.js 20+, Playwright Chromium, and a Google account with Photos / One access.

---

## Quick start

```bash
git clone https://github.com/Marfa/google-large-photo-revomer.git
cd google-large-photo-revomer
npm install
npx playwright install chromium
npm start
```

1. Pick a language (defaults to the system locale).
2. Confirm sign-in — Chromium opens; sign in to Google if needed.
3. Type **Download** or **Delete**.
4. For download, choose a folder; for delete, confirm the action.

Do not close the browser window while the script is running.

---

## Commands

| Command | Action |
| --- | --- |
| `npm start` | Interactive mode (recommended) |
| `npm run login` | Sign in, then action wizard |
| `npm run count` | Count only |
| `npm run download` | Download to `./downloads/` |
| `npm run delete` | Delete in batches of 100 |
| `npm run debug` | Dump page debug state |
| `npm run selfcheck` | Local util self-check |

---

## Notes

- Deleted items go to **Google Photos trash** and are permanently removed after about **60 days**.
- `.auth/` holds the browser session — **do not commit** it (listed in `.gitignore`).
- Google One UI changes; if selectors break, update `src/large-photos.js`.
- Unofficial tool; not affiliated with or supported by Google. Use at your own risk.

```bash
npm run selfcheck
```

---

## Dependency security

```bash
npm audit
npx npm-check-updates
```

After adding any dependency, run `npm audit` immediately. Assistant rules: [AGENTS.md](AGENTS.md). CI runs `npm audit --audit-level=high` on every push and PR.

---

## Author

Code prepared with [Cursor](https://cursor.com).

Support the project:
- [DonationAlerts](https://www.donationalerts.com/r/themarfa)
- [Crypto donation via NOWPayments](https://nowpayments.io/donation/themarfa)

## License

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

See [LICENSE](LICENSE) · https://creativecommons.org/licenses/by-nc-sa/4.0/
