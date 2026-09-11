# TypeScript Wave 6 — Tests, and Closing the Door

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 127 remaining test files, then narrow the test-runner globs and set `allowJs: false` — completing the migration and making it permanent.

**Architecture:** Vitest files first (113 + 1 helper), Playwright specs second (13), then the closing commit. The final step is the migration's only irreversible one.

**Tech Stack:** TypeScript 7, Vitest 4, Playwright 1.59, React Testing Library, React 19.

**Spec:** `docs/superpowers/specs/2026-09-09-typescript-migration-design.md`
**Prior waves:** #97 toolchain, #98 data layer + Zod, #99 primitives, #100 domain components, #101 pages and app shell. This branch stacks on #101.

## Global Constraints

- `strict: true`. No `@ts-ignore` (`@ts-expect-error` only, with a justifying comment). No bare `any` or `as unknown as X` without a comment explaining what the type system cannot express. **`client/src/` currently contains zero of any of these** — do not be the wave that reintroduces them, including in tests.
- **A conversion must not change what a test asserts.** Eleven behaviour bugs have been caught across five waves; in tests the equivalent failure is subtler and worse — a test that still passes while asserting less. Do not weaken, delete, skip, or make vacuous any assertion. If `strict` makes an assertion impossible to express, **stop and report** rather than loosening it.
- Record every restructuring in your report, including trivial ones. The bar is disclosure, not significance.
- `client/tests/` mirrors `client/src/` one-for-one. Preserve that structure exactly; do not move or rename beyond the extension.
- `.test.tsx` where the file contains JSX, `.test.ts` otherwise. Same rule for `.spec.ts`.
- Use `git mv` for every rename.
- There is a `stash@{0}` belonging to the repo owner. Do not touch the stash.
- `git add` explicit paths only — never `-A`, never `.`, never `-a`.
- Commit messages explain the why. No "Generated with Claude" footer, no `Co-Authored-By` trailer. PR title prefix `refactor(ts):`.
- Test baseline entering this wave: **817 tests across 121 files.** That count must not drop at any point.

## The two things that make this wave different from every other

**1. The payoff is narrower than the file count suggests — aim at the real one.**
RTL queries return `HTMLElement` regardless of typing, so most of these 95 component tests gain little from annotation alone. The genuine value is **typed `vi.mock` factories**: today a mock can silently diverge from the module it replaces, and that is not hypothetical — wave 5 found `Sidebar.test.jsx` and `MobileTopBar.test.jsx` mocking four functions their components never called while failing to mock the one they did. Where a file mocks a module, type the factory against the real module's shape so that drift becomes a compile error. That is the work worth doing carefully; the rest is mechanical.

**2. The final step fails silently — every other failure in this migration was loud.**
Narrowing Vitest's `include` to `.test.{ts,tsx}` and Playwright's `testMatch` to `.spec.ts` does **not** error on a straggler. A leftover `.test.jsx` simply stops being collected: the suite goes green with fewer tests and nothing says so.

So the closing task is gated on counts, not on a passing run. Details in Task 4.

## Task order

| Task | Scope | Files |
|---|---|---|
| 1 | `tests/components/` (77) | 77 |
| 2 | `tests/{hooks,utils,errors,pages,context,api}/` (36) + `helpers/onboarding.js` | 37 |
| 3 | Playwright specs (13), and resolve the dead `welcome.spec.js` | 13 |
| 4 | Narrow the globs, set `allowJs: false`, gate, PR | — |

Tasks 1 and 2 are independent and **may run concurrently in isolated worktrees**.

**Worktree warning — this has failed on every single attempt so far (six for six).** Worktrees get created from `main`'s tip regardless of the intended branch. Every worktree dispatch must instruct the agent to verify its base commit first and fast-forward if wrong; each incident was caught only because the agent checked.

---

### Task 1: `tests/components/` (77 files)

**Scope:** everything under `client/tests/components/` — `ui/` 28 (incl. `ui/errors/` 3), `plants/` 7, `me/` 7, `encyclopedia/` 5 (incl. `filter/` 1), `today/` 4 (incl. `week/` 1), `form/` 4, `wizard/` 2, `spaces/` 3 (incl. `list/`, `rooms/`), `journal/filter/` 1, `notifications/` 1, `organiser/` 1, plus the nine at `components/` root.

- [ ] **Step 1: Convert to `.test.tsx`.** These render components, so effectively all contain JSX.

- [ ] **Step 2: Type every `vi.mock` factory against the real module.** This is the task's actual value. A factory that returns fewer exports than the module has, or the wrong shape, should now fail to compile. Where a mock deliberately provides only a subset, say so in a comment naming why — that is a constraint the code cannot otherwise express.

- [ ] **Step 3: Do not weaken assertions.** If a `getByRole` or `toHaveBeenCalledWith` becomes awkward to type, the answer is a better type, not a looser assertion. Report anything you could not express.

- [ ] **Step 4: Verify** — `npm run typecheck` exit 0; `npm run test:unit` at **817 tests / 121 files exactly**; `npm run build` exit 0. **A dropped test count is a failure, not a rounding difference** — investigate before committing.

- [ ] **Step 5: Commit.**

---

### Task 2: `tests/{hooks,utils,errors,pages,context,api}/` + the helper (37 files)

**Scope:** `hooks/` 16, `utils/` 9, `errors/` 6, `pages/` 2, `context/` 2, `api/` 1, plus `client/tests/helpers/onboarding.js`.

- [ ] **Step 1: Convert.** `.test.ts` where there is no JSX (most of `utils/`, `errors/`, `api/`), `.test.tsx` where there is (`context/`, `pages/`, and any hook test using `renderHook` with a JSX wrapper).

- [ ] **Step 2: `helpers/onboarding.js` → `.ts`.** It is imported by Playwright specs, which Task 3 converts. Under `allowJs` this works either way today; after Task 4 it must be `.ts`.

- [ ] **Step 3: The hook tests are where typed mocks pay off most** — they mock `api/client`'s `request` heavily. Type those factories against the real signature: `request` is generic over a Zod schema, so a mock returning the wrong shape for a given schema should now be catchable.

- [ ] **Step 4: Verify** — same three gates, same exact count.

- [ ] **Step 5: Commit.**

---

### Task 3: Playwright specs (13) + the dead `welcome.spec.js`

- [ ] **Step 1: Convert the 12 real specs to `.spec.ts`.** They import `@playwright/test` explicitly, so they do not depend on the Vitest globals that `tsconfig`'s `types` array provides.

- [ ] **Step 2: Note a real trap.** `tsconfig.json`'s `types: ["node", "vitest/globals"]` puts `describe`/`it`/`expect` in global scope for every file under `include` — which covers `tests/`, and therefore covers Playwright specs too. **A converted `.spec.ts` that forgets `import { test, expect } from '@playwright/test'` will type-check clean and fail at runtime**, because it silently binds to Vitest's globals instead. Check every converted spec has its explicit import. This was flagged during wave 2 and is now live.

- [ ] **Step 3: Delete `tests/pages/welcome.spec.js`.** It is **zero bytes** and collects no tests. Converting it to `welcome.spec.ts` would preserve a false impression of coverage for `/welcome` — the app's most complex flow — in every future file listing.

Deleting is the honest move; it changes no behaviour, since an empty file runs nothing. Note in your report that onboarding has no E2E coverage, so it can be ticketed rather than silently lost.

- [ ] **Step 4: Verify** — typecheck, unit tests at 817/121, build, and `npx playwright test` at **54 passed**. The Playwright count must not drop either.

- [ ] **Step 5: Commit** — the conversion and the deletion as separate commits; one is mechanical, the other removes something.

---

### Task 4: Close the door

Three commits, and the most consequential steps in the migration.

- [ ] **Step 1: Establish the baseline before changing anything.** Record, from an actual run: the Vitest test count and file count, and the Playwright count. These are the numbers the narrowing must not change.

- [ ] **Step 2: Narrow the globs.**
  - `vite.config.ts` — `include: ['tests/**/*.test.{ts,tsx}']`
  - `playwright.config.ts` — `testMatch: '**/*.spec.ts'`
  - Update the transitional comments in both: they currently say wave 6b narrows this, which will no longer be pending.

- [ ] **Step 3: Set `allowJs: false` in `client/tsconfig.json`**, and remove `checkJs: false` — it is meaningless once no JS is allowed. This is what makes the migration permanent: a new `.jsx` file can no longer appear silently.

- [ ] **Step 4: The count gate — this is the step that matters.**

```bash
find client/tests -name '*.test.jsx' -o -name '*.test.js' -o -name '*.spec.js' | wc -l   # must be 0
find client -name '*.js' -o -name '*.jsx' -not -path '*/node_modules/*' -not -path '*/dist/*'
```

Then re-run both suites and **compare against Step 1's numbers**. Equal counts, or the narrowing silently dropped files. A green run proves nothing here — that is the entire hazard.

- [ ] **Step 5: Gate.**
  - `docker compose restart client` first.
  - `./scripts/run_tests.sh` — API 481/481, client 817/121, Playwright 54/54.
  - `npm run typecheck`, `npm run build` — both exit 0.
  - Comment audit over `git diff refactor/typescript-wave-5-pages...HEAD -- client/`.
  - `/react-best-practices` applies (test files are React code). `/accessibility` — skip with reason: no app markup changed. `/dhh-rails-reviewer` — skip, no Rails change.
  - `./scripts/lint.sh` last. **If Biome auto-fixes anything, commit it and re-run this gate** — wave 3 shipped a red PR because fixes landed after its gate.

- [ ] **Step 6: PR** — base `refactor/typescript-wave-5-pages`, title `refactor(ts): convert the test suites and disable allowJs`. Do not open it until the whole-branch review has run, and **confirm CI actually goes green** rather than assuming.

---

## Self-Review

**Spec coverage:** the spec's waves 6a and 6b are "Vitest tests" and "Playwright specs, then narrow the globs". Tasks 1–2 cover 6a (113 test files + the helper), Task 3 covers 6b's conversion, Task 4 covers the narrowing plus `allowJs: false` — which the spec implies ("`allowJs` stays on until wave 6b") but never states as a step. It is stated here.

**Placeholder scan:** each task names its directories, its file counts, and the specific decisions it faces. The conversion pattern is settled by five prior waves.

**Known risks, both named in-task:** the Vitest-globals trap that lets a Playwright spec type-check while binding to the wrong `test`, and the silent-drop hazard in the narrowing. The second is why Task 4 leads with recording a baseline rather than ending with a green run.
