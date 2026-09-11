# TypeScript Wave 2 — Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the client's data layer to TypeScript and put Zod schemas at the API boundary, so every server response is validated once and every downstream type is inferred from that validation rather than asserted independently.

**Architecture:** `src/types/` holds one Zod schema per domain noun; types come from `z.infer`. `api/client.ts` takes a schema as an argument and returns `z.infer<typeof schema>`, so no caller can assert a type the response was never checked against. Everything else in this wave — errors, utils, contexts, hooks — converts on top of that, leaves first.

**Tech Stack:** TypeScript 7, Zod 4, TanStack Query 5, React 19, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-09-typescript-migration-design.md`
**Prior wave:** `docs/superpowers/plans/2026-09-09-typescript-wave-1-foundation.md` (merged as PR #97)

## Global Constraints

- `strict: true`. Never loosen a compiler flag, never add `// @ts-ignore` (`@ts-expect-error` is the sanctioned form, and needs a comment saying why).
- **Validate, never transform.** No `.transform()`, no `z.coerce.date()`, no camelCase renaming. Field names mirror `as_json` exactly, snake_case preserved.
- **`z.object`, not `z.looseObject`.** Unknown keys are stripped.
- **`.parse()`, never `.safeParse()`.** Same behaviour in every environment.
- **Responses are parsed; request bodies are not.**
- Dates are `z.string()`. They arrive as ISO strings and are never parsed into `Date`.
- `.tsx` only when the file contains JSX. Hooks returning JSX-free values stay `.ts`; every file in `context/` contains a provider component and becomes `.tsx`.
- No barrel `index.ts` in `src/types/`.
- Use `git mv` for every rename so rename detection survives in the diff.
- No component under `src/components/`, no page, and no test file is converted in this wave. Tests keep importing the modules they already import; `allowJs` makes that work unchanged.
- `zod` is a **dependency**, not a devDependency — schemas execute in the browser.
- Every `package.json` change is followed by `./scripts/npm_install.sh`.
- Commit messages explain the why. No "Generated with Claude" footer, no `Co-Authored-By` trailer. PR title prefix is `refactor(ts):` — the `feat(v2):` marker is for v2 R-tickets and does not apply.

## Authoritative sources for the schemas

Schemas are written by hand against each model's `as_json`. Read the Ruby; do not infer the shape from client usage.

| Schema | Ruby source |
|---|---|
| `plantSchema` | `api/app/models/plant.rb#as_json` (~line 157) |
| `spaceSchema` | `api/app/models/space.rb#as_json` (~line 125) |
| `speciesSchema` | `api/app/models/species.rb#as_json` (~line 268) |
| `careLogSchema` | `api/app/models/care_log.rb#as_json` (~line 47) |
| `userSchema` | `api/app/models/user.rb#as_json` (~line 268) |
| `achievementSchema` | `api/app/models/achievement.rb#as_json` (~line 120) |
| `plantPhotoSchema` | `api/app/models/plant_photo.rb#as_json` (~line 39) |
| `speciesSearchResultSchema` | `api/app/models/species_search_result.rb#as_json` (~line 18) |

**Three traps found while surveying these — handle each explicitly:**

1. **`species.rb` and `user.rb` have conditional keys.** `payload[:community] = community_stats if options[:community]` and `payload[:stats] = stats if options[:stats]`. These are `.optional()`, not required — a schema that requires them throws on every endpoint that doesn't ask for them.
2. **`species_search_result.rb` sets `id: nil` unconditionally.** It is `z.null()`, not `z.number().nullable()`. The record has no database identity; `perenual_id` is its key.
3. **`plant.rb#water_status` and `#feed_status` return Ruby symbols**, which serialise as strings. The enum members are `'overdue' | 'due_today' | 'due_soon' | 'healthy' | 'unknown'` — read the method bodies, they differ in threshold between water (2 days) and feed (3 days) but share the member set.

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `client/src/types/*.ts` | Create (12) | One Zod schema per domain noun + its inferred type |
| `client/src/api/client.ts` | Rename + rewrite | Schema-taking fetch wrapper; the wave's load-bearing file |
| `client/src/api/queryKeys.ts` | Rename | Cache-key registry |
| `client/src/api/cable.ts` | Rename | ActionCable consumer |
| `client/src/errors/*.ts` | Rename (6) | Named Error subclasses |
| `client/src/personality/*.ts` | Rename (3) | Quote tables |
| `client/src/utils/*.ts` | Rename (15) | Pure presentation helpers |
| `client/src/context/*.tsx` | Rename (6) | Providers |
| `client/src/hooks/*.ts` | Rename (30) | Utility hooks, then data hooks |

---

### Task 1: Zod dependency and the domain schemas

**Files:**
- Modify: `client/package.json`
- Create: `client/src/types/{plant,space,species,careLog,user,achievement,plantPhoto,journal,notification,weather,form}.ts`
- Create: `client/src/types/rails-actioncable.d.ts`

**Interfaces:**
- Produces: every schema and inferred type the rest of the wave consumes. Exact export names below — later tasks import these verbatim.

- [ ] **Step 1: Install Zod as a runtime dependency**

```bash
cd client
npm install zod
```

Confirm it landed in `"dependencies"`, not `"devDependencies"`. If npm put it in the wrong section, move it — schemas run in the browser.

- [ ] **Step 2: Write `client/src/types/space.ts` first**

`plantSchema` embeds `spaceSchema`, so this one comes first. Read `api/app/models/space.rb#as_json` and `Space::LIGHT_MODIFIERS` / `TEMPERATURE_MODIFIERS` / `HUMIDITY_MODIFIERS` / `ICONS` for the enum members.

```ts
import { z } from 'zod'

export const lightLevelSchema = z.enum(['low', 'medium', 'bright'])
export const temperatureLevelSchema = z.enum(['cool', 'average', 'warm'])
export const humidityLevelSchema = z.enum(['dry', 'average', 'humid'])

export type LightLevel = z.infer<typeof lightLevelSchema>
export type TemperatureLevel = z.infer<typeof temperatureLevelSchema>
export type HumidityLevel = z.infer<typeof humidityLevelSchema>

export const spaceSchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string(),
  category: z.string().nullable(),
  light_level: lightLevelSchema,
  temperature_level: temperatureLevelSchema,
  humidity_level: humidityLevelSchema,
  archived_at: z.string().nullable(),
  plants_count: z.number(),
  created_at: z.string(),
})

export type Space = z.infer<typeof spaceSchema>
```

Verify `category`'s nullability and `icon`'s type against the model and its migration before committing to the above — if `icon` is constrained to `Space::ICONS` in the DB, make it a `z.enum` of those twelve values instead of `z.string()`.

- [ ] **Step 3: Write `client/src/types/plant.ts`**

```ts
import { z } from 'zod'
import { spaceSchema } from './space'
import { speciesSchema } from './species'

export const waterStatusSchema = z.enum(['overdue', 'due_today', 'due_soon', 'healthy', 'unknown'])
export const feedStatusSchema = waterStatusSchema

export type WaterStatus = z.infer<typeof waterStatusSchema>
export type FeedStatus = z.infer<typeof feedStatusSchema>

export const plantSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  notes: z.string().nullable(),
  space_id: z.number(),
  space: spaceSchema,
  species: speciesSchema.nullable(),
  calculated_watering_days: z.number().nullable(),
  calculated_feeding_days: z.number().nullable(),
  water_status: waterStatusSchema,
  feed_status: feedStatusSchema,
  days_until_water: z.number().nullable(),
  days_until_feed: z.number().nullable(),
  last_watered_at: z.string().nullable(),
  last_fed_at: z.string().nullable(),
  acquired_at: z.string().nullable(),
  created_at: z.string(),
})

export type Plant = z.infer<typeof plantSchema>
```

- [ ] **Step 4: Write the remaining schema files**

One file per noun, same pattern: schema `const` first, `z.infer` type after. Read each model's `as_json` for the field list — do not copy field names from existing client code, which may be stale.

- `species.ts` — `speciesSchema`, `Species`, `personalitySchema`, `speciesSearchResultSchema`, `SpeciesSearchResult`. **`community` is `.optional()`. `speciesSearchResultSchema.id` is `z.null()`.** Personality members come from the Species model: `dramatic`, `prickly`, `chill`, `needy`, `stoic`.
- `careLog.ts` — `careLogSchema`, `CareLog`, `careTypeSchema` (members from `CareLog::CARE_TYPES`).
- `user.ts` — `userSchema`, `User`, `userStatsSchema`. **`stats` is `.optional()`.** `latitude`/`longitude` are `z.number().nullable()` (the model calls `&.to_f`); `joined_on` is a date string.
- `achievement.ts` — `achievementSchema`, `Achievement`. `metadata` is a free-form hash — `z.record(z.string(), z.unknown())`.
- `plantPhoto.ts` — `plantPhotoSchema`, `PlantPhoto`. `image_url` is `z.string().nullable()` (the model returns `nil` when no image is attached).
- `journal.ts` — `journalEntrySchema`, `JournalEntry`, `journalKindSchema` (members from `JournalStream::KINDS`).
- `notification.ts` — `appNotificationSchema`, `AppNotification`. Read the notifications controller for the serialised shape.
- `weather.ts` — `currentWeatherSchema`, `forecastDaySchema`, and their types. Source is the weather endpoint, not a model.
- `form.ts` — **no schema.** A plain `export type FieldError = { field: string; message: string }`. It never crosses the wire.

- [ ] **Step 5: Write `client/src/types/rails-actioncable.d.ts`**

Declare only the surface `cable.ts` and the subscribing hooks actually use.

```ts
declare module '@rails/actioncable' {
  export interface Subscription {
    unsubscribe(): void
  }

  export interface Subscriptions {
    create(
      channel: string | { channel: string; [key: string]: unknown },
      handlers?: {
        connected?(): void
        disconnected?(): void
        received?(data: unknown): void
      },
    ): Subscription
  }

  export interface Consumer {
    subscriptions: Subscriptions
    disconnect(): void
  }

  export function createConsumer(url?: string): Consumer
}
```

`received(data: unknown)` is deliberate — cable payloads are unvalidated until a schema parses them, exactly like fetch responses.

- [ ] **Step 6: Verify the schemas against real API responses**

Schemas written from Ruby can still be wrong. Prove them against live data before anything depends on them. With the Docker stack up:

```bash
cd client
npx vitest run --no-coverage 2>&1 | tail -5
```

Then write a throwaway script that logs in against the dev API, fetches `/api/v1/plants`, `/api/v1/spaces`, and `/api/v1/species`, and runs each schema's `.parse()` over the response. Report any field that fails. Delete the script before committing.

This step is the whole point of the task — a schema that compiles but doesn't match the server is worse than no schema, because it throws at runtime in a place nobody expects.

- [ ] **Step 7: Type-check and commit**

```bash
cd client && npm run typecheck
cd /Users/rob/Development/PlantCare && ./scripts/npm_install.sh
git add client/package.json client/package-lock.json client/src/types/
git commit -m "feat(ts): add Zod schemas for every API domain shape

Schemas are the source of truth and the types come from z.infer, so a
shape lives in one place instead of two.

Unknown keys are stripped rather than passed through: a field added to
as_json but missed here fails to compile at the call site, instead of
existing at runtime while TypeScript denies it."
```

---

### Task 2: The schema-taking fetch wrapper

**Files:**
- Rename + rewrite: `client/src/api/client.js` → `client.ts`
- Rename: `client/src/api/queryKeys.js` → `queryKeys.ts`
- Rename: `client/src/api/cable.js` → `cable.ts`

**Interfaces:**
- Consumes: every schema from Task 1.
- Produces: `request(path, schema, options)` returning `Promise<z.infer<typeof schema>>`. Every data hook in Task 6 calls this.

- [ ] **Step 1: Read the existing wrapper before changing it**

`client/src/api/client.js` is 177 lines and already handles token refresh, error-class mapping, and JSON encoding. Read it in full. This task changes its *signature and parse step only* — the refresh logic and error mapping are working code and must survive unchanged.

- [ ] **Step 2: Rename the three files**

```bash
cd client/src/api
git mv client.js client.ts
git mv queryKeys.js queryKeys.ts
git mv cable.js cable.ts
```

- [ ] **Step 3: Give `request` its schema parameter**

The signature:

```ts
import type { z } from 'zod'

export async function request<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  options: RequestInit = {},
): Promise<z.infer<Schema>>
```

Two rules for the body:

- **204 No Content returns before parsing.** Deletes have no body; calling `.parse()` on `undefined` would throw. Short-circuit on `response.status === 204` and return. Those callers pass `z.void()`.
- **`.parse()` runs on the decoded JSON, after the existing error-class mapping**, so a 422 still raises `ValidationError` rather than a Zod error. Validation is for successful responses whose shape is wrong, not for HTTP failures the wrapper already classifies.

- [ ] **Step 4: Type `queryKeys.ts` and `cable.ts`**

`queryKeys.ts` is a plain object literal; add `as const` so the key tuples stay literal types rather than widening to `string[]`. Do not restructure the registry — the existing header comment explains its two shapes and stays.

`cable.ts` needs only its `let consumer` annotated: `let consumer: Consumer | undefined`.

- [ ] **Step 5: Verify**

```bash
cd client && npm run typecheck && npm run test:unit
```

Expect exit 0 and 769/769. The unit suite exercises `client.js` through its consumers; if tests fail here, the wrapper's behaviour changed, which this task forbids.

- [ ] **Step 6: Commit**

```bash
git add client/src/api/
git commit -m "refactor(ts): make the fetch wrapper take a schema, not a type parameter

request(path, schema) returns z.infer<typeof schema>, so a caller cannot
assert a shape the response was never checked against. A bare
request<T>(path) would type-check green while validating nothing.

204 short-circuits before parsing — deletes have no body to validate."
```

---

### Task 3: Errors, personality, and pure utils

**Files:**
- Rename: `client/src/errors/*.js` → `.ts` (6 files)
- Rename: `client/src/personality/*.js` → `.ts` (3 files)
- Rename: `client/src/utils/*.js` → `.ts` (15 files)

**Interfaces:**
- Consumes: types from Task 1 where a util takes a domain object (`careStatus`, `careDots`, `journalGrouping`, `spaceSearch`, `spaceIcons`, `petSafety` all do).
- Produces: typed utils the hooks and later waves import.

- [ ] **Step 1: Rename all 24 files with `git mv`, then type them**

These are the wave's most mechanical files. Work folder by folder, `errors/` first (no dependencies), then `personality/`, then `utils/`.

- [ ] **Step 2: Errors — annotate the constructors**

Each is a named `Error` subclass. Give each constructor its parameter types and keep the `instanceof` narrowing working. `ValidationError` carries field errors — type that payload against the `FieldError` shape from `types/form.ts` rather than inventing a second one.

- [ ] **Step 3: Utils — take domain types as parameters, don't redeclare shapes**

`careStatus.ts`, `careDots.ts`, `journalGrouping.ts`, `spaceSearch.ts`, `spaceIcons.ts` and `petSafety.ts` all operate on server data. Import `Plant`, `Space`, `JournalEntry` etc. from `types/` — do not write a local structural type describing the same object.

**Watch for `utils/filterSchema.js`.** The name collides conceptually with the new Zod schemas but it is unrelated — it describes filter UI state, not a wire shape. Leave the name alone in this wave; renaming it is a separate concern and would churn its consumers.

- [ ] **Step 4: Verify and commit**

```bash
cd client && npm run typecheck && npm run test:unit
```

```bash
git add client/src/errors/ client/src/personality/ client/src/utils/
git commit -m "refactor(ts): convert errors, personality tables, and utils

Utils that operate on server data take the domain types from types/
rather than redeclaring the shape locally — a second declaration is a
second thing to drift."
```

---

### Task 4: Utility hooks

**Files:** Rename to `.ts` and type — `useDebouncedValue`, `useFilterDraft`, `useFirstRunReveal`, `useFocusTrap`, `useFormSubmit`, `useInfiniteScrollSentinel`, `useLocalStorageState`, `useMediaQuery`, `usePasswordStrength`, `usePhotoPicker`, `useRegisterSearchScope`, `useWizardSteps` (12 files).

These touch no API and no schema, which is why they come before the contexts and data hooks.

**Interfaces:**
- Produces: typed generic hooks. `useLocalStorageState` and `useDebouncedValue` are generic over their value — `useDebouncedValue<T>(value: T, delay: number): T`, `useLocalStorageState<T>(key: string, initial: T)`.

- [ ] **Step 1: Rename with `git mv`, then type each**

- [ ] **Step 2: Timer handles use `ReturnType<typeof setTimeout>`**

`useDebouncedValue` stores a timer handle. `@types/node` is loaded (the Playwright config needs `process.env`), so `setTimeout` returns `Timeout`, not `number`. Typing the ref `number` fails with `TS2322`. This is documented in CLAUDE.md's TypeScript section; the same applies anywhere else in this task that holds a timer.

- [ ] **Step 3: `useFocusTrap` returns a ref to an element it does not own**

Type it `RefObject<HTMLElement | null>` — the consumer decides the element. Do not narrow it to a div.

- [ ] **Step 4: Verify and commit**

```bash
cd client && npm run typecheck && npm run test:unit
```

`tests/hooks/` covers several of these directly; they must stay green without the test files changing.

```bash
git add client/src/hooks/
git commit -m "refactor(ts): convert the utility hooks

These touch no API surface, so they convert before the contexts and data
hooks that consume schemas."
```

---

### Task 5: Contexts

**Files:** Rename to `.tsx` and type — `AddPlantContext`, `AuthContext`, `NotificationsContext`, `OrganiserContext`, `SearchContext`, `ToastContext` (6 files), plus the three context-wrapper hooks that pair with them: `useAuth`, `useNotificationsContext`, `useOrganiserContext`.

Every file here contains a provider component, so all six are `.tsx`.

**Interfaces:**
- Consumes: `User` from `types/user.ts` (AuthContext), `AppNotification` (NotificationsContext), `request` from Task 2.
- Produces: typed context values the components in waves 3–5 consume.

- [ ] **Step 1: Rename with `git mv`**

- [ ] **Step 2: Give each context a value type, and no default object**

```ts
type AuthContextValue = {
  user: User | null
  // …the rest of the existing surface
}

const AuthContext = createContext<AuthContextValue | null>(null)
```

`createContext<T | null>(null)` plus a throwing guard in the paired hook is the pattern — it makes "used outside its provider" a real error instead of silently handing back a hollow default object.

- [ ] **Step 3: The paired hooks narrow the null**

```ts
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

After the guard, the return type is `AuthContextValue` — non-null — so no consumer needs an optional chain.

- [ ] **Step 4: Verify and commit**

```bash
cd client && npm run typecheck && npm run test:unit
```

```bash
git add client/src/context/ client/src/hooks/
git commit -m "refactor(ts): convert the contexts and their paired hooks

Each context is created as T | null with a throwing guard in its hook,
so using one outside its provider is an error rather than a silently
hollow default object."
```

---

### Task 6: Data hooks

**Files:** Rename to `.ts` and type — `useAchievements`, `useAddPlant`, `useDashboard`, `useEncyclopedia`, `useJournal`, `useJournalCalendar`, `useNotifications`, `usePhotos`, `usePlants`, `useProfile`, `useSearch`, `useSpaces`, `useSpecies`, `useUnseenAchievements`, `useWeather` (15 files).

This is where the wave's value lands: every server read now passes through a schema.

**Interfaces:**
- Consumes: `request` from Task 2, every schema from Task 1, `queryKeys` from Task 2.

- [ ] **Step 1: Rename with `git mv`**

- [ ] **Step 2: Pass the schema at every call site; never annotate `useQuery` with a type parameter**

```ts
export function usePlants(spaceId?: number) {
  return useQuery({
    queryKey: queryKeys.plants.list(spaceId),
    queryFn: () => request(plantsPath(spaceId), z.array(plantSchema)),
  })
}
```

The query's data type is inferred from the schema. Writing `useQuery<Plant[]>` alongside a schema would reintroduce the second declaration this wave exists to remove — and would let the two disagree.

- [ ] **Step 3: Endpoints returning a list use `z.array(...)`, not a bare schema**

Check each endpoint's controller for whether it returns a collection or a single record. `index` actions return arrays; `show`, `create`, and `update` return one record; `destroy` returns 204 and passes `z.void()`.

- [ ] **Step 4: Endpoints with envelopes need an envelope schema**

Some endpoints return `{ records, meta }` rather than a bare array — the journal and notifications endpoints are the ones to check. Where an envelope exists, write it as its own schema in the relevant `types/` file rather than inlining `z.object({...})` at the hook.

- [ ] **Step 5: Cable payloads get parsed too**

`useNotifications` and `useUnseenAchievements` subscribe to ActionCable. The ambient declaration types `received(data: unknown)` deliberately — parse those payloads with the same schema the REST endpoint uses. An unvalidated cable push is the same drift risk as an unvalidated fetch.

- [ ] **Step 6: Verify against the running app, not just the type-checker**

```bash
cd client && npm run typecheck && npm run test:unit && npm run build
```

Then, with the Docker stack up, exercise the real app: log in, load Today, open a plant, log a care action, open the journal, open notifications. A schema mismatch throws at runtime and will show as an error state — the type-checker cannot catch it, and the unit tests mock the API layer.

Report any schema that threw and the field that caused it.

- [ ] **Step 7: Commit**

```bash
git add client/src/hooks/
git commit -m "refactor(ts): parse every server response through its schema

Query data types are inferred from the schema passed to request(), so
a hook cannot claim a shape the response was not checked against.

Cable payloads parse through the same schemas as their REST endpoints —
an unvalidated push is the same drift risk as an unvalidated fetch."
```

---

### Task 7: Gate and PR

**Files:** none modified — verifies and ships Tasks 1–6.

- [ ] **Step 1: Full suite** — `./scripts/run_tests.sh`. Expect API 481/481, client 769/769, Playwright 54/54.
- [ ] **Step 2: Type-check** — `cd client && npm run typecheck`, exit 0.
- [ ] **Step 3: Build** — `cd client && npm run build`, exit 0.
- [ ] **Step 4: Comment audit** — `git diff main...HEAD -- client/`. Delete narration; keep only weight-carrying *why*. Renaming a file is not a reason to add a comment.
- [ ] **Step 5: Review triad** — `/react-best-practices` applies (contexts and hooks changed). `/accessibility` skip with reason: no markup changed. `/dhh-rails-reviewer` skip with reason: no Rails change.
- [ ] **Step 6: Lint last** — `./scripts/lint.sh`. Bundler Audit's pre-existing gem CVE failure is out of scope.
- [ ] **Step 7: Push and open the PR** with title `refactor(ts): convert the data layer and add Zod validation`.

---

## Self-Review

**Spec coverage:** every rule in the spec's §2 maps to a task — schemas as source of truth (T1), validate-never-transform (T1 S2–S4), `z.object` stripping (T1), `.parse()` everywhere (T2 S3), responses-not-requests (T2 S3), schema-taking wrapper (T2), `rails-actioncable.d.ts` (T1 S5). The wave table's file inventory maps to T1/T2 (api + types), T3 (errors, utils, personality), T4–T6 (hooks, context).

**Placeholder scan:** the per-file instructions in T1 S4, T3, T4 and T6 name each file and the specific decision it needs, rather than showing all 74 files' bodies. That is deliberate: the pattern is fully specified by the worked examples in T1 S2–S3, T2 S3 and T6 S2, and repeating it 74 times would bury the six places where judgment is actually required.

**Type consistency:** `request(path, schema, options)` in T2 matches its call sites in T6. `plantSchema`/`Plant`, `spaceSchema`/`Space` naming is consistent across T1, T3 and T6. `FieldError` from `types/form.ts` is declared in T1 S4 and consumed in T3 S2.

**Known risk carried from wave 1:** props inferred from unconverted `.jsx` files are inferred *strictly*, not as `any` — a `.tsx` consuming a `.jsx` component whose props have no defaults gets `TS2741: Property is missing`. No file in this wave imports a component, so it should not bite here; it lands in wave 3.
