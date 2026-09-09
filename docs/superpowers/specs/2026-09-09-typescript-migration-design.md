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
| API types | Hand-written `src/types/`, one file per domain noun | Zod schemas; codegen from Rails |
| Delivery | Sequential PRs to `main`, one per wave | Single 368-file PR; stacked branches |
| Working mode | Pair on waves 1–3, batch waves 4–6 | Pair on all; batch all |

`allowJs: true` stays on until wave 6b, which is what makes every intermediate state
compile, build, and ship.

## 1. Toolchain

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
    "types": ["node", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

Deliberate omissions:

- `noUnusedLocals` / `noUnusedParameters` — Biome already reports unused bindings.
  Enabling both produces two error streams for one problem.
- `noUncheckedIndexedAccess` — too noisy across map/filter-heavy component code.

`verbatimModuleSyntax: true` requires `import type { Plant }` for type-only imports.
Biome auto-fixes the ones that get missed.

`"types"` must list `node` explicitly. Specifying the array at all suppresses automatic
inclusion of every other `@types/*` package, and `playwright.config.ts` reads
`process.env.CI`.

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

## 2. Domain types — `client/src/types/`

New top-level folder under `src/`, documented in CLAUDE.md alongside `errors/` and
`hooks/`. One file per domain noun, named after the Rails model. No barrel `index.ts`,
matching the `errors/` convention.

```
src/types/
├── plant.ts                ← Plant, WaterStatus, FeedStatus
├── space.ts                ← Space, LightLevel, TemperatureLevel, HumidityLevel, SpaceIcon
├── species.ts              ← Species, SpeciesSearchResult, PersonalityType
├── careLog.ts              ← CareLog, CareType
├── user.ts                 ← User, UserIntent, VitalityStatus
├── achievement.ts          ← Achievement, AchievementKind
├── plantPhoto.ts           ← PlantPhoto
├── journal.ts              ← JournalEntry, JournalKind
├── notification.ts         ← AppNotification
├── weather.ts              ← CurrentWeather, ForecastDay
└── rails-actioncable.d.ts  ← ambient module for the untyped dependency
```

### Rules

**Field-for-field mirror of `as_json`, snake_case preserved.** No camelCase transform
layer at the boundary. The server owns the shape; a rename layer is a second place to
drift and buys nothing.

```ts
export type WaterStatus = 'overdue' | 'due_today' | 'due_soon' | 'healthy' | 'unknown'

export type Plant = {
  id: number
  nickname: string
  notes: string | null
  space_id: number
  space: Space
  species: Species | null          // `species&.as_json` — nullable at source
  calculated_watering_days: number | null
  water_status: WaterStatus
  days_until_water: number | null
  last_watered_at: string | null   // ISO string, not Date
}
```

**Dates are `string`, never `Date`.** They arrive as ISO strings and are never parsed at
the boundary. Typing them `Date` would be a lie the compiler accepts.

**Literal unions mirror Rails constants — the one accepted drift surface.**
`WaterStatus`, `LightLevel`, `HumidityLevel`, `CareType` and `SpaceIcon` restate keys
that live in `Space::LIGHT_MODIFIERS`, `CareLog::CARE_TYPES` and `Plant#water_status`.

This is a shape declaration, not a business calculation: it states which values arrive,
not what any of them means or computes. The modifier *values* (`0.2`, `-0.15`) stay
server-side and never appear in the client, so the "server owns business calculations"
rule holds. The keys are genuinely duplicated, and adding a light level in Rails will not
surface client-side until runtime.

Accepted, because Zod and codegen were both rejected. Mitigation: these unions live in
ten small files that diff trivially against the models.

**`rails-actioncable.d.ts`** declares only the surface actually used — `createConsumer`,
`Consumer#disconnect`, `Consumer#subscriptions.create`. Not a full library typing.
`@rails/actioncable` is the only dependency in the tree that ships no types; motion,
vaul, driver.js, TanStack Query, react-router-dom and FontAwesome all do.

## 3. Waves

Ordering principle: **leaves first.** A `.tsx` file importing a still-`.jsx` child gets
loosely-inferred props, so primitives convert before their consumers and each wave
inherits real types from the one below it.

| Wave | Ticket | Contents | Files | Mode |
|---|---|---|---|---|
| 1 | 071 | tsconfig, deps, `typecheck` script, lint.sh, CI, `vite.config.ts`, `playwright.config.ts`, `tests/setup.ts`, CLAUDE.md TS section | ~8 | pair |
| 2 | 072 | `types/` (~11 new), `api/` 3, `context/` 6, `errors/` 6, `hooks/` 30, `utils/` 15, `personality/` 3 | ~74 | pair |
| 3 | 073 | `components/ui/` 37, `components/form/` 8, `components/wizard/` 6 | 51 | pair |
| 4a | 074 | `components/` root 13, `auth/` 4, `search/` 2, `notifications/` 2, `organiser/` 3 | 24 | batch |
| 4b | 075 | `today/` 11, `plants/` 14 | 25 | batch |
| 4c | 076 | `spaces/` 14, `onboarding/` 12 — paired because onboarding's space forms import from `spaces/` | 26 | batch |
| 4d | 077 | `journal/` 19, `encyclopedia/` 10, `me/` 9 | 38 | batch |
| 5 | 078 | `layouts/` 4, `pages/` 13, `App.tsx`, `main.tsx`, `index.html` script src | 18 | batch |
| 6a | 079 | Vitest `tests/**/*.test.tsx` | ~90 | batch |
| 6b | 080 | Playwright `tests/**/*.spec.ts`; narrow the transitional globs to TS-only | ~32 | batch |

Waves 1–3 make every type decision the rest inherits, which is why they are paired.
4a onward applies a settled pattern.

**Conventions applied throughout:**

- `.tsx` only when the file contains JSX. Hooks returning JSX-free values stay `.ts`.
- PR titles use `refactor(ts): convert <wave> to TypeScript`. The `feat(v2):` marker does
  not apply — these are not v2 R-tickets.
- Waves 1 and 2 change `package.json`, so both need `./scripts/npm_install.sh`.

**Rollback:** `allowJs` stays on until 6b, so any wave reverts independently without
breaking the build. Flipping the test globs in 6b is the only one-way door.

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

### Compound components break on static assignment

`Card.Header = Header` after `function Card()` is a strict-mode error — the function type
has no such property. Chosen fix:

```ts
export default Object.assign(Card, { Header, Body, Footer, Meta })
```

TypeScript infers the statics, one line, no interface. Applies identically to any future
compound primitive.

### The fetch wrapper must be generic

`api/client.ts` becomes `request<T>(path, options): Promise<T>`, and each hook names its
result (`useQuery<Plant[]>`). Getting this wrong in wave 2 leaves waves 3–6 type-checking
green while checking nothing.

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
- No runtime validation (Zod) and no type codegen from Rails. Revisit only if the
  literal-union drift surface actually bites.
- No camelCase transform layer at the API boundary.
- No ESLint. Biome 2.4 lints TypeScript natively.
- No behaviour changes. A wave that needs a component to work differently is out of scope
  for that wave.
