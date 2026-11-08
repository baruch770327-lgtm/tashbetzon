# CLAUDE.md — Tashbetzon operating rules

Loaded automatically in every Claude Code session. When a rule conflicts with a
request, stop and ask the owner.

## 1. Owner and communication

- The owner is a beginner who works mainly from a phone.
- **Explain every important action in Hebrew, step by step**, in plain language.
  Technical terms may stay in English, followed by a short Hebrew explanation.
- Before a multi-step change, say in Hebrew what you are about to do and why.
- After the change, report in Hebrew exactly what was created, changed and tested,
  including failures. Never claim something was tested if it was not.

## 2. Project

An offline English→Hebrew crossword game for Android (APK) and iPhone (PWA).
- Design: `docs/specs/2026-11-08-tashbetzon-design.md`
- Current plan: `docs/superpowers/plans/`

## 3. Approval gates (explicit written approval in the current conversation)

| Gate | Examples |
|------|----------|
| **G1 Money** | Any purchase, paid service, developer account, subscription |
| **G4 Credentials** | Creating or storing a signing key, token or password |
| **G5 Software** | Installing any tool or package not listed in §4 |
| **G6 Irreversible / repo settings** | Deleting data, force-push, merging PRs, GitHub Pages / repo settings |

Approval for one action does not carry over to another. Never merge a pull request yourself.

## 4. Approved tools

- Node.js 22 (built-in `node --test`; **no npm dependencies**)
- Playwright + Chromium (preinstalled in the cloud environment) for E2E tests only
- Gradle 8.14.3, Java 21 (preinstalled)
- Android SDK command-line tools, `platforms;android-35`, `build-tools;35.0.0`,
  Android Gradle Plugin 8.13.x — approved by the owner (G5, 2026-11-08), build only
- Rubik font (SIL OFL 1.1), bundled in `app/fonts/`

## 5. Rules

- No secrets in the repo. Signing keys (`*.jks`, `*.keystore`) are git-ignored.
- The app makes no network calls and collects no data. The Android manifest has no
  INTERNET permission.
- Hebrew content follows the spelling rules in spec §2.3. `npm test` enforces them.
- Translations are AI-written: when the owner reports a mistake, fix it in
  `content/vocab/` and regenerate the affected puzzles.

## 6. Commands

```bash
npm test                                   # all unit, content and puzzle checks
npm run generate -- --level A1 --seed 1    # regenerate a level's puzzles
npm run serve                              # play in a browser at http://localhost:8080
npm run e2e                                # end-to-end test + screenshots
```

Run `npm test` before every commit and report the result.
