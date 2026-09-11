# TypeScript Wave 4 — Domain Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 110 domain components under `client/src/components/` to TypeScript, consuming the primitives and schemas the previous three waves established, and retire three transitional debts on the way.

**Architecture:** Four sequential sub-waves, ordered by the real import graph. `plants/` is the most depended-upon domain folder — `journal`, `onboarding`, `spaces` and `today` all import from it — so it converts early. Root components (`Logo`, `ProgressRing`, `WeatherIcon`) feed `auth` and `today` and convert first.

**Tech Stack:** TypeScript 7, React 19, Zod 4, TanStack Query 5, Motion 12, Tailwind v4, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-09-typescript-migration-design.md`
**Prior waves:** #97 (toolchain), #98 (data layer + Zod), #99 (51 primitives). This branch stacks on #99.

## Global Constraints

- `strict: true`. No `@ts-ignore` (`@ts-expect-error` only, with a justifying comment). No bare `any` or `as unknown as X` without a comment explaining what the type system cannot express.
- **A conversion must not change runtime behaviour.** This migration has produced nine conversion-introduced logic bugs across three waves, every one caught only because it was diffed. Check **both halves** in every file: a prop consumed for styling must not also reach the DOM via `...kwargs`, and a prop that should reach the DOM must not be swallowed. Record every `strict`-forced restructuring in your report with equivalence reasoning, whether or not you believe it equivalent.
- **This wave touches markup.** Do not change any `aria-*` attribute, `role`, tab order, or focus behaviour. If typing pressures you toward changing one, stop and report. `/accessibility` is in the gate.
- Never hand-write a type that restates a Zod schema — import from `client/src/types/` and derive with `z.infer`. Never restate a subset of a primitive's props — import `ActionProps`, `CardProps`, `DialogProps` and inherit.
- `...kwargs` is the project's rest-parameter name. Keep it.
- `.tsx` for every file — all contain JSX.
- Use `git mv` for every rename.
- Do not convert pages, layouts, `App`, `main`, or any test file. Test *fixture* edits are allowed if validation exposes them as invalid; conversions are not.
- `client/src/components/plants/QuickDialog.jsx` has an unrelated uncommitted modification belonging to the repo owner. Do not stage, commit, revert, **or stash** it. There is a `stash@{0}` belonging to them; do not touch the stash.
- `git add` explicit paths only — never `-A`, never `.`, never `-a`.
- Commit messages explain the why. No "Generated with Claude" footer, no `Co-Authored-By` trailer. PR title prefix `refactor(ts):`.
- Test baseline entering this wave: **802 tests across 115 files.**

## The two facts that shape this wave

**1. Order is dictated by the import graph, not by folder alphabetics.**
Props inferred from an unconverted `.jsx` are inferred *strictly*, not as `any`, so converting a consumer before its dependency produces `TS2741: Property is missing` on props that are optional in practice. The fix is never to loosen the consumer. The measured cross-folder edges:

```
auth/AuthBody, auth/AuthMarketing   ← Logo            (root)
today/StreakStat                    ← ProgressRing    (root)
today/WeekStrip                     ← WeatherIcon     (root)
today/Highlights, PlantsRow,
  StartJungleDialog                 ← plants/
spaces/ListView                     ← plants/
journal/Entry                       ← plants/
onboarding/Step2Spaces              ← spaces/
onboarding/Step3Plants              ← plants/
```

Root first, then `plants/`, then everything that depends on them.

**2. Three transitional debts die in this wave or the next, and they are the reason two of them exist at all.**
Wave 2 kept `apiGet`/`apiPost`/`apiPatch`/`apiDelete` in `api/client.ts` passing `z.unknown()` — they validate nothing. Exactly three consumers remain in this wave's scope, and two more in wave 5. Each must move to `request(path, schema)` as its file converts. See the per-task steps.

## Sub-wave order

| Task | Scope | Files | Notes |
|---|---|---|---|
| 1 | `components/` root (13) | 13 | `Logo`, `ProgressRing`, `WeatherIcon` unblock `auth` and `today`. Includes the `AchievementsListener` cable fix. |
| 2 | `plants/` (14) | 14 | Most depended-upon domain folder. Includes one shim migration. |
| 3 | `today/` (11), `auth/` (4), `search/` (2), `notifications/` (2), `organiser/` (3) | 22 | All unblocked by Tasks 1–2. Includes one shim migration. |
| 4 | `spaces/` (14), `onboarding/` (11) | 25 | `onboarding` imports `spaces`; convert `spaces` first. Includes one shim migration. |
| 5 | `journal/` (18), `encyclopedia/` (9), `me/` (9) | 36 | Includes the encyclopedia error-branch fix. |
| 6 | Gate + PR | — | `/accessibility` and `/react-best-practices` both apply. |

Tasks 3 and 4 are independent of each other once Task 2 lands and **may run concurrently in isolated worktrees**.

**Worktree warning — this has failed four times in a row.** Worktrees get created from `main`'s tip regardless of the intended branch. Every worktree dispatch must instruct the agent to verify its base commit first and fast-forward if wrong; each of the four incidents was caught only because the agent checked.

---

### Task 1: `components/` root (13 files) + the cable fix

**Files:** `AchievementsListener`, `AchievementSplash`, `Dock`, `Journal`, `LandscapeLock`, `Logo`, `MobileTopBar`, `NotificationsDrawer`, `OrganiserDrawer`, `ProgressRing`, `ProtectedRoute`, `Sidebar`, `SpaceCard`.

**Convert `Logo` and `ProgressRing` first** — `auth/` and `today/` depend on them in later tasks.

- [ ] **Step 1: Convert the 13 files**, importing primitive prop types rather than restating them. `Sidebar`, `Dock` and `MobileTopBar` are navigation chrome carrying real a11y wiring — type it, do not restructure it.

- [ ] **Step 2: Fix the unvalidated cable payload in `AchievementsListener.tsx`**

This is a required deliverable, tracked in the spec's wave 4a row. The component reads `achievement.emoji` and `achievement.label` straight off an ActionCable push with no validation (line ~33, ~36). The payload is `Achievement#as_json`, which `achievementSchema` (`client/src/types/achievement.ts`) already models.

**Use `safeParse`, not `parse`.** A bare `.parse()` inside a subscription callback throws in an unhandled async handler and kills both the toast and the `invalidateQueries` that follows — strictly worse than the bad copy it replaces. On success, render from the parsed value. On failure, skip the toast and log, but keep `invalidateQueries` **unconditional** so the bell and achievements list still refresh through the already-validated REST path.

That is the pattern `NotificationsContext.tsx` already uses: treat a push as a signal, read the data back through a validated fetch.

- [ ] **Step 3: Verify** — `npm run typecheck` exit 0; `npm run test:unit` at **802/115**, no test file changed; `npm run build` exit 0.

- [ ] **Step 4: Commit.** Two commits: the conversion, then the cable fix separately — the latter is a behaviour change and must be legible as one in a PR that is otherwise conversion.

---

### Task 2: `plants/` (14 files) + one shim migration

**Files:** everything under `client/src/components/plants/`, including `QuickDialog.jsx` — **whose working-tree modification belongs to the repo owner.** Convert the file, but do not stage, revert, or stash their change; if `git mv` would disturb it, stop and report rather than improvising.

`journal/Entry`, `onboarding/Step3Plants`, `spaces/ListView` and three `today/` components import from here, so this folder gates Tasks 3–5.

- [ ] **Step 1: Convert the 14 files.** Import `Plant`, `Species`, `CareLog`, `PlantPhoto` from `client/src/types/`; import primitive prop types from `components/ui/` and `components/form/`.

- [ ] **Step 2: Migrate `StepDetails.tsx` off the `z.unknown()` shims.** It calls `apiGet`/`apiPost`. Move it to `request(path, schema)` with the real schema for whatever endpoint it hits — read the controller to confirm the response shape, and if no schema models it, add one to the right file under `client/src/types/` rather than declaring a local type.

- [ ] **Step 3: Verify and commit** — same three gates. Note in your report whether `QuickDialog`'s owner change survived untouched.

---

### Task 3: `today/`, `auth/`, `search/`, `notifications/`, `organiser/` (22 files) + one shim migration

May run concurrently with Task 4 in an isolated worktree.

- [ ] **Step 1: Convert.** `today/StreakStat` needs `ProgressRing` and `today/WeekStrip` needs `WeatherIcon`, both from Task 1. `today/Highlights`, `PlantsRow` and `StartJungleDialog` need `plants/` from Task 2. `auth/AuthBody` and `AuthMarketing` need `Logo`.

- [ ] **Step 2: Migrate `today/LocationButton.tsx` off the shims** — same treatment as Task 2 Step 2. It requests geolocation and posts coordinates; read the controller for the response shape.

- [ ] **Step 3: `auth/` still uses the older `Auth*`-prefixed file naming.** CLAUDE.md says migrate that opportunistically, not as a rule — **do not rename anything in this wave.** A rename bundled into a type conversion makes the diff unreviewable.

- [ ] **Step 4: Verify and commit.**

---

### Task 4: `spaces/` (14) + `onboarding/` (11)

May run concurrently with Task 3 in an isolated worktree.

- [ ] **Step 1: Convert `spaces/` first** — `onboarding/Step2Spaces` imports from it.

- [ ] **Step 2: Convert `onboarding/`.** `Step3Plants` imports from `plants/` (Task 2).

- [ ] **Step 3: Migrate `onboarding/Step3Plants.tsx` off the shims** — the last of the three in this wave. After it, only wave 5's two consumers remain.

- [ ] **Step 4: Every onboarding step wraps in a `<form>` even when it does not mutate.** That is deliberate — Enter-to-submit plus `type="submit"` for free. Do not "simplify" it.

- [ ] **Step 5: Verify and commit.**

---

### Task 5: `journal/` (18), `encyclopedia/` (9), `me/` (9) + the error-branch fix

- [ ] **Step 1: Convert.** `journal/Entry` imports from `plants/`. `journal/` has the deepest nesting in the wave (`calendar/`, `entries/`, `filter/` subfolders) — respect the existing structure, do not flatten it.

- [ ] **Step 2: Add the missing `isError` branches** — a required deliverable, tracked in the spec's wave 4d row.

`pages/encyclopedia/Encyclopedia.jsx` does `data?.species ?? []` with no `isError` branch, so a failed request renders "No species match those filters — try loosening a filter". The grouped view tells a user who has spaces to "Add a space to see recommendations". The same `?? []` / `?? null` pattern sits in `AchievementsWidget`, `NotificationsDrawer`, `NotificationsTrigger`, `WeatherWidget` and `StreakStat`.

This was pre-existing, but wave 2 made it materially more reachable: responses now throw on schema drift where they previously flowed through unvalidated. `Today`, `House`, `Me`, `Plant` and `Journal` already have proper `error` branches — follow their pattern rather than inventing one.

**`Encyclopedia.jsx` is a page, not a component**, so it is technically wave 5's file. Converting it is out of scope; **adding its `isError` branch is in scope** and lands as a separate behaviour commit. If that split proves awkward, report it rather than converting the page early.

- [ ] **Step 3: Verify and commit** — conversion and error-branch fix as separate commits.

---

### Task 6: Gate and PR

- [ ] **Step 1: `docker compose restart client` FIRST.** The Vite dev server holds the pre-rename module graph; a stale one makes every Playwright spec fail with a blank `#root`. This has cost a debugging cycle in two previous waves, and this wave renames 110 files.
- [ ] **Step 2: Full suite** — `./scripts/run_tests.sh`. API 481/481, client 802+/115, Playwright 54/54.
- [ ] **Step 3: Type-check and build** — both exit 0.
- [ ] **Step 4: Comment audit** — `git diff refactor/typescript-wave-3-primitives...HEAD -- client/`. A comment must carry a constraint the code cannot express. Report defects; do not delete unilaterally.
- [ ] **Step 5: Review triad** — `/accessibility` **and** `/react-best-practices` both apply; this wave touches markup and every component. `/dhh-rails-reviewer` skip with reason: no Rails change.
- [ ] **Step 6: Lint last** — `./scripts/lint.sh`. Bundler Audit's pre-existing gem CVE failure is out of scope. Commit any Biome auto-fix.
- [ ] **Step 7: Confirm the three shim migrations landed** — `grep -rn "apiGet\|apiPost\|apiPatch\|apiDelete" client/src/components` must return nothing. The shims themselves stay in `api/client.ts` for wave 5's two consumers.
- [ ] **Step 8: PR** — base `refactor/typescript-wave-3-primitives`, title `refactor(ts): convert the domain components`. Do not open it until the whole-branch review has run.

---

## Self-Review

**Spec coverage:** the spec's waves 4a–4d total 113 files; the measured count is 110 (`components/` has 110 `.jsx`, the spec's per-folder figures were estimates). Tasks 1–5 cover 13+14+22+25+36 = 110. Both spec deliverables land: the `AchievementsListener` cable fix (Task 1) and the encyclopedia error branches (Task 5). Three of the five `z.unknown()` shim consumers migrate here; wave 5 takes the last two and deletes the shims.

**Placeholder scan:** per-task instructions name each folder and its specific decisions rather than showing 110 files' bodies. The patterns are settled by waves 1–3 and documented in CLAUDE.md.

**Type consistency:** primitive prop types (`ActionProps`, `CardProps`, `DialogProps`) come from wave 3; domain types (`Plant`, `Species`, `CareLog`, `Achievement`) from wave 2's `client/src/types/`. Nothing in this wave declares a new domain shape except where a shim migration exposes an unmodelled endpoint, which Task 2 and Task 3 handle by adding to `types/`.

**Known risk:** the `TS2741` strict-inference trap. The task order is a topological sort of the measured import graph, not an assumption — the edges are listed above and were derived by grepping imports.
