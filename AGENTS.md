# AGENTS.md

Rules for humans and AI assistants working in this repository.

## Dependencies

1. **Before adding a package**, check the latest version with `npm view <name> version` (or install `@latest` explicitly). Do not invent versions from memory.
2. **After any install or version bump**, run `npm audit`. Fix or document critical/high findings before merging.
3. Prefer **not** adding dependencies. Prefer Node.js built-ins and already-installed packages.
4. Periodically run `npx npm-check-updates` to see outdated packages; bump deliberately, then `npm audit` again.
5. CI (`.github/workflows/security.yml`) fails the job on `npm audit --audit-level=high`. Treat that as a gate, not a suggestion.

## Secrets

- Never commit `.auth/`, `.env`, tokens, cookies, or credential files.
- Enable the local hook: `git config core.hooksPath .githooks` (runs `gitleaks protect` on commit when `gitleaks` is installed).
- Before release, run `gitleaks detect --source . -v`.

## Stale artifacts

- After every commit, `.githooks/post-commit` runs `scripts/clean-stale-artifacts.sh`.
- It deletes **non-source** junk older than **7 days**: `debug-screenshot.png`, `dist/`, `.dist/`, old files under `downloads/`, root `.DS_Store` / `*.log`.
- Never delete `.auth/` or `src/` as “cleanup”.

## Scope

- Do not expand scope beyond the task. Match existing code style in `src/`.
- Official Google APIs are out of scope for this CLI; it automates the Google One web UI via Playwright.
