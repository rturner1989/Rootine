# TypeScript Wave 3 — Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 51 general-purpose primitives — `components/ui/` (37 incl. `ui/errors/`), `components/form/` (8), `components/wizard/` (6) — to TypeScript, establishing the prop-typing patterns that ~250 domain components in waves 4 and 5 will consume.

**Architecture:** Convert in dependency order, leaves first. `Action`'s discriminated union is the wave's keystone: it is the most-consumed primitive and the only genuinely polymorphic one, and `ActionIcon` inherits rather than re-declares it. Everything else is prop-interface work of decreasing difficulty.

**Tech Stack:** TypeScript 7, React 19, Zod 4 (types only, no new schemas), Motion (Framer) 12, Tailwind v4, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-09-typescript-migration-design.md`
**Prior waves:** wave 1 PR #97 (toolchain), wave 2 PR #98 (data layer + Zod). This branch stacks on wave 2.

## Global Constraints

- `strict: true`. No `@ts-ignore` (`@ts-expect-error` only, with a justifying comment). No bare `any` without a comment; prefer `unknown` plus narrowing. `as unknown as X` needs the same justification as `any`.
- **A conversion must not change runtime behaviour.** Wave 2 saw five separate cases of a logic bug introduced while "just adding types" — a dropped validity check, a `??` narrowed to a ternary, a catch-block narrowing, incomplete hand-written wire types, and a rewritten filter parser. Every one was caught only because it was diffed. Where `strict` forces you to restructure rather than annotate, reason about equivalence for every input the old form accepted — including invalid and undefined ones — and record it in your report.
- **This wave touches markup, so `/accessibility` returns to the gate.** Do not change any `aria-*` attribute, `role`, tab order, or focus behaviour. If typing pressures you toward changing one, stop and report instead.
- `...kwargs` is the project's rest-parameter name (16 files use it). Keep it; type it against the element the props actually reach.
- Never hand-write a type restating a Zod schema — import from `client/src/types/` and derive with `z.infer`.
- `.tsx` for every file here — all 51 contain JSX.
- Use `git mv` for every rename so rename detection survives.
- Do not convert any domain component, page, hook, context, or test file. Fixture edits are allowed if a test breaks; conversions are not.
- Do not remove the `apiGet`/`apiPost`/`apiPatch`/`apiDelete` shims from `api/client.ts`.
- `client/src/components/plants/QuickDialog.jsx` has an unrelated uncommitted modification belonging to the repo owner. Do not stage, commit, revert, **or stash** it. There is a `stash@{0}` belonging to them; do not touch the stash.
- `git add` explicit paths only — never `-A`, never `.`, never `-a`.
- Commit messages explain the why. No "Generated with Claude" footer, no `Co-Authored-By` trailer. PR title prefix `refactor(ts):`.
- Test baseline entering this wave: **793 tests across 115 files.**

## The three facts that shape this wave

**1. Converting out of dependency order produces spurious errors that look like real bugs.**
Props inferred from an unconverted `.jsx` are inferred *strictly*, not as `any`. A `.tsx` consuming a `.jsx` component whose props have no defaults gets `TS2741: Property is missing` — for `ref`, `children`, anything optional-in-practice. The fix is never to loosen the consumer; it is to convert the dependency first. The task order below is a topological sort of the real import graph and must not be reordered.

**2. There is no `forwardRef` or `memo` anywhere in these 51 files.**
So none of the four compound components (`Card`, `Menu`, `FileTabs`, `SummarySlab`) *requires* `Object.assign` — expando assignment type-checks fine on a plain function base, and the claim that it doesn't was a documented error corrected in wave 1. CLAUDE.md still mandates `Object.assign` for uniformity, and that stands, but understand it as a consistency rule here rather than a necessity. Do not repeat the false premise in a comment.

**3. Eight files wrap components in Motion.**
`Dialog`, `DialogCard`, `Toast`, `Weather`, `Popover`, `RadialWheel`, `WizardCard`, `WizardTransition`. `Dialog` is `motion.create(Card)`, which must keep both `Card`'s props and Motion's. This is the second-hardest typing problem in the wave after `Action`.

## Task order (topological — do not reorder)

| Task | Files | Why here |
|---|---|---|
| 1 | `Action`, `Tooltip`, `ActionIcon` (3) | Keystone. Nothing else can convert cleanly first. |
| 2 | `Card`, `FileTabs`, `SummarySlab` (3) | Compound pattern; `Card` is the base of the whole overlay family. |
| 3 | 20 simple primitives + `ui/errors/` | No intra-wave deps beyond Tasks 1–2. |
| 4 | `form/` (8) | Only needs `FormField`, internal to the task. |
| 5 | Overlay + motion family (11) | Needs `Card`, `Action`, `Heading`. Hardest after Task 1. |
| 6 | `wizard/` (6) | `WizardDialog` needs `Dialog` from Task 5. |
| 7 | Gate + PR | — |

**Tasks 3 and 4 are independent of each other** and may run concurrently in separate worktrees. If you do, verify each worktree's base commit before dispatching — a wave 2 worktree was silently created from `main`'s tip instead of the intended branch, and only the agent noticing saved it.

---

### Task 1: `Action`, `Tooltip`, `ActionIcon` — the polymorphic keystone

**Files:** `client/src/components/ui/{Action,Tooltip,ActionIcon}.jsx` → `.tsx`

**Interfaces produced:** `ActionProps` (the discriminated union), `ActionVariant`, `ActionIconProps`, `ActionIconScheme`, `ActionIconSize`, `TooltipProps`. Every later task and wave imports these.

- [ ] **Step 1: Read all three files in full before typing anything**

`Action.jsx` branches on `to` / `href` / `disabled` and renders `Link`, `<a>`, `<span>` or `<button>`, spreading `...kwargs` onto whichever wins. Read every branch. `ActionIcon` forwards `ref` and `...kwargs` into `Action`. `Tooltip` wraps children and is consumed by both `ActionIcon` and `Badge`.

- [ ] **Step 2: Type `Tooltip` first** — it has no intra-wave dependencies, so it cannot be blocked by the other two.

- [ ] **Step 3: Give `Action` a discriminated union, not a widened prop bag**

```ts
type ActionVariant = 'primary' | 'secondary' | 'danger' | 'ghost-danger' | 'cta-card' | 'ghost' | 'unstyled'

type ActionBaseProps = {
  variant?: ActionVariant
  disabled?: boolean
  className?: string
  children?: ReactNode
  'aria-label'?: string
}

export type ActionProps =
  | (ActionBaseProps & { to: To; href?: never } & Omit<LinkProps, 'to' | 'className'>)
  | (ActionBaseProps & { href: string; to?: never; external?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>)
  | (ActionBaseProps & { to?: never; href?: never } & ButtonHTMLAttributes<HTMLButtonElement>)
```

The `to?: never` / `href?: never` members are what stop a caller passing both. Derive the exact `variant` members from `VARIANT_CLASSES`'s keys in the file — do not copy the list above without checking it.

**The `disabled` branches render a `<span>`, not the element the union describes.** Read how `...kwargs` is spread in those branches and type them so a caller passing button-only props to a disabled link is still rejected. If that proves impossible without contorting the union, say so in your report rather than widening it to `any`.

- [ ] **Step 4: `ActionIcon` inherits the union — it must not re-declare one**

It forwards `ref` and `...kwargs` into `Action`, so its props extend `ActionProps` rather than restating a subset. Derive `scheme` and `size` members from the file's own constants (`neutral`/`paper`/`ink`/`warning`/`danger`/`ghost`/`ghost-danger`; `xs`/`sm`/`md`).

- [ ] **Step 5: Verify**

```bash
cd client && npm run typecheck && npm run test:unit && npm run build
```

Baseline 793 tests / 115 files. `tests/components/ui/Action.test.jsx` covers this directly and must stay green with no test file changed.

- [ ] **Step 6: Prove the union actually discriminates**

Write a throwaway `.tsx` under `client/src/` that calls `<Action to="/x" href="/y" />` and confirm `tsc` rejects it; then one passing a button-only prop alongside `to` and confirm that is rejected too. Delete the file. **Report both results** — a union that compiles both ways is not doing its job, and nothing else in the suite would catch that.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/Action.tsx client/src/components/ui/ActionIcon.tsx client/src/components/ui/Tooltip.tsx
git commit -m "refactor(ts): type Action as a discriminated union

Action renders Link / <a> / <button> by branch, so a single widened prop bag
would let a caller pass both \`to\` and \`href\` and silently drop one. The
\`to?: never\` / \`href?: never\` members make that a compile error.

ActionIcon inherits the union rather than restating a subset — a second
declaration is the drift this migration exists to remove."
```

---

### Task 2: `Card` and the compound-component pattern

**Files:** `client/src/components/ui/{Card,FileTabs,SummarySlab}.jsx` → `.tsx`

**Interfaces produced:** `CardProps`, `CardHeaderProps`, `CardBodyProps`, `CardFooterProps`, `CardMetaProps`. `Card` is the base of the entire overlay family in Task 5 and of `WizardCard` in Task 6.

- [ ] **Step 1: Type `Card` and its four sub-components**

`Card.Header`, `.Body`, `.Footer`, `.Meta`. Per CLAUDE.md, export via `Object.assign`:

```ts
export default Object.assign(Card, { Header, Body, Footer, Meta })
```

As noted above, `Card` is a plain function so expando assignment would also type-check — `Object.assign` is for uniformity with any future `forwardRef`-based compound. Do not write a comment claiming expando assignment is an error; it isn't, and CLAUDE.md was corrected on exactly that point.

- [ ] **Step 2: Respect the no-default-padding rule**

CLAUDE.md: Card slots have no default padding; `Card.Body` keeps `flex-1 min-h-0 overflow-y-auto` because scroll is the slot's job. Type the props; do not adjust the classes.

- [ ] **Step 3: Apply the same pattern to `FileTabs` (`.Panel`) and `SummarySlab` (`.Row`)**

- [ ] **Step 4: Verify** — typecheck, `npm run test:unit` at 793/115, build.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ui/Card.tsx client/src/components/ui/FileTabs.tsx client/src/components/ui/SummarySlab.tsx
git commit -m "refactor(ts): type Card and the compound primitives

Object.assign carries the sub-components so TypeScript infers the statics
with no interface to maintain — uniform with any future forwardRef-based
compound, where expando assignment genuinely would not type-check."
```

---

### Task 3: The simple primitives (20 files)

**Files:** `client/src/components/ui/` — `Avatar`, `Badge`, `Banner`, `Breadcrumb`, `CareRing`, `Divider`, `Emphasis`, `EmptyState`, `Heading`, `IconDisc`, `Medallion`, `Preheading`, `ProgressBar`, `Quote`, `Spinner`, `Toggle`, `Weather`, plus `ui/errors/{ErrorBoundary,ErrorState,WidgetError}`.

All depend only on Tasks 1–2 (`Badge` and `Breadcrumb` on `Action`/`Tooltip`; `Heading` on `Preheading`, both in this task).

- [ ] **Step 1: Convert in this order** — `Preheading` before `Heading`; everything else is independent.

- [ ] **Step 2: `ErrorBoundary` is a class component**

It is the only class component in the wave. Type its props and state explicitly (`{ children: ReactNode }`, `{ error: Error | null }` or whatever it actually holds) and keep `getDerivedStateFromError` / `componentDidCatch` signatures exact. Do not convert it to a function component.

- [ ] **Step 3: `Weather` uses Motion and imports weather types**

Import `CurrentWeather` / `ForecastDay` from `client/src/types/weather.ts` — wave 2 added them. Do not declare a local shape.

- [ ] **Step 4: `ProgressBar` holds a timer** — `ReturnType<typeof setTimeout>`, never `number`. `@types/node` is loaded and its overloads win.

- [ ] **Step 5: Verify** — typecheck, tests at 793/115, build.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ui/
git commit -m "refactor(ts): type the simple ui primitives

Weather takes CurrentWeather/ForecastDay from types/ rather than
redeclaring the shape — the server owns it and wave 2 already modelled it."
```

---

### Task 4: `components/form/` (8 files)

**Files:** `DateInput`, `FormField`, `PasswordStrengthBar`, `SegmentedControl`, `Select`, `Textarea`, `TextInput`, `Tile`.

Independent of Task 3 — may run concurrently in a separate worktree.

- [ ] **Step 1: `FormField` first** — `DateInput`, `Select`, `Textarea` and `TextInput` all wrap it.

- [ ] **Step 2: The error prop is `string | null`, and multi-field error state is `{ field, message }`**

CLAUDE.md: `TextInput` takes `error` as a string for the invalid state; falsy renders the optional `hint`. The `{ field, message }` shape is `FieldError` from `client/src/types/form.ts` — wave 2 added it. Import it; do not declare a second one.

- [ ] **Step 3: Preserve the a11y wiring exactly**

`TextInput` owns label association, `aria-invalid`, and `aria-describedby`. These are the reason the primitive exists. Type them; do not restructure them. `focus:ring-inset` stays.

- [ ] **Step 4: `Tile` consumes `Action` and `Tooltip`** from Task 1 — inherit, don't re-declare.

- [ ] **Step 5: Verify** — typecheck, tests at 793/115, build. `tests/components/form/` covers several directly.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/form/
git commit -m "refactor(ts): type the form primitives

FieldError comes from types/form.ts rather than a local restatement, so the
multi-field error shape has one declaration across hooks and inputs."
```

---

### Task 5: The overlay and motion family (11 files)

**Files:** `Popover`, `Dialog`, `DialogCard`, `Drawer`, `ConfirmDialog`, `Menu`, `FilterChips`, `FilterControl`, `Toast`, `RadialWheel`, `PageHeader`.

Hardest task after Task 1. Convert in this order: `Popover` → `Dialog` → `DialogCard` → `Drawer` → `ConfirmDialog` → `Menu` → `FilterChips` → `FilterControl` → `Toast` → `RadialWheel` → `PageHeader`.

- [ ] **Step 1: `motion.create(Card)` is the central problem**

`Dialog` is a `Card` under the hood (`MotionCard = motion.create(Card)`), and the result must keep both `Card`'s props and Motion's animation props. Get this right once and `DialogCard`, `Toast`, `Weather`, `RadialWheel`, `WizardCard` and `WizardTransition` all follow the same shape.

Read Motion's own types before choosing an approach. If the clean typing requires a cast, it needs a comment explaining what Motion's types cannot express — do not reach for `as any`.

- [ ] **Step 2: `Dialog` IS a `Card` — do not wrap it in another one**

CLAUDE.md: consumers drop `Card.Header` / `Card.Body` / `Card.Footer` as direct children of `<Dialog>`. Type the children slot so that stays natural.

- [ ] **Step 3: `Menu` is a compound** (`.Trigger`, `.Items`, `.Item`, `.Divider`) — same `Object.assign` pattern as Task 2. It consumes `ActionIcon` and `Popover`.

- [ ] **Step 4: Focus-trap behaviour must not change**

`Dialog` and modal `Popover` share `useFocusTrap` (converted in wave 2, returns `RefObject<HTMLElement | null>`). Do not narrow that ref to a concrete element type at the consumer, and do not alter the trap's Tab-wrap behaviour.

- [ ] **Step 5: Verify** — typecheck, tests at 793/115, build. `tests/components/ui/Dialog.test.jsx` and the Popover tests cover this directly.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ui/
git commit -m "refactor(ts): type the overlay and motion primitives

motion.create(Card) has to keep both Card's props and Motion's; the shape
chosen here is the one Toast, Weather, RadialWheel and the wizard cards
all reuse."
```

---

### Task 6: `components/wizard/` (6 files)

**Files:** `StepProgress`, `StepTip`, `WizardActions`, `WizardCard`, `WizardDialog`, `WizardTransition`.

`WizardDialog` needs `Dialog` from Task 5, so this task comes last.

- [ ] **Step 1: Convert leaves first** — `StepProgress`, `StepTip`, `WizardTransition`, then `WizardCard`, `WizardActions`, then `WizardDialog`.

- [ ] **Step 2: `WizardDialog` has two modes** — managed (AddSpace) and self-managed crossfade (AddPlant). Read the component itself and type both without collapsing them into one.

- [ ] **Step 3: `useWizardSteps` was typed in wave 2** — import its types rather than re-deriving them.

- [ ] **Step 4: Verify** — typecheck, tests at 793/115, build.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/wizard/
git commit -m "refactor(ts): type the wizard primitives

WizardDialog's managed and self-managed modes stay distinct in the types —
collapsing them would let a caller mix step control with crossfade control."
```

---

### Task 7: Gate and PR

**Files:** none modified — verifies Tasks 1–6.

- [ ] **Step 1: Restart the client container first.** `docker compose restart client`. The dev server holds the pre-rename module graph, and a stale one makes every Playwright spec fail with a blank `#root` — this cost a full debugging cycle in wave 2.
- [ ] **Step 2: Full suite** — `./scripts/run_tests.sh`. API 481/481, client 793/793 across 115 files, Playwright 54/54.
- [ ] **Step 3: Type-check** — `cd client && npm run typecheck`, exit 0.
- [ ] **Step 4: Build** — `cd client && npm run build`, exit 0.
- [ ] **Step 5: Comment audit** — `git diff refactor/typescript-wave-2-data-layer...HEAD -- client/`. A comment must carry a constraint the code cannot express. Report defects; do not delete unilaterally.
- [ ] **Step 6: Review triad** — `/accessibility` **applies and must run** (this wave touches markup — the first since the migration began). `/react-best-practices` applies. `/dhh-rails-reviewer` skip with reason: no Rails change.
- [ ] **Step 7: Lint last** — `./scripts/lint.sh`. Bundler Audit's pre-existing gem CVE failure is out of scope. Commit any Biome auto-fix.
- [ ] **Step 8: PR** — base `refactor/typescript-wave-2-data-layer`, title `refactor(ts): convert the ui, form and wizard primitives`. Do not open it until the whole-branch review has run.

---

## Self-Review

**Spec coverage:** the spec's wave 3 row is `components/ui/` 37, `components/form/` 8, `components/wizard/` 6 = 51. Tasks 1–6 cover 3+3+20+8+11+6 = 51. The three named friction points from spec §4 — `Action`'s union, compound components, `useState(null)` generics — land in Tasks 1, 2 and throughout.

**Placeholder scan:** the per-file instructions name each file and the specific decision it needs rather than showing 51 files' bodies. The hard patterns are given concretely (the `ActionProps` union, the `Object.assign` export); the rest is annotation work whose pattern those establish.

**Type consistency:** `ActionProps` is defined in Task 1 and consumed by name in Tasks 4 (`Tile`) and 5 (`Menu` via `ActionIcon`). `CardProps` from Task 2 is consumed in Task 5 (`Dialog`) and Task 6 (`WizardCard`). `FieldError` and the weather types come from `client/src/types/`, added in wave 2.

**Known risk carried forward:** converting out of order yields `TS2741` on props that are optional in practice. The task order is a topological sort of the real import graph, verified by grepping the imports rather than assumed.
