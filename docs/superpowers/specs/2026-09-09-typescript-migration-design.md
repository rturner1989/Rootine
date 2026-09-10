# TypeScript Migration — Design

**Date:** 2026-09-09
**Scope:** `client/` — full conversion of 246 source files and 122 test files to TypeScript.
**Tickets:** TICKET-071 … TICKET-080

This spec covers the whole migration programme. Each wave gets its own implementation
plan and its own PR; the plan for a wave is written when that wave starts, not upfront.

## Goal

Convert the React client from JavaScript to TypeScript with `strict: true` from day one,
delivered as ten sequential PRs that each merge green to `main`.

The API (`api/`) is untouched. No Rails changes anywhere in this work.

## Decisions

| Decision | Choice | Rejected |
|---|---|---|
| Scope | Full conversion, `src/` and `tests/` | Foundation-only; JSDoc `checkJs` |
| Strictness | `strict: true` from wave 1 | Loose baseline then ratchet |
| API types | Zod schemas in `src/types/`, types via `z.infer` | Hand-written types; codegen from Rails |
| Delivery | Stacked PRs, one per wave, each based on the wave below | Single 368-file PR; sequential merges to `main` |
| Working mode | Pair on waves 1–3, batch waves 4–6 | Pair on all; batch all |

`allowJs: true` stays on until wave 6b, which is what makes every intermediate state
compile, build, and ship.

**Stacked, not sequentially merged** (changed 2026-09-10 at the owner's request — they
review the whole stack at once rather than wave by wave). Each wave branches off the
previous wave's head, and its PR is opened with that branch as the **base**, so the PR diff
shows only its own wave. Opening every PR against `main` instead would make wave 5's diff
contain five waves of commits and defeat the review.

The cost of stacking: a change requested on an early wave means rebasing every wave above
it. That is the trade for reviewing the arc as a whole, and it is why each wave still has to
pass its own gate before the next one starts — a defect caught inside the stack is far
cheaper than one caught at the bottom of it.

## 1. Toolchain

**Resolved to TypeScript 7** (the native port), not the 5.x line this design was evaluated
against. TypeScript does not follow semver — minor and major releases add new checks, not
just new syntax — so the §4 friction analysis below is calibrated to 7.x behaviour.

**New devDependencies:** `typescript`, `@types/node`.
`@types/react` and `@types/react-dom` are already installed.

**Single `client/tsconfig.json`.** No project references, no split node/app configs.

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "allowJs": true,
    "checkJs": false,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

Deliberate omissions:

- `noUnusedLocals` / `noUnusedParameters` — Biome already reports unused bindings.
  Enabling both produces two error streams for one problem.
- `noUncheckedIndexedAccess` — too noisy across map/filter-heavy component code.

**`noUncheckedSideEffectImports` defaults to `true` under TS 7** (opt-in under 5.x). A
bare side-effect import like `main.tsx`'s `import './globals.css'` fails `TS2882` without
an ambient module declaration. `client/src/vite-env.d.ts`
(`/// <reference types="vite/client" />`) covers this — and `import.meta.env` — for every
`.ts`/`.tsx` file under `src/`. It looks unused; it isn't — don't delete it.

`verbatimModuleSyntax: true` requires `import type { Plant }` for type-only imports.
Biome auto-fixes the ones that get missed.

`"types"` must list `node` explicitly. Specifying the array at all suppresses automatic
inclusion of every other `@types/*` package, and `playwright.config.ts` reads
`process.env.CI`.

`@testing-library/jest-dom` is deliberately **not** in the array. Its default types entry
augments jest's `Assertion`, not vitest's; the vitest augmentation lives behind the
`@testing-library/jest-dom/vitest` subpath already imported by `tests/setup.ts`.

**Type-checking is a new gate.** Biome lints TypeScript syntax but performs no type
inference, so `tsc` runs separately:

- `package.json` → `"typecheck": "tsc --noEmit"`
- `scripts/lint.sh` → new `run_check "TypeScript (Client)"`, placed **after** the Biome
  step, because Biome's auto-fix rewrites imports.
- `.github/workflows/client.yml` lint job → `npm run typecheck` after `npm run lint`.

No `vite-plugin-checker`. Vite does not type-check at build time; editor plus
`tsc --noEmit` covers it without adding a dependency to the dev server hot path.

**Transitional test globs.** Wave 1 widens both runners to accept either extension, and
wave 6b narrows them back:

- Vitest: `include: ['tests/**/*.test.{js,jsx,ts,tsx}']`
- Playwright: `testMatch: '**/*.spec.{js,ts}'`

**Docker** needs no change — `client/Dockerfile` runs `npm install`. Run
`./scripts/npm_install.sh` after any `package.json` edit.

## 2. Domain schemas — `client/src/types/`

New top-level folder under `src/`, documented in CLAUDE.md alongside `errors/` and
`hooks/`. One file per domain noun: a Rails model where one exists, named after the
model; a cross-cutting concept that isn't a Rails model gets a file too. No barrel
`index.ts`, matching the `errors/` convention.

**Zod is the source of truth; the types are inferred from it.** A file exports a schema
and the type derived from it, never a hand-written type that restates the schema:

```ts
export const plantSchema = z.object({ /* … */ })
export type Plant = z.infer<typeof plantSchema>
```

Writing both by hand would put the same shape in two places, which is the drift this is
meant to remove.

```
src/types/
├── plant.ts                ← plantSchema, Plant, waterStatusSchema, WaterStatus
├── space.ts                ← spaceSchema, Space, lightLevelSchema, LightLevel, …
├── species.ts              ← speciesSchema, Species, speciesSearchResultSchema, …
├── careLog.ts              ← careLogSchema, CareLog, careTypeSchema, CareType
├── user.ts                 ← userSchema, User, userIntentSchema, …
├── achievement.ts          ← achievementSchema, Achievement, …
├── plantPhoto.ts           ← plantPhotoSchema, PlantPhoto
├── journal.ts              ← journalEntrySchema, JournalEntry, …
├── notification.ts         ← appNotificationSchema, AppNotification
├── weather.ts              ← currentWeatherSchema, ForecastDay, …
├── form.ts                 ← FieldError — plain type, no schema (never crosses the wire)
└── rails-actioncable.d.ts  ← ambient module for the untyped dependency
```

Not every file is a schema file. `form.ts` holds a UI-only type that never crosses the
network boundary, so there is nothing to validate — a schema there would be ceremony.
Schemas are for shapes that arrive from the server.

### Rules

**Validate, never transform.** Schemas assert what arrived; they do not reshape it. No
`.transform()` to camelCase, no coercion of date strings into `Date`. The server owns the
shape, and a translation layer is a second place to drift.

```ts
export const waterStatusSchema = z.enum(['overdue', 'due_today', 'due_soon', 'healthy', 'unknown'])
export type WaterStatus = z.infer<typeof waterStatusSchema>

export const plantSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  notes: z.string().nullable(),
  space_id: z.number(),
  space: spaceSchema,
  species: speciesSchema.nullable(),       // `species&.as_json` — nullable at source
  calculated_watering_days: z.number().nullable(),
  water_status: waterStatusSchema,
  days_until_water: z.number().nullable(),
  last_watered_at: z.string().nullable(),  // ISO string, never z.coerce.date()
})
export type Plant = z.infer<typeof plantSchema>
```

**snake_case preserved.** Field names match `as_json` exactly.

**Dates are `z.string()`, never `z.coerce.date()`.** They arrive as ISO strings and are
never parsed at the boundary. Formatting stays in `utils/careStatus.js`.

**Unknown keys are stripped — `z.object`, not `z.looseObject`.** If Rails adds a field to
an `as_json` and the schema isn't updated, the call site fails to *compile*, because
`z.infer` doesn't know the field either. `looseObject` would let the field exist at
runtime while TypeScript denied it — a silent divergence instead of a build error.

**`.parse()`, not `.safeParse()` — in every environment.** A parse failure throws, which
TanStack Query surfaces as a query error and the page renders its error state. No
environment branching, one code path.

This is safe precisely because unknown keys are stripped: additive Rails changes never
throw. A throw means genuinely breaking drift — a field removed or retyped — which is a
bug that should be visible rather than absorbed into a plausible-looking render.

**Responses are parsed; request bodies are not.** Mutation inputs are already guarded at
compile time by the inferred types, and the server validates them again on arrival.
Parsing outbound payloads would be a third check that catches nothing the first two miss.

**Literal unions still mirror Rails constants — but drift is now loud.**
`waterStatusSchema`, `lightLevelSchema`, `careTypeSchema` and `spaceIconSchema` restate
keys that live in `Space::LIGHT_MODIFIERS`, `CareLog::CARE_TYPES` and
`Plant#water_status`. The keys are still duplicated; what changes is the failure mode. A
new light level added in Rails now throws at the boundary with the offending value in the
error, instead of rendering as an unhandled branch somewhere downstream.

The modifier *values* (`0.2`, `-0.15`) stay server-side and never appear in the client, so
the "server owns business calculations" rule holds.

**`rails-actioncable.d.ts`** declares only the surface actually used — `createConsumer`,
`Consumer#disconnect`, `Consumer#subscriptions.create`. Not a full library typing.
`@rails/actioncable` is the only dependency in the tree that ships no types; motion,
vaul, driver.js, TanStack Query, react-router-dom and FontAwesome all do.

### Dependency

`zod@^4.6.0`, a runtime dependency — not a devDependency, since schemas execute in the
browser. Full `zod`, not `zod/mini`: the mini build trades a readable declarative API for
bundle size, and this codebase values the former.

## 3. Waves

Ordering principle: **leaves first.** A `.tsx` file importing a still-`.jsx` child gets
loosely-inferred props, so primitives convert before their consumers and each wave
inherits real types from the one below it.

| Wave | Ticket | Contents | Files | Mode |
|---|---|---|---|---|
| 1 | 071 | tsconfig, deps, `typecheck` script, lint.sh, CI, `vite.config.ts`, `playwright.config.ts`, `tests/setup.ts`, CLAUDE.md TS section | ~8 | pair |
| 2 | 072 | `zod` dep, `types/` (~11 new), `api/` 3, `context/` 6, `errors/` 6, `hooks/` 30, `utils/` 15, `personality/` 3 | ~74 | pair |
| 3 | 073 | `components/ui/` 37, `components/form/` 8, `components/wizard/` 6 | 51 | pair |
| 4a | 074 | `components/` root 13, `auth/` 4, `search/` 2, `notifications/` 2, `organiser/` 3; **validate `AchievementsListener`'s cable payload — `safeParse`, not `parse` (see below)** | 24 | batch |
| 4b | 075 | `today/` 11, `plants/` 14 — **also migrate `LocationButton`, `StepDetails` off the `apiGet`/`apiPost` shims** | 25 | batch |
| 4c | 076 | `spaces/` 14, `onboarding/` 12 — paired because onboarding's space forms import from `spaces/`; **also migrate `Step3Plants` off the shims** | 26 | batch |
| 4d | 077 | `journal/` 19, `encyclopedia/` 10, `me/` 9; **add the missing `isError` branches (see below)** | 38 | batch |
| 5 | 078 | `layouts/` 4, `pages/` 13, `App.tsx`, `main.tsx`, `index.html` script src; **migrate `ForgotPassword` + `ResetPassword` off the shims, then DELETE `apiGet`/`apiPost`/`apiPatch`/`apiDelete`** | 18 | batch |
| 6a | 079 | Vitest `tests/**/*.test.tsx` | ~90 | batch |
| 6b | 080 | Playwright `tests/**/*.spec.ts`; narrow the transitional globs to TS-only | ~32 | batch |

Waves 1–3 make every type decision the rest inherits, which is why they are paired.
4a onward applies a settled pattern.

**Seven accessibility findings from wave 3's audit, deferred with reasons.**
Wave 3's gate ran the first thorough `/accessibility` pass over the 51 primitives. Ten
findings came back; all were spot-checked as pre-existing rather than conversion
regressions. Three unambiguous ones were fixed in wave 3 (disabled `Action` dropping
`aria-label`, `Toggle`'s `label` typed optional though required, a dead ternary in
`Breadcrumb`). The remaining seven are deferred **because each is a design decision, not a
defect** — making those calls inside a typing wave would commit to them without a design
pass:

- `RadialWheel` — arrow navigation lands on unfocusable disabled spokes.
- `PasswordStrengthBar` — no meter semantics and no text equivalent.
- `DialogCard` — no `useReducedMotion()`, unlike every sibling animated component.
- `WizardCard` — a large `layoutId` morph with no reduced-motion check.
- `IconDisc` / `Medallion` — hardcode `aria-hidden` while still accepting interactive props.
- `Menu` — mixes native list semantics with the ARIA menu role.

`PageHeader` was on this list and has been **removed from it and fixed in wave 3**. The
whole-branch review traced all six consumers: four (`Journal`, `House`, `Encyclopedia`,
`SpeciesDetail`) pass `compactMobile` + `eyebrow`, and none of those pages has another
`<h1>` anywhere in its tree — so below 640px they rendered with zero level-1 headings.
That is a defect, not a design decision: what was intended was smaller visual weight, and
what shipped was the semantic landmark removed. Reclassifying it as a design question was
the error.

Fixing it surfaced a **new design question** that the missing `<h1>` had been masking: in
the `compactMobile` + mobile state the eyebrow renders as an `<h3>` *above* the `<h1>`, so
the heading order now reads h3-then-h1. The `<h3>` was always there; there was simply no
`<h1>` for it to be out of order with. Should the mobile eyebrow become an `<h2>`, or drop
to non-heading markup so the `<h1>` stands alone? That belongs with the a11y ticket below,
not in a typing wave.

Plus two known pre-existing bugs outside the primitives: `SpaceEnvFields` passes JSX as
`SegmentedControl`'s `label`, so the announced accessible name is literally
`"[object Object]"`; and `Popover`'s `onClose` is unstabilized in its effect deps where
`Dialog` uses an `onCloseRef`.

These want one accessibility ticket with a design pass, not scattering across the
conversion waves.

**Some surfaces render an empty state where an error state belongs.**
`pages/encyclopedia/Encyclopedia.jsx` does `data?.species ?? []` with no `isError` branch,
so a failed request renders "No species match those filters — try loosening a filter". The
grouped view tells a user with spaces to "Add a space to see recommendations". The same
`?? []` / `?? null` pattern sits in `AchievementsWidget`, `NotificationsDrawer`,
`NotificationsTrigger`, `WeatherWidget` and `StreakStat`.

Pre-existing, but wave 2 makes it materially more reachable: responses now throw on schema
drift where they previously flowed through unvalidated. Today, House, Me, Plant and Journal
already have proper `error` branches — this is a small, bounded set to bring in line.

Fix it in the wave that converts each component, not before: these are `.jsx` files and
wave 2 converts no components.

**Plant "mood" is classified twice, with two unrelated types.**
`components/plants/Row.tsx` (`MOOD_VARIANT` + `type Mood = keyof typeof MOOD_VARIANT`,
`moodFor`) and `components/today/PlantsRow.tsx` (`type PlantMood`, `plantStatus`) both derive
the same three-value classification from `plant.water_status` / `plant.feed_status`, with
near-identical logic and two independently declared unions.

A change to the overdue / due-soon thresholds — or a new water/feed status — applied to one
file diverges silently from the other, and nothing in the type system catches it because the
unions are unrelated. House and Today would then disagree about the same plant.

Pre-existing (both were `.jsx` doing this before conversion), but wave 4 was the natural
moment to notice and didn't: tasks 2 and 3 ran in **isolated worktrees**, so `plants/` and
`today/` were converted and reviewed by different agents who never saw both files. That is
the standing cost of worktree parallelism — clean merges, no cross-file discovery.

Fix is small: one shared `moodFor(plant): PlantMood` helper and one exported type.

**Cable payloads are an unvalidated entry point until wave 4a.**
`components/AchievementsListener.jsx` reads `achievement.emoji` and `achievement.label`
straight off an ActionCable push with no validation. The payload is
`Achievement#as_json` (`achievement.rb`, `broadcast_to(user, as_json)`), which
`achievementSchema` already models — so drift shows up as `"undefined undefined"` in a
toast rather than a crash.

**Fix it with `safeParse`, not `parse`.** A bare `.parse()` inside a cable callback throws
in an unhandled async handler, killing the toast *and* the `invalidateQueries` that follows
it — strictly worse than the bad copy it replaces. On success, render from the parsed
value; on failure, skip the toast and log, but keep `invalidateQueries` unconditional so
the bell and achievements list still refresh through the already-validated REST path.

That converges on what `NotificationsContext.tsx` already does, which is the better model
generally: treat a push as a signal, and read the data back through a validated fetch.

**Transitional `z.unknown()` shims — must not become permanent.** Wave 2 keeps
`apiGet` / `apiPost` / `apiPatch` / `apiDelete` in `api/client.ts` as thin wrappers that
call `request(path, z.unknown())`. They validate nothing; they exist because five call
sites live in files wave 2 does not convert.

`z.unknown()` is deliberate — it reproduces the old unchecked `response.json()` exactly,
rather than a fabricated schema that would report false validation. The shims carry no
in-code TODO because this project deletes unowned TODOs on sight; the wave rows above are
the accountability instead. Wave 5 deletes all four once its two pages migrate. Any wave
that finishes leaving a shim consumer behind has to move that row's note forward, not drop
it.

**Conventions applied throughout:**

- `.tsx` only when the file contains JSX. Hooks returning JSX-free values stay `.ts`.
- PR titles use `refactor(ts): convert <wave> to TypeScript`. The `feat(v2):` marker does
  not apply — these are not v2 R-tickets.
- Waves 1 and 2 change `package.json`, so both need `./scripts/npm_install.sh`.

**Rollback:** `allowJs` stays on until 6b, so any wave reverts independently without
breaking the build. Flipping the test globs in 6b is the only one-way door.

**Wave 6b caveat:** `types: ["node", "vitest/globals"]` puts `test`/`expect`/`describe`/`vi`
in global scope for everything `include` covers, which is `tests/` as a whole — Playwright's
`testDir` included. A converted `.spec.ts` that forgets `import { test, expect } from
'@playwright/test'` type-checks clean and only fails at runtime. Watch for it in review; the
tsconfig isn't changing to fix this.

## 4. Strict-mode friction

Four things in this codebase fight `strict: true`. These are the wave-2/3 decisions the
batched waves inherit.

### `Action` is polymorphic

It renders `Link` / `<a>` / `<span>` / `<button>` depending on `to` / `href` / `disabled`,
spreading `...kwargs` onto whichever wins. Typing `kwargs` per branch needs a
discriminated union:

```ts
type ActionProps =
  | (ActionBaseProps & { to: To; href?: never } & Omit<LinkProps, 'to' | 'className'>)
  | (ActionBaseProps & { href: string; to?: never } & AnchorHTMLAttributes<HTMLAnchorElement>)
  | (ActionBaseProps & { to?: never; href?: never } & ButtonHTMLAttributes<HTMLButtonElement>)
```

The `to?: never` / `href?: never` members stop callers passing both. This is the hardest
file in the conversion. `ActionIcon` forwards into `Action` and inherits the union rather
than re-declaring one.

### Compound components break on static assignment — but only sometimes

`Card.Header = Header` after `function Card()` type-checks fine — TypeScript supports expando
property assignment on a plain function declaration. It breaks (`TS2339: Property 'Sub' does
not exist on type 'ForwardRefExoticComponent<…>'`) once the base is a `forwardRef`/`memo`
result instead of a plain function. Chosen fix, applied uniformly regardless of which case a
given component falls into:

```ts
export default Object.assign(Card, { Header, Body, Footer, Meta })
```

TypeScript infers the statics, one line, no interface, and the pattern doesn't change
depending on how the base component happens to be declared.

### The fetch wrapper takes a schema, not a type parameter

`api/client.ts` becomes `request(path, schema, options)`, returning
`Promise<z.infer<typeof schema>>`. The schema is the argument that both validates the
response and produces its type, so a caller cannot assert a type the response was never
checked against:

```ts
async function request<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  options?: RequestInit,
): Promise<z.infer<Schema>>
```

A bare `request<T>(path)` with a caller-supplied type parameter would type-check green
while checking nothing — the failure mode this whole approach exists to remove.

**204 No Content short-circuits before parsing.** Deletes return no body, so the wrapper
returns before reaching `.parse()`; those callers pass `z.void()`.

### `useState(null)` needs explicit generics

The `{ field, message }` form-error pattern is everywhere. `useState(null)` infers `null`
and rejects every later set; it becomes `useState<FieldError | null>(null)`. Mechanical,
high-volume, concentrated in waves 3–4.

### Escape-hatch policy

`unknown` plus narrowing over `any`. A literal `any` requires a comment stating why —
which clears the project comment bar, since "why this is untyped" is a constraint the code
cannot express. `@ts-expect-error`, never `@ts-ignore`: the former fails once the
underlying problem is fixed.

## Verification

Every wave PR shows all four green before the gate's lint step:

```
npm run typecheck     # tsc --noEmit — new gate
npm run test:unit     # vitest
npm run build         # vite build
npx playwright test   # specs touching the converted surface
```

`npm run build` matters independently of `typecheck`: Vite resolves imports through the
bundler and `tsc` through `moduleResolution: bundler` heuristics, and the two can disagree
on extension-less imports after a rename.

Each wave additionally runs the CLAUDE.md pre-commit gate — tests green, comment audit,
review triad (`/react-best-practices` on component waves, `/accessibility` where markup
shifts, DHH not applicable throughout since no Rails changes), lint last.

## Non-goals

- No Rails changes. `as_json` shapes are consumed as they are.
- No type codegen from Rails. The schemas are written by hand against each model's
  `as_json`; nothing introspects the Ruby.
- No camelCase transform layer at the API boundary.
- No ESLint. Biome 2.4 lints TypeScript natively.
- No behaviour changes. A wave that needs a component to work differently is out of scope
  for that wave.
