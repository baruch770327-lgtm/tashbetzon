# Tashbetzon Milestone 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

<div dir="rtl">

**תקציר לבעלים:** זו תוכנית העבודה של **שלב 2**: כל 6 הרמות ומפתח חתימה קבוע.
- **מה בונים:**
  - חמש רמות חדשות: A2, B1, B2, C1, C2.
  - עוד 250 תשבצים, ובסך הכל 300.
  - כ-2,500 מילים וביטויים חדשים.
- **שיפורים במחולל:** פחות חזרות על מילים קצרות, ולוחות גדולים (13×13, 15×15).
- **מפתח חתימה קבוע (דורש אישור G4):** מעכשיו עדכונים יותקנו מעל הגרסה הקודמת, וההתקדמות תישמר.
- **מה מקבלים בסוף:** APK בגרסה 0.2.0 עם 300 שלבים.

</div>

**Goal:** All six levels playable (300 puzzles, ~3,200 vocabulary entries in total) and a release APK signed with a permanent key, so future updates install over the old version without losing progress.

**Architecture:** No new subsystems. Five new `content/vocab/<level>.json` files feed the existing generator. Generator changes: a per-answer reuse cap, size options calibrated for 13×13 and 15×15, and a documented fallback. `levels.json` gets worlds for every level. The Android build gains a `release` signing config that reads a keystore from outside the repo.

**Tech Stack:** Unchanged (Node 22, vanilla ES modules, Playwright for E2E, Gradle 8.14.3 + AGP 8.13.2, Android SDK 35). `keytool` from the preinstalled JDK 21 creates the keystore.

**Spec:** `docs/specs/2026-11-08-tashbetzon-design.md` (§2.1 levels table, §2.2 vocabulary sizes, §2.3 Hebrew rules, §4 generator, §5.3 signing, §7 milestone 2)

**Carries over:** `docs/decisions/m1.md` (decisions and deferred items from milestone 1).

## Global Constraints

- Level table (spec §2.1):

  | level | size | stages | words per puzzle |
  |---|---|---|---|
  | A1, A2 | 11×11 | 50 | 40–50 |
  | B1, B2 | 13×13 | 50 | 55–65 |
  | C1, C2 | 15×15 | 50 | 70–80 |

- Vocabulary targets (spec §2.2): A2 ≥ 550, B1 ≥ 550, B2 ≥ 500, C1 ≥ 450, C2 ≥ 450. Multi-word answers ≥ 8% per level (spec target ~15% overall).
- Every Hebrew rule from spec §2.3 holds for every level. Ids are `<level lowercase>-NNNN`. English clues are unique across **all** level files.
- A puzzle for level L uses entries from levels ≤ L, and ≥ 60% of its entries come from level L itself.
- Each level has 5 worlds of 10 stages; world topics must exist in that level's vocabulary.
- Unlocking (unchanged): a level opens after 40 of the previous level's 50 stages are complete.
- No secrets in the repo: `*.jks`, `*.keystore` and `android/keystore.properties` are git-ignored. The keystore lives only with the owner (G4).
- `versionCode 2`, `versionName '0.2.0'`.

## Review Focus

1. **Cross-level duplicates.** The same English clue in two level files, or an A2 puzzle whose entry points to a B1 word, must fail a test → Task 2 tests `English clues are unique across all levels` and Task 1's validator check on entry level ≤ puzzle level.
2. **Short-answer repetition.** No answer may appear in more than 8 of a level's 50 puzzles → Task 1 test `generator respects the per-answer cap`.
3. **Boot time with six puzzle files** (~3 MB of JSON). Home must render in under 1.5 s in headless Chromium → Task 8 E2E assertion.
4. **An A2+ game in progress after the update.** Saved games keep loading, and the fingerprint (M1 fix) protects against regenerated puzzles → covered by the existing Game tests; Task 8 E2E reloads mid-game on a B1 puzzle.
5. **Release APK signed with the debug key by mistake** → Task 9 verification `apksigner --print-certs` must not show `CN=Android Debug`.

---

### Task 1: Generator: reuse cap, size calibration, level-safe validation

**Files:** Modify `tools/generator/generate.js`, `tools/generator/validate.js`. Test: `tests/generator/generate.test.js` (new), `tests/generator/validate.test.js`.

**Interfaces:**
- Produces: `SIZE_OPTIONS = {11: {keep, maxLen, minWords:40}, 13: {..., minWords:55}, 15: {..., minWords:70}}` with values calibrated in Step 3. Also `MAX_ANSWER_USES = 8`.
- Produces: `validatePuzzle` also reports `level: <id> above <puzzle level>` when an entry's vocab level is higher than the puzzle's level (order taken from a new `levelOrder` option, default `['A1','A2','B1','B2','C1','C2']`).
- Produces: `generateLevel({level, seed, count})` never uses an answer more than `MAX_ANSWER_USES` times within one level. Over-cap answers score `-Infinity` and are filtered out.

- [ ] **Step 1: Write failing tests.**
  - `validate.test.js`: an A1 puzzle containing an entry whose vocab level is B1 → an error starting with `level:`.
  - `generate.test.js`: `generateLevel({level:'A1', seed:3, count:12})`. Count answer uses across the puzzles; the maximum must be ≤ `MAX_ANSWER_USES`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement.** Then calibrate `SIZE_OPTIONS` with a throwaway script on the real lexicon (all levels up to the target). Pick for each size the setting that meets `minWords` with 0 fallbacks over 10 stages. If 15×15 cannot reach 70 words, ledger a ruling: lower `minWords` to the best stable value ≥ 65 and report it to the owner.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5:** Fix two M1 deferred bugs in the same commit, each with an E2E check added in Task 8:
  - clear the completion timer in game `cleanup`;
  - re-render the settings switches after a reset.
- [ ] **Step 6: Commit** `"Generator: answer reuse cap, level-safe validation, size calibration"`.

### Task 2: Vocabulary tests for all levels

**Files:** Modify `tests/content/vocab.test.js` (loop over every file in `content/vocab/`), `app/data/levels.json` (worlds for A2–C2, still `available:false`).

**Interfaces:**
- Produces: `levels.json` worlds:

  | level | worlds (name · emoji · topics) |
  |---|---|
  | A2 | יום-יום 🏙️ `daily, shopping` · בבית ובחוץ 🏡 `home2, weather` · אנשים 👥 `people, feelings` · עבודה ולימודים 🎒 `school, jobs` · טיולים 🧳 `travel, transport` |
  | B1 | בריאות 🩺 `health, body2` · כסף וקניות 💳 `money, services` · תרבות 🎭 `culture, media` · טבע וסביבה 🌍 `environment, animals2` · חברה 🤝 `society, communication` |
  | B2 | מדע וטכנולוגיה 🔬 `science, technology` · עסקים 💼 `business, work` · חוק וממשל ⚖️ `law, politics` · רגשות ויחסים 💞 `emotions, relationships` · אמנות 🎨 `arts, history` |
  | C1 | רעיונות 💡 `abstract, thinking` · כלכלה 📈 `economy, industry` · שפה ותקשורת 🗣️ `language, rhetoric` · גוף ונפש 🧠 `psychology, medicine` · עולם 🌐 `global, geography` |
  | C2 | ניואנסים 🎯 `nuance, precision` · ספרות 📚 `literature, style` · פילוסופיה 🏛️ `philosophy, ethics` · מדע מתקדם 🧬 `research, academia` · ביטויים 🪶 `idioms, formal` |

- [ ] **Step 1: Generalize the test.** For each vocab file:
  - fields and types;
  - ids `^<lvl>-\d{4}$`;
  - level equals the file name;
  - `answerProblems` is empty;
  - forbidden spellings are absent;
  - topics belong to that level's worlds, with each topic ≥ 15 entries;
  - minimum size per the Global Constraints, and multi-word ≥ 8%.

  Across files:
  - English clues are unique across all levels;
  - pinned translations hold.

  A level whose vocab file does not exist yet is skipped only while that level is `available:false` and has no file. A test asserts that every `available:true` level has a vocab file.
- [ ] **Step 2: Run** `npm test`. Expected: PASS for A1. The new world topics are covered by their level's file once it exists.
- [ ] **Step 3: Commit** `"Vocabulary checks for all levels; worlds for A2–C2"`.

### Tasks 3–7: One level each: A2 (3), B1 (4), B2 (5), C1 (6), C2 (7)

Each level task is identical in shape:

**Files:** Create `content/vocab/<lvl>.json`, `app/data/puzzles/<lvl>.json`. Modify `app/data/levels.json` (`available:true`, `file`).

- [ ] **Step 1:** Set the level `available:true` with its `file` in `levels.json`. Run `npm test`. Expected: FAIL (vocab and puzzle files missing).
- [ ] **Step 2: Write the vocabulary** in topic batches (≥ the Global Constraints count). Words must suit the level (CEFR-like progression: A2 everyday life → C2 nuanced/formal). Same Hebrew rules as A1: add a `note` for ambiguous English, and use no English word that is already in a lower level.
- [ ] **Step 3: Proofread pass:** translation accuracy and Academy spelling. Then run `npm test` → only the puzzle-file test fails.
- [ ] **Step 4:** Run `npm run generate -- --level <LVL> --seed 1`. Record the summary line in the ledger. Expected: 50 puzzles, average entries within the level's range, fallbacks reported.
- [ ] **Step 5: Run** `npm test`. Expected: PASS. Spot-check 2 puzzles as ASCII.
- [ ] **Step 6: Commit** `"Add <LVL> vocabulary and 50 puzzles"` and push.

### Task 8: App with six levels: boot time, unlocking, E2E

**Files:** Modify `tests/e2e/smoke.mjs`. Modify `app/js/main.js` only if the boot-time check fails (then switch to loading a level's puzzles on first use).

- [ ] **Step 1: Extend E2E (failing first where new):**
  - home renders < 1.5 s after navigation;
  - inject progress with 40 A1 stages complete → the map shows A2 unlocked and B1 locked;
  - open B1-01, type 3 letters, reload → the letters are restored;
  - fast ✕ right after completing a stage (M1 deferred #1) does not leave the complete screen as root;
  - settings switches after a reset show the defaults (M1 deferred #2);
  - screenshot the map for each level.
- [ ] **Step 2: Run** `npm run e2e`. Fix any failures in the owning files. Run `npm test && npm run e2e`. Expected: PASS.
- [ ] **Step 3: Commit** `"E2E for six levels, unlocking and boot time"`.

### Task 9: Permanent signing key and release APK  ⛔ requires G4 approval first

**Files:** Modify `android/app/build.gradle` (release `signingConfig` from `android/keystore.properties` or the env vars `TASHBETZON_KEYSTORE`, `TASHBETZON_KEYSTORE_PASSWORD`, `TASHBETZON_KEY_ALIAS`, `TASHBETZON_KEY_PASSWORD`; `versionCode 2`, `versionName '0.2.0'`), `.gitignore` (`android/keystore.properties`), `README.md` (how the key is kept and how to build a release), `CLAUDE.md`.

- [ ] **Step 0: Gate.** G4 approval for creating the key and how the owner keeps it. Stop until approved.
- [ ] **Step 1: Create the key:** `keytool -genkeypair -v -keystore <scratchpad>/tashbetzon-release.jks -alias tashbetzon -keyalg RSA -keysize 4096 -validity 36500` with a random password. The key is never written inside the repo.
- [ ] **Step 2: Build** with `gradle -p android assembleRelease`, with the keystore path and password passed through environment variables in the shell only. Release `minifyEnabled false`.
- [ ] **Step 3: Verify.**
  - `apksigner verify --print-certs` shows `CN=Tashbetzon`, not Android Debug.
  - `aapt2` shows no permissions, versionName 0.2.0, minSdk 24.
  - `assets/www/data/puzzles/` has 6 files.
  - `git status` shows no keystore.
  - `npm test` still passes, and the repo's secret-pattern check finds nothing.
- [ ] **Step 4:** Deliver the key to the owner as the approved G4 method says, and record the certificate SHA-256 in README (public information).
- [ ] **Step 5: Commit** `"Release signing from an external keystore; version 0.2.0"` and push.

### Task 10: Final review and delivery

- [ ] Whole-branch review by a fresh reviewer, then one fix pass (RED→GREEN per finding).
- [ ] Update `docs/decisions/m2.md` with the rulings and deferred items.
- [ ] Send the signed APK to the owner, with Hebrew install notes: uninstall the 0.1.0 debug build once, then future updates keep progress.
