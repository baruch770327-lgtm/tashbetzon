# Tashbetzon Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

<div dir="rtl">

**תקציר לבעלים:** זו תוכנית העבודה של **שלב 1**.
- **מה בונים:** מנוע המשחק, כל המסכים, מחולל התשבצים, ורמה A1 מלאה (500 מילים ו-50 תשבצים).
- **מה מקבלים בסוף:** קובץ APK ראשון לאנדרואיד.
- **איך זה מחולק:** 12 משימות. כל משימה נבדקת בבדיקות אוטומטיות ונשמרת ב-commit נפרד.
- **אישור לפני משימה 12:** שם צריך אישור G5 (התקנת ערכת הכלים של Google לבניית אנדרואיד).

</div>

**Goal:** A playable offline English→Hebrew crossword game with the full A1 level (50 dense 11×11 puzzles from a 500+ entry vocabulary) that runs in a browser and is packaged as an installable Android debug APK.

**Architecture:** Zero-dependency web app (vanilla ES modules) in `app/`. Pure game logic lives in `app/js/core/` and is unit-tested with Node's built-in test runner. Puzzles are generated offline by a Node generator in `tools/generator/`, which reuses `app/js/core/grid.js` and `hebrew.js`, and are shipped as JSON. A minimal Java Android shell (`android/`) wraps `app/` in a WebView served from a virtual https origin.

**Tech Stack:** HTML/CSS/JavaScript (ES2022 modules, no framework, no build step). Node 22 (`node --test`) for tests and the generator. Playwright with the preinstalled Chromium for the E2E test. Android: Gradle 8.14.3 (preinstalled), Android Gradle Plugin 8.13.x, Java 21, compileSdk/targetSdk 35, minSdk 24, no AndroidX or third-party libraries.

**Spec:** `docs/specs/2026-11-08-tashbetzon-design.md`

## Global Constraints

- Clues are English, answers are Hebrew. The grid is RTL: column 0 is the **rightmost** column. Across entries run toward increasing column (right→left on screen). Down entries run toward increasing row.
- Hebrew answers: full spelling (כתיב מלא), no niqqud, no geresh, letters and single spaces only, 1–3 words, 2–9 grid letters.
- Final letters ך ם ן ף ץ are equal to כ מ נ פ צ for matching and input. Grids store base letters only.
- Final-form display rule: a cell displays its final form iff it is at a word end in every entry that contains it.
- Multi-word answers: no spaces in the grid. The clue shows word lengths, e.g. `(3,3)`. A thick bar separates the words in the grid.
- Puzzles: no repeated answer within a puzzle; white cells ≥ 60%; all white cells connected; every white cell belongs to at least one entry of length ≥ 2; 180° rotational symmetry of blocks.
- A1: 50 stages, 11×11, ≥ 40 entries per puzzle, ≥ 60% of entries from the puzzle's own level.
- Unlocking: stage N+1 unlocks when stage N is completed. A level unlocks when 40 of the previous level's 50 stages are completed. In M1 only A1 is `available`; A2–C2 show as locked "בקרוב".
- Hints: "בדוק מילה" is free. "גלה אות" costs 10 coins and counts 1 reveal. "גלה מילה" costs 30 coins and counts 3 reveals. Stars: 0 reveals → 3; 1–3 → 2; >3 → 1. Coins: 20 + 10 per star on first completion. Starting coins: 100.
- Privacy: no network calls from the app, no analytics. The Android manifest has **no** INTERNET permission.
- No npm dependencies. Playwright is used from the preinstalled global install (`require('playwright')` works from any directory).
- UI text is Hebrew. Design tokens (colors, radii, font Rubik) follow the approved mockups (navy `#0f1530`/`#161e42`, accent `#ffb547`→`#ff8a3d`, good `#3ddc97`, bad `#ff5c7a`).

## Review Focus

1. **Final letter typed at the wrong position.** Typing ם into a mid-word cell, or מ into a word-end cell, must count as correct → Task 3 test `type normalizes final letters`.
2. **Stale saved game** after puzzles are regenerated (different size or letters). The game must start fresh, not crash → Task 3 test `ignores saved state that does not match the puzzle`.
3. **localStorage unavailable or throwing** (private mode, WebView storage off). The app must run in memory without crashing → Task 4 test `load falls back to defaults when storage throws`.
4. **Hint on an already-correct cell or word.** It must not charge reveals or coins → Task 3 tests `revealLetter on a correct cell is free` and `revealWord on a solved entry is free`.
5. **Android back button at the root screen** must exit the app. On any other screen it must go back one screen → Task 8 test `history back returns false at root`.

---

## File Structure

```
CLAUDE.md, README.md, .gitignore, package.json
app/
  index.html
  css/app.css
  fonts/rubik-hebrew.woff2, rubik-latin.woff2, OFL.txt
  data/levels.json
  data/puzzles/a1.json                (generated)
  js/main.js                          boot + wiring
  js/data.js                          fetch levels/puzzles
  js/storage.js                       localStorage adapter
  js/speech.js                        TTS (Android bridge / speechSynthesis)
  js/core/hebrew.js                   letters, finals, answer parsing
  js/core/grid.js                     slots + numbering from rows (shared with generator)
  js/core/puzzle.js                   runtime puzzle model
  js/core/game.js                     Game class (fills, cursor, hints)
  js/core/scoring.js                  stars, coins, costs
  js/core/progress.js                 progress object, unlock rules
  js/ui/dom.js                        h() helper
  js/ui/history.js                    pure screen-history stack
  js/ui/router.js                     screen mounting + Android back hook
  js/ui/viewport.js                   pure zoom/pan math
  js/ui/gestures.js                   pointer events → viewport
  js/ui/board.js, minimap.js, keyboard.js, clue-bar.js, clue-list.js
  js/ui/screens/home.js, map.js, game.js, complete.js, words.js, settings.js
content/vocab/a1.json
tools/serve.mjs                       static dev server
tools/generator/rng.js, lexicon.js, template.js, fill.js, validate.js, generate.js
tests/core/*.test.js, tests/generator/*.test.js, tests/content/vocab.test.js,
tests/puzzles/puzzles.test.js, tests/ui/*.test.js, tests/e2e/smoke.mjs
android/settings.gradle, build.gradle, app/build.gradle,
android/app/src/main/AndroidManifest.xml,
android/app/src/main/java/app/tashbetzon/MainActivity.java,
android/app/src/main/res/(values/strings.xml, drawable/ic_launcher_foreground.xml, mipmap-anydpi-v26/ic_launcher.xml)
```

---

### Task 1: Repo scaffolding + Hebrew helpers

**Files:**
- Create: `CLAUDE.md`, `README.md` (replace the one-line stub), `.gitignore`, `package.json`, `app/js/core/hebrew.js`
- Test: `tests/core/hebrew.test.js`

**Interfaces:**
- Produces (`app/js/core/hebrew.js`):
  - `BASE_LETTERS: string` — the 22 base letters `'אבגדהוזחטיכלמנסעפצקרשת'`
  - `normalizeLetter(ch: string): string | null` — final→base, base→itself, anything else → `null`
  - `answerLetters(he: string): string` — strip spaces and normalize finals (`'יום הולדת'` → `'יומהולדת'`)
  - `wordLengths(he: string): number[]` — `'בית ספר'` → `[3,3]`
  - `displayLetter(base: string, final: boolean): string` — `('מ', true)` → `'ם'`; `('א', true)` → `'א'`
  - `answerProblems(he: string): string[]` — empty when valid per Global Constraints. Otherwise returns problem codes: `'chars'`, `'words'` (not 1–3), `'length'` (grid letters not 2–9), `'final-mid'` (final form not at a word end), `'nonfinal-end'` (כ מ נ פ צ at a word end)

- [ ] **Step 1: Write scaffolding files**
  - `package.json`: `{"name":"tashbetzon","private":true,"type":"module","scripts":{"test":"node --test tests/","e2e":"node tests/e2e/smoke.mjs","generate":"node tools/generator/generate.js","serve":"node tools/serve.mjs"}}`. No dependencies.
  - `.gitignore`: `node_modules/`, `test-results/`, `dist/`, `android/.gradle/`, `android/build/`, `android/app/build/`, `android/local.properties`, `*.keystore`, `*.jks`, `.env*`.
  - `CLAUDE.md`: owner rules adapted from the owner's other repo:
    - Explain every important action in Hebrew, step by step. The owner is a beginner on a phone.
    - Approval gates G1 money, G4 credentials, G5 software (list the approved tools: Node 22, Playwright preinstalled, Gradle 8.14.3, Java 21), G6 irreversible/repo settings.
    - Never claim untested results.
    - Run `npm test` before every commit.
    - Never merge PRs.
  - `README.md`: in Hebrew. What the app is, the folder map, and the commands (`npm test`, `npm run generate -- --level A1 --seed 1`, `npm run serve`, `npm run e2e`).

- [ ] **Step 2: Write failing tests** `tests/core/hebrew.test.js`:
  - `normalizeLetter`: `'ם'→'מ'`, `'ץ'→'צ'`, `'א'→'א'`, `'a'→null`, `' '→null`
  - `answerLetters('יום הולדת') === 'יומהולדת'`, `answerLetters('אף') === 'אפ'`
  - `wordLengths('תחנת רכבת')` deep-equals `[4,4]`, `wordLengths('כלב')` deep-equals `[3]`
  - `displayLetter('צ', true) === 'ץ'`, `displayLetter('צ', false) === 'צ'`
  - `answerProblems('כלב')` → `[]`. Problems: `'כלב גדול שחור ענק'` → includes `'words'`; `'ם'` → `'length'`; `'מים!'` → `'chars'`; `'םים'` → `'final-mid'`; `'מימ'` → `'nonfinal-end'`; `'ג׳ירפה'` → `'chars'`; `'שָׁלוֹם'` (niqqud) → `'chars'`

- [ ] **Step 3: Run** `npm test`. Expected: FAIL, module not found.

- [ ] **Step 4: Implement `app/js/core/hebrew.js`** per the Interfaces block.

- [ ] **Step 5: Run** `npm test`. Expected: all pass.

- [ ] **Step 6: Commit** `git add -A && git commit -m "Scaffold repo and add Hebrew letter helpers"`

---

### Task 2: Grid slots and runtime puzzle model

**Files:**
- Create: `app/js/core/grid.js`, `app/js/core/puzzle.js`
- Test: `tests/core/grid.test.js`, `tests/core/puzzle.test.js`

**Interfaces:**
- Consumes: `wordLengths`, `answerLetters` from Task 1.
- Produces (`grid.js`):
  - `computeSlots(rows: string[]): Slot[]`. `rows` are equal-length strings, `'#'` = block, any other char = white. `Slot = {num:number, dir:'across'|'down', row:number, col:number, len:number}`. Only runs of length ≥ 2. Numbering goes in reading order: row-major, col 0 first. A cell gets the next number if it starts an across or a down slot. Output is sorted by `num`, across before down.
  - `slotCells(slot): Array<[number, number]>`
- Produces (`puzzle.js`):
  - `RawPuzzle = {id, stage, world, size, rows: string[], entries: RawEntry[]}`, `RawEntry = {num, dir, row, col, answer, lengths: number[], vocabId, en, he, note}` (the file format; `answer` is base letters without spaces)
  - `loadPuzzle(raw: RawPuzzle): Puzzle` where `Puzzle = {id, stage, world, size, entries: Entry[], cells: Cell[][]}`
    - `Entry = RawEntry & {index:number, cells: Array<[r,c]>}`
    - `Cell = {block:boolean, answer:string|null, num:number|null, across:number|null, down:number|null, finalForm:boolean, barAfter:{across:boolean, down:boolean}}`. `across`/`down` hold entry indexes. `barAfter.dir` is true when this cell ends a non-final word of a multi-word answer in that direction.
  - `loadPuzzle` throws `Error('puzzle mismatch: <id>')` if any entry's letters disagree with `rows`, or its slot isn't in `computeSlots(rows)`.

- [ ] **Step 1: Write failing tests.** Fixtures are tiny hand-made grids (col 0 = rightmost). Write `tests/core/grid.test.js`:
  - `computeSlots(['כלב','ל#א','בית'])` returns 4 slots. They are `{num:1,across,row0,col0,len3}`, `{num:1,down,row0,col0,len3}`, `{num:2,down,row0,col2,len3}` and `{num:3,across,row2,col0,len3}`, in that order.
  - Runs of length 1 do not produce slots.

  Write `tests/core/puzzle.test.js` with a raw puzzle built on rows `['ביתספר','#####ו','#####ח']`. Across entry 1: `answer:'ביתספר'`, `lengths:[3,3]`, `he:'בית ספר'`. Down entry: `answer:'רוח'`, `he:'רוח'`. Assertions:
  - cell `[0,2].barAfter.across === true`, and `[0,3].barAfter.across === false`
  - `[0,5].finalForm === false` (ר is not a final letter anyway). Add a second fixture `['שלום']` with across `'שלומ'`: then `[0,3].finalForm === true`.
  - A cell that ends the across entry but starts the down entry has `finalForm === false`. Fixture: rows `['לחמ','##ה']`, across `'לחמ'`, down `'מה'` at col 2, so `[0,2].finalForm === false`.
  - `loadPuzzle` throws on a mismatched answer.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `grid.js` and `puzzle.js` per the Interfaces block.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "Add grid slot numbering and runtime puzzle model"` (with `git add` for new files).

---

### Task 3: Game state, hints and scoring

**Files:**
- Create: `app/js/core/game.js`, `app/js/core/scoring.js`
- Test: `tests/core/game.test.js`, `tests/core/scoring.test.js`

**Interfaces:**
- Consumes: `Puzzle`, `Entry` (Task 2), `normalizeLetter` (Task 1).
- Produces (`scoring.js`): `HINT_COST = {letter:10, word:30}`, `REVEAL_WEIGHT = {letter:1, word:3}`, `STARTING_COINS = 100`, `starsFor(reveals:number): 1|2|3`, `coinsFor(stars:number): number` (= 20 + 10·stars).
- Produces (`game.js`): `class Game`
  - `constructor(puzzle: Puzzle, saved?: SavedGame|null)`. Saved state that doesn't match (wrong row count or length, or a letter that isn't a base letter or `'.'`) is ignored.
  - Fields: `puzzle`, `fills: string[][]` (`''` = empty), `cursor: {row, col, dir:'across'|'down'}` (initially the first cell of entry 0), `reveals: number`, `revealed: Set<string>` (keys `"r,c"`), `elapsedMs: number`.
  - `select(row, col): void` — no-op on a block. Tapping the current cell again toggles dir, if the cell has both. Otherwise keep the dir if the cell has it, else switch.
  - `currentEntry(): Entry`
  - `type(letter: string): void` — `normalizeLetter`; ignores `null`. Writes unless the cell is revealed, then advances one cell within the entry (stays on the last cell).
  - `erase(): void` — if the current cell has a non-revealed letter, clear it. Otherwise move back one cell within the entry and clear that cell, if it isn't revealed.
  - `goToEntry(index): void` — cursor goes to the first empty cell of the entry (or its first cell), with the entry's dir.
  - `nextEntry(delta: 1|-1): void` — wraps around in `entries` order.
  - `wrongCells(entryIndex?: number): Array<[r,c]>` — filled cells whose letter ≠ answer.
  - `revealLetter(): boolean` — if the cursor cell is already correct, returns `false` and changes nothing. Otherwise fills it, marks it revealed, `reveals += 1`, returns `true`.
  - `revealWord(): number` — fills and marks every incorrect or empty cell of the current entry, and returns how many changed. `reveals += 3` only if > 0.
  - `isEntrySolved(i): boolean`, `isComplete(): boolean`
  - `toJSON(): SavedGame` = `{fills: string[], revealed: string[], reveals, elapsedMs, cursor}`. `fills` rows use `'.'` for empty cells and `'#'` for blocks.

- [ ] **Step 1: Write failing tests.** Use the fixture rows `['שלום','ל##ו','ם##ת']` (normalized to base letters). Across `'שלומ'`, down `'שלמ'` at col 0, down `'מות'` at col 3 (normalize finals in the raw fixture). Tests:
  - `type normalizes final letters`: typing `'ם'` into a cell whose answer is `'מ'` stores `'מ'`, and `isEntrySolved` becomes true after the rest is typed.
  - `type advances within the entry and stops at its end`
  - `select toggles direction on the same cell when both exist`
  - `select on a block is a no-op`
  - `erase clears current then steps back`
  - `wrongCells reports only filled mismatches`
  - `revealLetter on a correct cell is free`: returns false, `reveals` unchanged
  - `revealWord on a solved entry is free`: returns 0, `reveals` unchanged
  - `revealWord counts 3 reveals and marks cells revealed; typing into a revealed cell does not change it`
  - `isComplete only when every cell is correct` (a fully filled grid with one wrong letter → false)
  - `round-trips through toJSON` (new `Game(p, g.toJSON())` has equal fills, reveals, cursor)
  - `ignores saved state that does not match the puzzle` (saved fills with 2 rows → fresh game)
  - scoring: `starsFor(0)===3`, `starsFor(1)===2`, `starsFor(3)===2`, `starsFor(4)===1`, `coinsFor(3)===50`
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `scoring.js` and `game.js`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `"Add game state, hints and scoring"`

---

### Task 4: Progress model and storage

**Files:**
- Create: `app/js/core/progress.js`, `app/js/storage.js`
- Test: `tests/core/progress.test.js`, `tests/core/storage.test.js`

**Interfaces:**
- Consumes: `starsFor`, `coinsFor`, `STARTING_COINS` (Task 3), `Puzzle` (Task 2).
- Produces (`progress.js`):
  - `Progress = {version:1, coins, stages:{[puzzleId]:{stars, bestMs}}, inProgress:{[puzzleId]: SavedGame}, words:{[vocabId]:{en, he, level, firstMs}}, settings:{sound:true, vibrate:true, autoCheck:false}, lastPlayed: string|null}`
  - `defaultProgress(): Progress`
  - `migrate(raw: unknown): Progress` — anything that isn't an object with `version === 1` → `defaultProgress()`. Missing fields are filled from the defaults.
  - `recordCompletion(p, puzzle, {reveals, elapsedMs, now}): {stars, coinsEarned, newWords: Entry[]}` — mutates `p`.
    - First completion: `coinsEarned = coinsFor(stars)`.
    - Replay: `10 × (newStars − oldStars)` if improved, else 0.
    - Keeps the best stars and the best time. Deletes `inProgress[id]`.
    - Adds unseen entries to `words` (keyed by `vocabId`).
  - `spendCoins(p, amount): boolean` — false and no change if `coins < amount`.
  - `completedCount(p, puzzleIds: string[]): number`
  - `isStageUnlocked(p, puzzleIds: string[], id): boolean` — index 0 always, else the previous one is completed.
  - `isLevelUnlocked(p, levels: LevelMeta[], levelId, puzzleIdsByLevel: {[levelId]: string[]}): boolean` — first level always. Other levels: `available` and the previous level has `completedCount >= 40`.
- Produces (`storage.js`): `STORAGE_KEY = 'tashbetzon.progress'`, `loadProgress(storage = globalThis.localStorage): Progress`, `saveProgress(p, storage = globalThis.localStorage): boolean`. Every storage access is wrapped in try/catch. Parse or migration failure → `defaultProgress()`. `saveProgress` returns false on failure.

- [ ] **Step 1: Write failing tests:**
  - `defaultProgress().coins === 100`
  - `migrate(null)` and `migrate({version: 9})` return defaults. `migrate({version:1, coins:5})` keeps `coins === 5` and has `settings.autoCheck === false`.
  - `recordCompletion` first time with 0 reveals: `stars 3`, `coinsEarned 50`, and `newWords.length` equals the entry count. A replay with 0 reveals gives `coinsEarned 0`. A replay that improves from 1 to 3 stars gives `coinsEarned 20`. `bestMs` keeps the minimum.
  - `spendCoins` refuses an overdraft.
  - `isStageUnlocked`: first is true, second is false until the first is completed.
  - `isLevelUnlocked`: A2 is false with 39 A1 completions and true with 40 (pass A2 `available:true` in the fixture).
  - `load falls back to defaults when storage throws` (fake storage whose `getItem`/`setItem` throw → `loadProgress` returns defaults and `saveProgress` returns false)
  - `save then load round-trips` (in-memory fake storage)
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `"Add progress model and safe storage"`

---

### Task 5: A1 vocabulary (≥ 500 entries) with content rules

**Files:**
- Create: `content/vocab/a1.json`, `app/data/levels.json`
- Test: `tests/content/vocab.test.js`

**Interfaces:**
- Consumes: `answerProblems`, `answerLetters`, `wordLengths` (Task 1).
- Produces: `VocabEntry = {id:'a1-0001', en:string, he:string, level:'A1', topic:string, pos:'noun'|'verb'|'adj'|'adv'|'phrase'|'other', note:string|null}`.
  - `en` is lowercase. Verbs start with `'to '`.
  - `note` is a short English disambiguator shown after the clue, e.g. `'(noun)'`.
- Produces: `LevelMeta = {id, name, size, available, file?, worlds?: [{n, name, emoji, topics: string[]}]}`.
  - `levels.json` lists A1 (`available:true`, `size:11`, `file:'data/puzzles/a1.json'`) and its 5 worlds:

    | n | name | emoji | topics |
    |---|---|---|---|
    | 1 | צעדים ראשונים | 🌱 | `basics`, `numbers`, `colors`, `family` |
    | 2 | הבית שלי | 🏠 | `home`, `objects`, `time` |
    | 3 | אוכל ושתייה | 🍎 | `food` |
    | 4 | בעלי חיים וטבע | 🦁 | `animals`, `nature` |
    | 5 | אני והעיר | 🏙️ | `body`, `clothes`, `city`, `verbs`, `adjectives` |

  - Then A2 בסיסי (11), B1 בינוני (13), B2 בינוני-מתקדם (13), C1 מתקדם (15), C2 מומחה (15), all with `available:false`.
  - Stage→world mapping: stages 1–10 → world 1, …, 41–50 → world 5.

- [ ] **Step 1: Write the failing content test** `tests/content/vocab.test.js`:
  - every entry has all fields with the right types, and `level === 'A1'`
  - ids are unique and match `/^a1-\d{4}$/`
  - `answerProblems(he)` is `[]` for every entry (the failure message lists the offending ids)
  - `en` is unique within the file
  - `topic` ∈ the union of A1 world topics in `levels.json`
  - total ≥ 500; entries with `he.includes(' ')` ≥ 40; every A1 world topic has ≥ 15 entries
  - no `he` word appears in `FORBIDDEN_SPELLINGS = ['אמא', 'אימא', 'אוירון', 'אווירון']`. These are words with two common spellings: use `אם` and `מטוס`. Extend the list whenever proofreading finds another such word.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL (file missing).
- [ ] **Step 3: Write `content/vocab/a1.json`** in batches of ~100 entries, one topic group at a time, and run the test after each batch. Target counts:

  | topic | count | topic | count |
  |---|---|---|---|
  | basics | 50 | numbers | 30 |
  | colors | 15 | family | 40 |
  | home | 45 | objects | 40 |
  | time | 30 | food | 70 |
  | animals | 45 | nature | 40 |
  | body | 30 | clothes | 25 |
  | city | 35 | verbs | 60 |
  | adjectives | 50 | | |

  Multi-word phrases go under their natural topic (e.g. `{"en":"good morning","he":"בוקר טוב","topic":"basics","pos":"phrase"}`, `"bus stop"→"תחנת אוטובוס"`).

  Spelling rules (spec §2.3):
  - full spelling per the Academy of the Hebrew Language;
  - infinitives for verbs;
  - singular indefinite nouns;
  - masculine singular adjectives.

  Add a `note` whenever the English word has a second common meaning (e.g. `"lie"` → `"(noun)"`).
- [ ] **Step 4: Proofread pass.** Re-read every entry for translation accuracy and Academy spelling, and fix in place. Then run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `"Add A1 vocabulary (500+ entries) and level metadata"`

---

### Task 6: Crossword generator

**Files:**
- Create: `tools/generator/rng.js`, `lexicon.js`, `template.js`, `fill.js`, `validate.js`
- Test: `tests/generator/template.test.js`, `fill.test.js`, `validate.test.js`

**Interfaces:**
- Consumes: `computeSlots`, `slotCells` (Task 2), `answerLetters`, `wordLengths` (Task 1), `VocabEntry`, `LevelMeta` (Task 5).
- Produces:
  - `mulberry32(seed:number): () => number` (`rng.js`)
  - `buildLexicon(entries: VocabEntry[], level: string, levelOrder: string[]): Lexicon` (`lexicon.js`)
    - Includes entries whose level is ≤ `level` in `levelOrder`.
    - `Lexicon = {byLength: Map<number,string[]>, matching(len:number, pattern: Map<number,string>): string[], entriesFor(answer:string): VocabEntry[]}`
    - `answer` = `answerLetters(he)`. `matching` intersects precomputed `(len,pos,letter)` sets.
  - `makeTemplate(size:number, rng, {keep:number, maxLen:number}): boolean[][] | null` (`template.js`, `true` = block). Algorithm:
    1. Place a block at every (odd row, odd col) cell with probability `keep`, mirrored at `(size-1-r, size-1-c)`.
    2. While any white run is longer than `maxLen`: pick such a run at random and block a random interior cell at index `2..len-3`, with its mirror.
    3. Return `null` if any of these fail:
       - some white cell is in no run of length ≥ 2;
       - the white cells are not 4-connected;
       - some run is still longer than `maxLen`.
  - `fillTemplate(blocks, lexicon, rng, {nodeBudget:number, score:(answer:string)=>number}): string[] | null` (`fill.js`)
    - Returns `rows` as strings, with `'#'` for blocks.
    - Backtracking. Pick the unfilled slot with the fewest `matching` candidates. Try up to 40 candidates, ordered by `score(answer) + rng()*0.5`, descending.
    - Never uses the same answer twice. Gives up after `nodeBudget` calls.
  - `validatePuzzle(raw: RawPuzzle, vocabById: Map<string,VocabEntry>, {level, minWords, minWhite:0.6, minLevelShare:0.6}): string[]` (`validate.js`) — returns error strings. It checks:
    - `loadPuzzle(raw)` succeeds;
    - every entry's `vocabId` exists and `answerLetters(he) === answer`;
    - no duplicate answers;
    - white ratio ≥ `minWhite`;
    - `entries.length ≥ minWords`;
    - the share of entries with `vocab.level === level` ≥ `minLevelShare`;
    - blocks are 180°-symmetric;
    - white cells are connected.

- [ ] **Step 1: Write failing tests:**
  - `mulberry32(1)` produces the same first 3 values on two instances.
  - `makeTemplate(11, mulberry32(s), {keep:0.7, maxLen:6})` for seeds 1–20: every non-null result is symmetric and connected, has no run > 6, and every white cell is covered.
  - `fillTemplate` on a hand-made 5×5 template with a 30-word test lexicon (in the test file) returns rows where every slot's word is in the lexicon and no word repeats.
  - `validatePuzzle` returns `[]` for a valid hand-built fixture. It returns errors for each of: duplicate answer, asymmetric blocks, low white ratio, unknown `vocabId`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the five modules.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `"Add crossword template, filler and validator"`

---

### Task 7: Generate the 50 A1 puzzles

**Files:**
- Create: `tools/generator/generate.js`, `app/data/puzzles/a1.json` (generated output, committed)
- Test: `tests/puzzles/puzzles.test.js`

**Interfaces:**
- Consumes: everything from Task 6, `levels.json` and `content/vocab/*.json` (Task 5).
- Produces: CLI `node tools/generator/generate.js --level A1 --seed 1 [--count 50]`. It writes `{level, version:1, puzzles: RawPuzzle[]}` to the level's `file`. Puzzle ids are `A1-01`…`A1-50`, with `stage` 1..50 and `world = ceil(stage/10)`.
  - **Size options:** `{11:{keep:0.7,maxLen:6,minWords:40}, 13:{keep:0.7,maxLen:7,minWords:55}, 15:{keep:0.7,maxLen:7,minWords:70}}`.
  - **Score function:**
    - +2 if any entry for the answer has the puzzle's level;
    - +1 if any has a topic of the stage's world;
    - −0.5 × the number of times the answer was already used in this level.
  - **Entry choice for an answer:** prefer the current level, then the world topic, then the least-used `vocabId`.
  - **Retries:** per stage, retry new templates until `validatePuzzle` passes, at most 2,000 templates. If that fails, retry with `keep:0.85` (the "slightly less dense" fallback, spec §4) and print a warning naming the stage.
  - **Summary:** prints one line per level: puzzles, average entries, average white %, fallbacks used, seconds.

- [ ] **Step 1: Write the failing test** `tests/puzzles/puzzles.test.js`. For every level in `levels.json` with `available:true`, load its puzzle file and check:
  - there are exactly 50 puzzles with unique ids and stages 1..50;
  - `validatePuzzle(p, vocabById, {level, minWords:40, minWhite:0.6, minLevelShare:0.6})` returns `[]` for each;
  - `size` matches `levels.json`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL (file missing).
- [ ] **Step 3: Implement `generate.js`**, then run `npm run generate -- --level A1 --seed 1`. Expected: 50 puzzles, average entries ≥ 40, under ~5 minutes. Record the printed summary for the final report.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Spot-check** 3 random puzzles by rendering them with a throwaway script to ASCII in the terminal. Confirm they read as dense square crosswords.
- [ ] **Step 6: Commit** `"Generate A1 puzzles (50 stages)"`

---

### Task 8: App shell, router, home and map screens

**Files:**
- Create: `app/index.html`, `app/css/app.css`, `app/fonts/*`, `app/js/main.js`, `app/js/data.js`, `app/js/ui/dom.js`, `app/js/ui/history.js`, `app/js/ui/router.js`, `app/js/ui/screens/home.js`, `app/js/ui/screens/map.js`, `tools/serve.mjs`
- Test: `tests/ui/history.test.js`

**Interfaces:**
- Consumes: `loadProgress`/`saveProgress` (Task 4), progress unlock functions (Task 4), `LevelMeta` (Task 5).
- Produces:
  - `createHistory(): {push(name, params), back(): boolean, current(): {name, params}|null, depth(): number}` (`history.js`, pure). `back()` pops and returns true when depth > 1. At the root it returns false and leaves the stack unchanged.
  - `createRouter(root: HTMLElement, screens: {[name]: Screen}, ctx): {go(name, params), replace(name, params), back(): boolean}` (`router.js`). `Screen = {render(ctx, params): HTMLElement, dispose?(): void}`. It sets `window.tashbetzonBack = () => router.back()`.
  - `ctx = {progress: Progress, levels: LevelMeta[], save(): void, router, data}`, where `data = {loadLevelPuzzles(levelId): Promise<RawPuzzle[]>}` (`data.js`, fetch + cache).
  - `h(tag, attrs?, ...children): HTMLElement` (`dom.js`). `attrs` supports `class`, `on<Event>` and `dataset`.
  - `tools/serve.mjs`: static server for `app/` on the `PORT` env or 8080, with correct MIME types for `.js`, `.json`, `.woff2`, `.webmanifest`.

- [ ] **Step 1: Write the failing test** `tests/ui/history.test.js`:
  - `history back returns false at root`: after one push, `back()` is false and `depth()` is 1;
  - after 3 pushes, `back()` is true and `current()` is the second screen.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `history.js`, then the shell.**
  - Download the Rubik Hebrew and Latin `woff2` subsets: read the `@font-face` blocks from `https://fonts.googleapis.com/css2?family=Rubik:wght@400..800&display=swap` and fetch each `src` from fonts.gstatic.com. Download `OFL.txt` from the google/fonts repository (`ofl/rubik/OFL.txt`). Declare the fonts with `@font-face` in `app.css`.
  - `app.css`: tokens from Global Constraints and the mockup layout. Phone-first, `max-width: 480px` centered column, safe-area padding, `dir="rtl"` on `<html>`.
  - **home.js:**
    - top pills: coins;
    - title "תשבצון" with the subtitle "לומדים אנגלית דרך תשבצים";
    - "ממשיכים מאיפה שעצרת" card: `lastPlayed` stage, or A1 stage 1, with the level progress bar `completed/50`;
    - primary button "▶ שחק עכשיו" → game screen for that stage;
    - cards "המילים שלי" (count) and "הגדרות".
  - **map.js:**
    - level pills A1–C2. Unavailable or locked pills are dimmed and labelled "בקרוב" or "🔒".
    - For the selected level: 5 world banners (name, emoji, topics in Hebrew), each followed by a snake path of 10 stage nodes. Node states: done (with stars), current (accent), locked.
    - Tapping an unlocked node → game screen.
- [ ] **Step 4: Run** `npm test`. Expected: PASS. Then run `npm run serve` and load `http://localhost:8080` with a quick Playwright script at 390×844. Expected: home and map render with no console errors. Look at the screenshot.
- [ ] **Step 5: Commit** `"Add app shell, router, home and level map"`

---

### Task 9: Game screen (board, zoom/pan, keyboard, clues, hints, autosave)

**Files:**
- Create: `app/js/ui/viewport.js`, `app/js/ui/gestures.js`, `app/js/ui/board.js`, `app/js/ui/minimap.js`, `app/js/ui/keyboard.js`, `app/js/ui/clue-bar.js`, `app/js/ui/clue-list.js`, `app/js/ui/screens/game.js`
- Test: `tests/ui/viewport.test.js`

**Interfaces:**
- Consumes: `Game` (Task 3), `loadPuzzle` (Task 2), `displayLetter` (Task 1), `HINT_COST`, `spendCoins`, `recordCompletion` (Tasks 3–4), `ctx` (Task 8).
- Produces (`viewport.js`, pure). `T = {scale, x, y}`, `Dims = {viewW, viewH, contentW, contentH}`.
  - `clampTransform(t:T, d:Dims): T` — scale clamped to [1, 3]. On each axis: if the scaled content is smaller than the view, center it; else keep the content edges outside the view edges.
  - `zoomAt(t:T, factor:number, px:number, py:number, d:Dims): T` — the content point under `(px,py)` stays under it, then clamp.
  - `ensureVisible(t:T, rect:{x,y,w,h}, d:Dims, margin=12): T` — `rect` is in unscaled content coordinates. Minimal pan so the rect is inside the view with the margin, then clamp.
- Produces (`board.js`): `createBoard(game: Game, {onTap(row,col)}): {el: HTMLElement, update(): void, reveal(cells), setWrong(cells)}`.
  - CSS grid with `direction: rtl`, so col 0 renders at the right.
  - Cell classes: `block`, `cur`, `word`, `solved`, `wrong`, `revealed`.
  - Each cell has a number label and a bar (thick border on the left side for across, bottom for down).
  - Letters use `displayLetter(fill, cell.finalForm)`.
- Produces (`keyboard.js`): `createKeyboard({onLetter(ch), onErase(), onHint()}): HTMLElement`.
  - Rows: `'קראטוןםפ'`, `'שדגכעיחלךף'`, `'זסבהנמצתץ'`, plus ⌫ and 💡.
  - Also listens to physical `keydown`: Hebrew letters, Backspace, and arrow keys move between entries.
- Produces: `clue-bar.js` → `createClueBar({onSpeak, onPrev, onNext}): {el, set(entry: Entry)}`.
  - Shows `num`, the arrow (← for across, ↓ for down), "מאוזן"/"מאונך", the English clue uppercased + note, and the word lengths `(3,3)`.
- Produces: `clue-list.js` → `createClueList(game, {onPick(index)}): {el, open(), close(), update()}`. It's a bottom sheet with tabs מאוזן/מאונך, and solved entries struck through.
- Produces: `minimap.js` → `createMinimap(game): {el, update(t: T, d: Dims)}`.
  - A tiny grid in the board's top corner: green for solved, accent for the current entry.
  - Includes a white rectangle showing the visible area.
  - Hidden while `t.scale < 1.2`.

- [ ] **Step 1: Write the failing test** `tests/ui/viewport.test.js` (dims: view 350×380, content 600×600):
  - `clampTransform({scale:5,...})` gives `scale === 3`.
  - At scale 1, content 300×300 centers at `x === 25`.
  - `zoomAt` keeps the point under `(175,190)` fixed: compare content coordinates before and after.
  - `ensureVisible` of a rect already inside returns the same `x,y`. A rect at the far left edge produces `x` such that the rect's screen x ≥ 12.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `viewport.js`.** Run `npm test`. Expected: PASS.
- [ ] **Step 4: Implement the gestures and components:**
  - **gestures.js:** one pointer = pan, after an 8px move threshold, so taps still select. Two pointers = pinch via `zoomAt` around the midpoint. Apply the transform with `transform: translate() scale()` on the board element.
  - **Components:** `board.js`, `minimap.js`, `keyboard.js`, `clue-bar.js` and `clue-list.js`, each per its Interfaces entry.
- [ ] **Step 5: Implement `screens/game.js`.** Layout from the mockups, top to bottom:
  1. header: ✕ → back, stage title, 📋 → clue list;
  2. progress bar `solved/total`;
  3. board viewport;
  4. clue bar;
  5. hint row: "בדוק מילה" (free), "גלה אות 10🪙", "גלה מילה 30🪙";
  6. keyboard.

  Behavior:
  - **Hints:** spend coins via `spendCoins`. If coins are short, show an inline message "אין מספיק מטבעות". Never call `alert`.
  - **autoCheck setting:** mark wrong letters after each keystroke.
  - **Vibration:** when `settings.vibrate` is on, call `navigator.vibrate?.(30)` on a wrong check and `navigator.vibrate?.([40,60,40])` on completion.
  - **Selection:** after each change, `ensureVisible` the current entry when zoomed.
  - **Autosave:** `progress.inProgress[id] = game.toJSON()` and `lastPlayed = id`. Debounced 500ms, and also on `visibilitychange`/`pagehide`.
  - **Timer:** `elapsedMs` accumulates only while the document is visible.
  - **Completion:** when `isComplete()`, call `recordCompletion`, save, and `router.replace('complete', {...result, puzzleId})`.
- [ ] **Step 6: Manual check** with Playwright at 390×844, `hasTouch`:
  - open A1-01, tap a cell, type with the on-screen keyboard;
  - simulate a pinch with two-pointer `dispatchEvent` and verify the board's scale changes;
  - take a screenshot.

  Expected: no console errors, and letters appear RTL in the right cells.
- [ ] **Step 7: Commit** `"Add game screen with zoomable board, Hebrew keyboard, clues and hints"`

---

### Task 10: Completion, word book, settings, speech

**Files:**
- Create: `app/js/ui/screens/complete.js`, `app/js/ui/screens/words.js`, `app/js/ui/screens/settings.js`, `app/js/speech.js`
- Test: `tests/ui/speech.test.js`

**Interfaces:**
- Consumes: `ctx` (Task 8), `recordCompletion` result shape (Task 4).
- Produces (`speech.js`): `speak(text: string, {enabled}): boolean`.
  - Uses `globalThis.AndroidBridge.speak(text)` if present. Else `speechSynthesis` with `lang='en-US'`, `rate=0.9`. Else returns false.
  - It never throws, and does nothing when `enabled === false`.

- [ ] **Step 1: Write the failing test** `tests/ui/speech.test.js`:
  - with a fake `globalThis.AndroidBridge`, `speak('dog', {enabled:true})` calls it with `'dog'` and returns true;
  - with `enabled:false` it returns false and doesn't call it;
  - with no bridge and no `speechSynthesis` it returns false.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL. **Step 3: Implement `speech.js`.** **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Implement the screens:**
  - **complete.js:** stars (animated fill), title "כל הכבוד!", time `m:ss`, `+coins`, and the count of new words. Lists the puzzle's words as `EN — עברית — 🔊`. Buttons: "שלב הבא" (if unlocked and it exists), "שחק שוב" (clears `inProgress` for that id), "למפה".
  - **words.js:**
    - search box that matches `en` or `he`;
    - level filter pills;
    - rows `en / pos·level / he`, newest first;
    - tapping a row speaks the English word;
    - empty state "עוד לא נפתרו מילים".
  - **settings.js:**
    - toggles for "השמעה", "רטט", and "בדיקה אוטומטית" (with a one-line Hebrew explanation each);
    - "איפוס התקדמות" button. The first tap turns it into "לחץ שוב לאישור" for 4 seconds, and the second tap resets to `defaultProgress()`;
    - version line "גרסה 0.1.0".
- [ ] **Step 6: Commit** `"Add completion screen, word book, settings and speech"`

---

### Task 11: End-to-end smoke test with screenshots

**Files:**
- Create: `tests/e2e/smoke.mjs`

**Interfaces:**
- Consumes: `tools/serve.mjs` (Task 8), `app/data/puzzles/a1.json` (Task 7), the DOM from Tasks 8–10.
  - Required DOM hooks (add them in Tasks 8–10 if missing): `data-screen="<name>"` on each screen root, `data-cell="r,c"` on board cells, `data-key="<letter>"` on keyboard keys, `data-stage="<id>"` on map nodes, and `data-action="play|next|map"` on buttons.

- [ ] **Step 1: Write `smoke.mjs`:**
  1. Start `serve.mjs` on a free port.
  2. Launch Chromium with `{viewport: {width:390, height:844}, hasTouch:true, isMobile:true, deviceScaleFactor:2}`.
  3. Go: home → `[data-action=play]` → game screen for A1-01.
  4. For every entry: click its first cell (twice if needed to set the dir), then click `data-key` for each letter. For a cell whose answer is a final-capable letter at a word end, use the final key (exercises the normalization). Skip cells already filled by crossings.
  5. Expect the `complete` screen with 3 stars.
  6. Reload the page. Expect home to show 1/50, and the map to show A1-02 unlocked.
  7. Screenshot home, map, game (mid-solve), clue list, complete, words and settings to `test-results/screens/`.
  8. Fail on any `console.error` or `pageerror`.
  9. Exit with code 0 or 1.
- [ ] **Step 2: Run** `npm run e2e`. Expected: "E2E PASS" and 7 screenshots. Look at every screenshot and fix layout issues found (RTL, overflow at 390px, text cut-off) in the owning files.
- [ ] **Step 3: Run** `npm test && npm run e2e`. Expected: both pass.
- [ ] **Step 4: Commit** `"Add end-to-end smoke test"` (screenshots are not committed; `test-results/` is ignored).

---

### Task 12: Android shell and debug APK  ⛔ requires G5 approval first

**Files:**
- Create: `android/settings.gradle`, `android/build.gradle`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/app/tashbetzon/MainActivity.java`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/res/drawable/ic_launcher_foreground.xml`, `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`, `android/app/src/main/res/values/colors.xml`
- Modify: `README.md` (add Android build and install instructions in Hebrew), `CLAUDE.md` (record the approved tools)

**Interfaces:**
- Consumes: the whole `app/` folder (copied into the APK assets as `www/`), and `speak` expecting `AndroidBridge.speak(String)` (Task 10). `window.tashbetzonBack()` returns a boolean (Task 8).

- [ ] **Step 0: Gate.** Ask the owner in Hebrew for **G5**, listing exactly what will happen:
  - add `dl.google.com` to the environment network allowlist (an environment approval prompt);
  - download Android SDK command-line tools, `platforms;android-35` and `build-tools;35.0.0` into `/opt/android-sdk`;
  - accept the Android SDK License on the owner's behalf;
  - let Gradle download Android Gradle Plugin 8.13.x and its dependencies from Google Maven and Maven Central.

  Cost: free. Risk: these are official Google packages, and the build only happens inside this cloud environment. **Stop until the owner approves in writing.**
- [ ] **Step 1: Install the SDK** (after approval).
  - Unzip the command-line tools to `/opt/android-sdk/cmdline-tools/latest`.
  - Run `yes | sdkmanager --licenses`, then `sdkmanager "platforms;android-35" "build-tools;35.0.0"`.
  - Write `android/local.properties` with `sdk.dir=/opt/android-sdk` (git-ignored).
- [ ] **Step 2: Write the Gradle project.**
  - Root: plugin `com.android.application` version `8.13.x` (the latest 8.13 patch on Google Maven).
  - `app/build.gradle`:
    - `namespace 'app.tashbetzon'`, `applicationId 'app.tashbetzon'`
    - `minSdk 24`, `targetSdk 35`, `compileSdk 35`
    - `versionCode 1`, `versionName '0.1.0'`
    - Java 17 source/target
    - a `copyWebApp` Copy task from `../../app` into `$buildDir/generated/webassets/www`, registered via `android.sourceSets.main.assets.srcDirs += "$buildDir/generated/webassets"`, with `preBuild.dependsOn copyWebApp`
    - output file name `tashbetzon-0.1.0-debug.apk`
- [ ] **Step 3: Write `MainActivity.java`** (`android.app.Activity`, no AndroidX):
  - **WebView settings:** `javaScriptEnabled`, `domStorageEnabled`; `allowFileAccess` false.
  - **Asset loading:** `WebViewClient.shouldInterceptRequest` serves `https://appassets.local/<path>` from `assets/www/<path>`. MIME types by extension: html, js, css, json, woff2, png, svg. Missing file → 404. Any other host → a blocked empty response.
  - **Load:** `https://appassets.local/index.html`.
  - **Speech:** `addJavascriptInterface(new Bridge(), "AndroidBridge")`. `Bridge.speak(String)` uses `TextToSpeech` with `Locale.US`, initialized in `onCreate` and shut down in `onDestroy`.
  - **Back button:** `onBackPressed` evaluates `window.tashbetzonBack && window.tashbetzonBack()`, and calls `finish()` when the result is not `"true"`.
  - **Window:** status bar color `#0f1530`, portrait orientation, `android:configChanges` for orientation/screenSize.
  - **Manifest:** no `<uses-permission>` at all, `android:allowBackup="true"`, label "תשבצון", adaptive icon (vector: 🧩-like puzzle glyph in accent on navy).
- [ ] **Step 4: Build.** Run `gradle -p android assembleDebug`. Expected: `BUILD SUCCESSFUL`. Copy the APK to `dist/tashbetzon-0.1.0-debug.apk`.
- [ ] **Step 5: Verify the APK:**
  - `aapt2 dump permissions dist/*.apk` shows no `android.permission.INTERNET`;
  - `aapt2 dump badging` shows `package: name='app.tashbetzon' versionName='0.1.0'` and `sdkVersion:'24'`;
  - `unzip -l` lists `assets/www/index.html` and `assets/www/data/puzzles/a1.json`.

  Record the outputs. The APK cannot be run here (no emulator). Say so in the report.
- [ ] **Step 6: Update `README.md`** with Hebrew install steps for the owner: download the APK, allow "התקנה ממקורות לא ידועים", install. Add a note that debug builds may require uninstalling before an update until M2's permanent key. Update `CLAUDE.md` with the approved tools.
- [ ] **Step 7: Run** `npm test && npm run e2e`. Expected: pass. **Commit** `"Add Android WebView shell and debug APK build"`.
- [ ] **Step 8: Deliver.**
  - Send the APK to the owner with SendUserFile.
  - Push the branch (requires the owner to have granted the Claude GitHub App access to `tashbetzon`).
  - Open a **draft** PR "Milestone 1: A1 playable + Android APK". The owner merges.
