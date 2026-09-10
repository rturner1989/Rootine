# TypeScript Wave 5 — Pages, Layouts and the App Shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the remaining 19 `src/` files — 13 pages, 4 layouts, `App` and `main` — retire the last two `z.unknown()` shim consumers, delete the shims, and close the deferred error-branch gap. After this wave, `client/src/` is fully TypeScript.

**Architecture:** Leaves first — pages and layouts are siblings, `App` composes both, `main` mounts `App`. Two deliberate behaviour commits ride alongside: the shim deletion and the missing `isError` branches.

**Tech Stack:** TypeScript 7, React 19, Zod 4, TanStack Query 5, React Router 7, Vite 8, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-09-typescript-migration-design.md`
**Prior waves:** #97 toolchain, #98 data layer + Zod, #99 primitives, #100 domain components. This branch stacks on #100.

## Global Constraints

- `strict: true`. No `@ts-ignore` (`@ts-expect-error` only, with a justifying comment). No bare `any` or `as unknown as X` without a comment explaining what the type system cannot express.
- **A conversion must not change runtime behaviour.** Eleven such bugs have been caught across four waves — a `className`/`variant` leak into `...kwargs`, a `??` narrowed to a ternary that stopped catching invalid keys, a lookup keyed by bare numbers, a dropped validity check, a catch-block narrowing. Check **both halves** in every file: no styling prop reaching the DOM via `...kwargs`, no DOM prop swallowed. **Record every `strict`-forced restructuring**, including trivial ones — the bar is disclosure, not significance.
- Be precise about "inert": if a change is unreachable rather than byte-equal, write "functionally inert" and say *why*.
- **This wave touches markup.** No `aria-*`, `role`, tab order or focus behaviour may change. `/accessibility` is in the gate.
- Never restate a type that exists: primitives export `ActionProps`, `CardProps`, `DialogProps`; `client/src/types/` holds every server shape.
- `...kwargs` is the project's rest-parameter name. Timer handles are `ReturnType<typeof setTimeout>`, never `number`.
- Use `git mv` for every rename.
- Do not convert test files — that is wave 6. Fixture edits are allowed where a change forces them; renames are not.
- There is a `stash@{0}` belonging to the repo owner. Do not touch the stash.
- `git add` explicit paths only — never `-A`, never `.`, never `-a`.
- Commit messages explain the why. No "Generated with Claude" footer, no `Co-Authored-By` trailer. PR title prefix `refactor(ts):`.
- Test baseline entering this wave: **806 tests across 116 files.**

## The three things that make this wave different

**1. `main.tsx` hits a `strict` landmine wave 1 predicted.**
`createRoot(document.getElementById('root'))` returns `HTMLElement | null`. A non-null assertion (`!`) is forbidden by Biome's `noNonNullAssertion`. Use an explicit guard that throws with a message naming the missing element — if `#root` is absent the app cannot start, and a clear error beats a cryptic one from React's internals.

**2. `index.html` must be updated in the same commit as `main`.**
It hardcodes `<script type="module" src="/src/main.jsx">`. Renaming `main.jsx` without updating it produces a blank page that no test catches — the unit suite never loads `index.html`, and Vite's dev server will happily 404 the module. Playwright is the only thing that would notice, and only if it runs after the rename.

**3. Deleting the shims is the wave's point, not a side effect.**
`apiGet` / `apiPost` / `apiPatch` / `apiDelete` in `client/src/api/client.ts` pass `z.unknown()` and validate nothing. Wave 2 kept them for five consumers; waves 4 retired three. The last two are `pages/auth/ForgotPassword.jsx` (`apiPost`) and `pages/auth/ResetPassword.jsx` (`apiPatch`). Once those move to `request(path, schema)`, **the four shims must be deleted outright** — this is the last chance, and a shim with no consumers is exactly the kind of thing that survives forever.

## Task order

| Task | Scope | Files |
|---|---|---|
| 1 | `pages/` (13) + the last two shim migrations | 13 |
| 2 | `layouts/` (4), `App`, `main`, `index.html` | 6 |
| 3 | Delete the shims; add the deferred `isError` branches | — |
| 4 | Gate + PR | — |

---

### Task 1: `pages/` (13 files) + the last two shim migrations

**Files:** `Today`, `House`, `Plant`, `Journal`, `Me`, `Welcome`, `NotFound`, `encyclopedia/Encyclopedia`, `encyclopedia/SpeciesDetail`, `auth/Login`, `auth/Register`, `auth/ForgotPassword`, `auth/ResetPassword`.

**Available to import:** every component (`components/` is fully `.tsx` after wave 4), every primitive, every hook and context, and `client/src/types/`.

- [ ] **Step 1: Convert all 13.** `Plant.jsx` already had a one-line call-site fix in wave 4 (`imageUrl=` rather than `species=` on `plants/Avatar`) — leave that as-is.

- [ ] **Step 2: `Encyclopedia.jsx` already has `isError` branches** added in wave 4 as a behaviour commit. Convert the file; do not restructure that logic.

- [ ] **Step 3: Migrate the last two shim consumers.** `ForgotPassword` calls `apiPost('/api/v1/password_resets', …)`; `ResetPassword` calls `apiPatch('/api/v1/password_resets/${token}', …)`. Move both to `request(path, schema)`.

**Read `api/app/controllers/api/v1/password_resets_controller.rb` for the real response shapes.** Wave 2 added a `passwordUpdateResponseSchema`; check whether it fits, and if not add what's needed to the right file under `client/src/types/` rather than declaring a local type. Note that error branches on these endpoints are 422s that `request()` already maps to `ValidationError` before any parse runs.

- [ ] **Step 4: Verify** — `npm run typecheck` exit 0; `npm run test:unit` at **806/116**; `npm run build` exit 0.

- [ ] **Step 5: Two commits** — the conversion, then the shim migration separately (it changes what happens on a malformed response).

---

### Task 2: `layouts/` (4), `App`, `main`, `index.html`

**Files:** `layouts/{AppLayout,AuthLayout,OnboardingLayout,SiteLayout}.jsx`, `App.jsx`, `main.jsx`, `index.html`.

- [ ] **Step 1: Layouts first**, then `App`, then `main` — `App` composes the layouts and pages, `main` mounts `App`.

- [ ] **Step 2: `App.tsx` is the route table and provider tree.** Type the route definitions against React Router 7's own types; do not restate them. Preserve the provider nesting order exactly — it is load-bearing (`AuthProvider` must wrap anything reading auth, `ToastProvider` anything toasting).

- [ ] **Step 3: `main.tsx`'s root lookup needs a guard, not an assertion.**

```ts
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('…')
createRoot(rootElement).render(…)
```

Biome forbids `!`. Write a message that names what is missing and where it should be.

**Preserve the iOS PWA resize workaround verbatim** — the `window.addEventListener('load', …)` dispatching a synthetic resize. Its comment explains a real WebKit bug; both stay.

- [ ] **Step 4: Update `index.html`'s script src to `/src/main.tsx` in this same commit.** Renaming `main` without it produces a blank page that the unit suite cannot catch.

- [ ] **Step 5: Verify** — typecheck, tests at 806/116, build. **Then `docker compose restart client` and load the app in a browser or via Playwright** — this is the one change in the migration where a green unit suite proves nothing about whether the app boots.

- [ ] **Step 6: Commit.**

---

### Task 3: Delete the shims; close the error-branch gap

Two separate behaviour commits.

- [ ] **Step 1: Delete `apiGet`, `apiPost`, `apiPatch`, `apiDelete` from `client/src/api/client.ts`**, along with any now-unused imports.

`grep -rn "apiGet\|apiPost\|apiPatch\|apiDelete" client/src` must return nothing afterwards. If a consumer remains, that is a finding — report it rather than keeping the shim alive.

Check `client/tests/` too: a test mocking the shims will break, and the fixture fix is in scope even though test *conversion* is not.

- [ ] **Step 2: Add the missing `isError` branches.**

The spec deferred these to "the wave that converts each component". Wave 4 converted them but fixed only `Encyclopedia`, so the gap is still open in: `components/organiser/AchievementsWidget`, `components/NotificationsDrawer`, `components/notifications/NotificationsTrigger`, `components/organiser/WeatherWidget`, `components/today/StreakStat`.

Each does `data?.x ?? []` or `?? null` with no `isError` branch, so a failed request renders an empty state — "nothing here" rather than "something went wrong". Wave 2 made that materially more reachable by adding schema validation.

**Follow the pattern `Today`, `House`, `Me`, `Plant` and `Journal` already use** — read one first. Reuse `ErrorState` / `WidgetError`; do not invent a new shape. These are widgets inside a dashboard, so a full-page error state is likely wrong — `WidgetError` exists for this.

Add a test per widget proving the error state renders on a failed query, and **prove each fails without the fix**.

- [ ] **Step 3: Verify** — typecheck, tests (report the new count), build, and the shim grep.

---

### Task 4: Gate and PR

- [ ] **Step 1: `docker compose restart client` FIRST.** The dev server holds the pre-rename module graph; a stale one makes every Playwright spec fail with a blank `#root`. This wave renames `main`, so it matters more than usual.
- [ ] **Step 2: Full suite** — `./scripts/run_tests.sh`. API 481/481, client 806+/116, Playwright 54/54.
- [ ] **Step 3: Type-check and build** — both exit 0.
- [ ] **Step 4: Comment audit** — `git diff refactor/typescript-wave-4-components...HEAD -- client/`. A comment must carry a constraint the code cannot express.
- [ ] **Step 5: Review triad** — `/accessibility` and `/react-best-practices` both apply. `/dhh-rails-reviewer` skip with reason: no Rails change.
- [ ] **Step 6: Lint last** — `./scripts/lint.sh`. Bundler Audit's pre-existing gem CVE failure is out of scope. **Commit any Biome auto-fix, then re-run the gate over it** — wave 3 shipped a red PR because fixes landed after its gate and lint never re-ran.
- [ ] **Step 7: Four hard checks**, each a required output:
  - `find client/src -name '*.js' -o -name '*.jsx'` → nothing. `src/` is fully TypeScript.
  - `grep -rn "apiGet\|apiPost\|apiPatch\|apiDelete" client/src` → nothing.
  - `grep -n "main.tsx" client/index.html` → matches.
  - The app boots in a browser after `docker compose restart client`.
- [ ] **Step 8: PR** — base `refactor/typescript-wave-4-components`, title `refactor(ts): convert pages, layouts and the app shell`. Do not open it until the whole-branch review has run, and **confirm CI actually goes green** rather than assuming.

---

## Self-Review

**Spec coverage:** the spec's wave 5 row is `layouts/` 4, `pages/` 13, `App`, `main`, `index.html` — 19 files, all covered by Tasks 1–2. The spec's wave-5 deliverable "migrate ForgotPassword + ResetPassword off the shims, then DELETE apiGet/apiPost/apiPatch/apiDelete" is Task 1 Step 3 plus Task 3 Step 1. The deferred error branches, recorded in the spec against wave 4d and not closed there, are Task 3 Step 2.

**Placeholder scan:** every step names its files and its specific decision. The patterns are settled by four prior waves and documented in CLAUDE.md.

**Type consistency:** primitives and domain types come from earlier waves; this wave adds no new domain shape except whatever the password-reset endpoints need, which Task 1 handles by adding to `client/src/types/`.

**Known risk:** `index.html` and `main` must move together, and no unit test covers that pairing. Task 2 Step 5 and Task 4's fourth hard check both exist to catch it — a green suite over a blank page is the specific failure this wave is most exposed to.
