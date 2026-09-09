# TypeScript Wave 1 — Toolchain Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up TypeScript in `client/` — compiler, config, type-check gate, and converted build/test config files — so that waves 2–6 can convert source files one folder at a time.

**Architecture:** A single `client/tsconfig.json` with `strict: true` and `allowJs: true`. `allowJs` is what lets 246 unconverted `.jsx` files coexist with TypeScript indefinitely; `checkJs: false` means they are parsed but not type-checked, so wave 1 produces zero errors from unconverted code. Type-checking runs as its own `tsc --noEmit` gate because Biome performs no type inference. Only the three build/test config files convert in this wave — no `src/` file is touched.

**Tech Stack:** TypeScript, Vite 8, Vitest 4, Playwright 1.59, Biome 2.4, React 19.

**Spec:** `docs/superpowers/specs/2026-09-09-typescript-migration-design.md`

**Branch:** `refactor/typescript-foundation` (already created)

## Global Constraints

- No file under `client/src/` is modified in this wave. Wave 1 touches config, scripts, CI, and docs only.
- `strict: true` from the outset. No loosening flags to make something pass.
- `allowJs: true` and `checkJs: false` stay set for the whole migration. Do not enable `checkJs`.
- Do not add `noUnusedLocals`, `noUnusedParameters`, or `noUncheckedIndexedAccess`. Biome covers unused bindings; the third was explicitly rejected.
- `"types": ["node", "vitest/globals"]` exactly. Not `@testing-library/jest-dom` — its default types entry augments jest's `Assertion`, not vitest's.
- `@types/node` is pinned to `^20` because `client/Dockerfile` uses `node:20` and `.github/workflows/client.yml` sets `node-version: 20`. The local machine running Node 24 is not the target.
- No ESLint. Biome 2.4 lints TypeScript natively and needs no config change.
- Do not add `vite-plugin-checker`.
- Existing comments in the converted config files carry weight (the `.ts.net` allowedHosts rationale, the `/rails` proxy rationale, the Vitest-vs-Playwright glob split). Preserve them verbatim. Do not add new comments narrating the TypeScript conversion.
- Every `package.json` change is followed by `./scripts/npm_install.sh` so the Docker `node_modules` volume matches.
- Commit messages follow the project convention: explain the why, no Claude attribution footer, no `Co-Authored-By` trailer.
- PR title: `refactor(ts): add TypeScript toolchain and type-check gate`.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `client/package.json` | Modify | Adds `typescript` + `@types/node` devDeps and the `typecheck` script |
| `client/tsconfig.json` | Create | The single compiler configuration for src, tests, and config files |
| `client/vite.config.ts` | Rename + edit | Build/dev/proxy config; also owns the Vitest block, now typed via `vitest/config` |
| `client/playwright.config.ts` | Rename + edit | E2E config; widens `testMatch` to accept `.spec.ts` |
| `client/tests/setup.ts` | Rename + edit | Vitest global setup; jsdom stubs need explicit casts under `strict` |
| `scripts/lint.sh` | Modify | Adds the TypeScript check after the Biome check |
| `.github/workflows/client.yml` | Modify | Adds `npm run typecheck` to the lint job |
| `CLAUDE.md` | Modify | Documents TypeScript conventions and the new `types/` folder |

---

### Task 1: Install the compiler and prove the type-check gate actually fails

**Files:**
- Modify: `client/package.json`
- Create: `client/tsconfig.json`
- Test: a throwaway `client/src/__typecheck_probe.ts`, deleted before commit

**Interfaces:**
- Produces: `npm run typecheck` in `client/` — exits non-zero on any type error in a `.ts`/`.tsx` file under `src/` or `tests/`. Every later task and wave depends on this command.

- [ ] **Step 1: Install the compiler**

```bash
cd client
npm install --save-dev typescript @types/node@^20
```

`@types/node` is pinned to `^20` to match the `node:20` runtime in `client/Dockerfile` and `node-version: 20` in CI, not the Node 24 on the local machine.

- [ ] **Step 2: Create `client/tsconfig.json`**

```json
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

- [ ] **Step 3: Add the `typecheck` script**

In `client/package.json`, add to `"scripts"`, immediately after `"lint:fix"`:

```json
"typecheck": "tsc --noEmit",
```

- [ ] **Step 4: Write the failing test — a file the compiler must reject**

Create `client/src/__typecheck_probe.ts`:

```ts
const daysUntilWater: number = 'three'
export default daysUntilWater
```

This is the test for "is the gate wired up at all". A `tsconfig.json` that silently matches no files, or an `include` that misses `src`, would otherwise pass forever while checking nothing.

- [ ] **Step 5: Run the gate and verify it FAILS**

```bash
cd client && npm run typecheck
```

Expected: exit code 1, with an error resembling:

```
src/__typecheck_probe.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.
```

If it passes, the `include` array is not picking up `src` — fix that before continuing.

- [ ] **Step 6: Verify unconverted `.jsx` produces no errors**

The probe error above should be the **only** error reported. If errors appear from files under `src/components/` or `src/hooks/`, then `checkJs` is being applied — re-check that `"checkJs": false` is set.

- [ ] **Step 7: Delete the probe and verify the gate PASSES**

```bash
cd client && rm src/__typecheck_probe.ts && npm run typecheck
```

Expected: exit code 0, no output.

- [ ] **Step 8: Sync the Docker node_modules volume**

```bash
cd /Users/rob/Development/PlantCare && ./scripts/npm_install.sh
```

- [ ] **Step 9: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/package.json client/package-lock.json client/tsconfig.json
git commit -m "build: add TypeScript compiler and type-check script

allowJs with checkJs off is what lets the 246 unconverted .jsx files coexist
with TypeScript for the length of the migration — every wave compiles green
without touching files it does not convert.

@types/node is pinned to ^20 to match the node:20 image and CI runner rather
than the newer Node on the dev machine."
```

---

### Task 2: Convert the three build and test config files

**Files:**
- Rename + edit: `client/vite.config.js` → `client/vite.config.ts`
- Rename + edit: `client/playwright.config.js` → `client/playwright.config.ts`
- Rename + edit: `client/tests/setup.js` → `client/tests/setup.ts`
- Test: the existing Vitest and Playwright suites, unchanged

**Interfaces:**
- Consumes: `npm run typecheck` from Task 1.
- Produces: Vitest `include` accepting `tests/**/*.test.{js,jsx,ts,tsx}` and Playwright `testMatch` accepting `**/*.spec.{js,ts}`. Waves 2–6 add `.ts`/`.tsx` test files against these globs; wave 6b narrows them back to TypeScript-only.

- [ ] **Step 1: Rename all three files with git**

```bash
cd /Users/rob/Development/PlantCare/client
git mv vite.config.js vite.config.ts
git mv playwright.config.js playwright.config.ts
git mv tests/setup.js tests/setup.ts
```

Using `git mv` keeps rename detection intact so the diff shows edits, not a delete-plus-add.

- [ ] **Step 2: Rewrite `client/vite.config.ts`**

Two changes beyond the rename: `defineConfig` now comes from `vitest/config` (which types the `test` key, replacing the `/// <reference types="vitest" />` pragma), and the Vitest `include` glob widens.

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // Allow the Tailscale Serve hostname (https://<machine>.<tailnet>.ts.net)
    // through Vite's host check, so mobile/remote access gets a secure
    // origin — required for geolocation + a real PWA install.
    allowedHosts: ['.ts.net'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://api:3000',
        changeOrigin: true,
        ws: true,
      },
      // ActiveStorage blob URLs (rails_blob_url only_path: true) are served
      // by Rails at /rails/active_storage/... — proxy them like /api so
      // uploaded photos render in dev.
      '/rails': {
        target: process.env.VITE_API_URL || 'http://api:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    // Component/unit tests live in tests/ mirroring the src/ layout
    // (e.g. src/components/ui/Action.jsx → tests/components/ui/Action.test.jsx).
    // Both extensions are accepted for the length of the TypeScript migration;
    // wave 6b narrows this back to .test.{ts,tsx}.
    include: ['tests/**/*.test.{js,jsx,ts,tsx}'],
    css: false,
  },
})
```

- [ ] **Step 3: Rewrite `client/playwright.config.ts`**

Only the `testMatch` line changes.

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  // Only match .spec files — Vitest owns .test.* for component tests.
  // Both extensions are accepted until wave 6b narrows this to .spec.ts.
  testMatch: '**/*.spec.{js,ts}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  // Always use the Vite dev server so /api proxy is in play. Locally we
  // attach to the already-running dev stack; in CI we boot a fresh one.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 4: Rewrite `client/tests/setup.ts`**

The two jsdom stubs are structural fakes that cannot satisfy their real interfaces, so each needs an explicit cast. `matchMedia` gains a `query: string` annotation; `ResizeObserver` needs `as unknown as typeof ResizeObserver` because a class with three no-op methods does not structurally match the constructor signature.

```ts
// Vitest setup — runs once before every test file.
// Extends expect() with @testing-library/jest-dom matchers
// (toBeInTheDocument, toHaveAttribute, toHaveClass, etc.).

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom doesn't implement matchMedia. Polyfill with a no-match stub so any
// breakpoint-sensing code (Dialog's mobile vs desktop variant, useReducedMotion)
// falls through to the desktop / no-match branch in unit tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia
}

// jsdom doesn't implement ResizeObserver. Stub it so components that observe
// element size (e.g. WizardDialog's height animation) render in unit tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// Unmount any components rendered by the previous test so state doesn't leak.
afterEach(() => {
  cleanup()
})
```

- [ ] **Step 5: Run the type-check gate**

```bash
cd client && npm run typecheck
```

Expected: exit code 0, no output. These three files are now type-checked for real (they are `.ts`, so `checkJs: false` no longer shields them).

If `tests/setup.ts` reports an error on the `matchMedia` assignment, the cast is missing or misplaced — it belongs on the outer `mockImplementation(...)` call, not inside the returned object.

- [ ] **Step 6: Run the unit suite and verify the widened glob still collects every test**

```bash
cd client && npm run test:unit
```

Expected: PASS, with the same test-file count as before the change. If the count drops, the `include` glob is wrong — `.test.{js,jsx,ts,tsx}` must still match the existing `.test.jsx` files.

- [ ] **Step 7: Verify the production build still resolves**

```bash
cd client && npm run build
```

Expected: exit code 0. This is a distinct check from `typecheck` — Vite resolves imports through the bundler and `tsc` through `moduleResolution: bundler` heuristics, and the two can disagree after a rename.

- [ ] **Step 8: Run the E2E suite against the widened `testMatch`**

The Rails API must be up (`docker compose up`) since the specs hit real endpoints.

```bash
cd client && npx playwright test
```

Expected: PASS, same spec count as before. A count of zero means `testMatch` is malformed.

- [ ] **Step 9: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add client/vite.config.ts client/playwright.config.ts client/tests/setup.ts
git commit -m "refactor(ts): convert build and test config to TypeScript

defineConfig now comes from vitest/config, which types the test block
directly and retires the triple-slash vitest reference.

Both runners accept .js and .ts test files for the length of the migration
so each wave can convert its own tests without a flag day; wave 6b narrows
the globs back to TypeScript-only."
```

---

### Task 3: Wire the type-check gate into lint.sh and CI

**Files:**
- Modify: `scripts/lint.sh:29` (after the Biome line)
- Modify: `.github/workflows/client.yml` (the `lint` job)

**Interfaces:**
- Consumes: `npm run typecheck` from Task 1.
- Produces: nothing further waves import. This task makes the gate non-optional.

- [ ] **Step 1: Write the failing test — confirm the gate is currently absent from lint.sh**

```bash
cd /Users/rob/Development/PlantCare && grep -c "typecheck" scripts/lint.sh
```

Expected: `0`. This is the state the task fixes.

- [ ] **Step 2: Add the TypeScript check to `scripts/lint.sh`**

Insert directly **after** the existing Biome line, so the check runs on Biome's auto-fixed output rather than racing it:

```bash
run_check "Biome (Client)" "cd client && npm run lint:fix"
run_check "TypeScript (Client)" "cd client && npm run typecheck"
```

Ordering matters: `lint:fix` rewrites imports (Biome's `useImportType` rule converts value imports of types into `import type`), so type-checking must observe the post-fix source. Reversing them produces a lint.sh run that can pass while the committed tree fails CI.

- [ ] **Step 3: Run lint.sh and verify the new check appears and passes**

Docker must be up — the RuboCop, Brakeman, and Bundler Audit checks run via `docker compose exec api`.

```bash
cd /Users/rob/Development/PlantCare && ./scripts/lint.sh
```

Expected: a `▶  TypeScript (Client)` section appears after `Biome (Client)` and reports `✓  TypeScript (Client) passed`.

Note: Bundler Audit is expected to fail on pre-existing gem CVEs unrelated to this work. That failure is known and tracked separately — do not attempt to fix it in this wave. The TypeScript check must pass.

- [ ] **Step 4: Add the typecheck step to the CI lint job**

In `.github/workflows/client.yml`, in the `lint` job, after the existing `Lint code` step:

```yaml
      - name: Lint code
        run: npm run lint

      - name: Type check
        run: npm run typecheck
```

The job already sets `defaults.run.working-directory: client`, so no `working-directory` key is needed on the new step.

Only the `lint` job changes. The `build` and `test` jobs stay as they are — `npm run build` and the Playwright run already cover their surfaces.

- [ ] **Step 5: Verify the workflow file still parses**

```bash
cd /Users/rob/Development/PlantCare && python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/client.yml')); print([s['name'] for s in d['jobs']['lint']['steps']])"
```

Expected output includes `'Type check'` as the last entry:

```
['Checkout code', 'Set up Node.js', 'Install dependencies', 'Lint code', 'Type check']
```

- [ ] **Step 6: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add scripts/lint.sh .github/workflows/client.yml
git commit -m "ci: gate on tsc --noEmit alongside Biome

Biome lints TypeScript syntax but does no type inference, so nothing would
catch a type error without a separate tsc pass.

The check runs after Biome's auto-fix rather than before it: lint:fix
rewrites type-only imports, and checking the pre-fix tree would let lint.sh
pass locally while CI fails on the committed source."
```

---

### Task 4: Document the TypeScript conventions in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` — the `### Client directory layout` section, the `### Tests` section, and the pre-commit gate section

**Interfaces:**
- Consumes: every convention decided in Tasks 1–3.
- Produces: the reference that waves 2–6 are reviewed against. Anything not written here gets re-litigated per wave.

- [ ] **Step 1: Add `types/` to the client directory layout tree**

In the `### Client directory layout` code block, add the folder in alphabetical position after `pages/`:

```
├── pages/            # route-level pages
├── types/            # domain types mirroring Rails as_json, one file per model
```

- [ ] **Step 2: Add a `### TypeScript` section**

Insert immediately **before** the `### Tests` section:

````markdown
### TypeScript

Migration in progress — `allowJs` is on, so `.jsx` and `.tsx` coexist until wave 6 lands.
Plan: `docs/superpowers/specs/2026-09-09-typescript-migration-design.md`.

**`.tsx` only when the file contains JSX.** Hooks that return JSX-free values stay `.ts`,
even in `hooks/`. Utils, types, config → `.ts`.

**`import type` for type-only imports.** `verbatimModuleSyntax` is on, so this is enforced,
not stylistic. Biome's `useImportType` auto-fixes the ones you forget.

**Domain types live in `src/types/`, one file per Rails model noun.** No barrel `index.ts` —
same rule as `errors/`. Import the file you need.

- **Mirror `as_json` field-for-field, snake_case preserved.** No camelCase transform at the
  boundary; the server owns the shape and a rename layer is a second place to drift.
- **Dates are `string`, never `Date`.** They arrive as ISO strings and are never parsed.
- **Literal unions mirror Rails constants** (`WaterStatus`, `LightLevel`, `CareType`). This is
  a shape declaration, not a business calculation — the modifier *values* stay server-side.
  It is the one accepted drift surface in the client; keep the unions greppable against the
  models.

**`unknown` plus narrowing over `any`.** A literal `any` needs a comment saying why — which
clears the comment bar, since "why this is untyped" is a constraint the code can't express.
`@ts-expect-error`, never `@ts-ignore`: the former fails once the underlying problem is fixed.

**Compound components use `Object.assign`.** `Card.Header = Header` after a `function Card()`
declaration is a strict-mode error. Write `export default Object.assign(Card, { Header, Body,
Footer, Meta })` — TypeScript infers the statics with no interface to maintain.

**Polymorphic components take a discriminated union, not a widened prop bag.** `Action` renders
`Link` / `<a>` / `<button>` by branch, so its props are a union with `to?: never` / `href?: never`
members that stop callers passing both. Components forwarding into it (`ActionIcon`) inherit
that union rather than re-declaring one.

**`useState` with a null initial value needs an explicit generic.** `useState(null)` infers
`null` and rejects every later set. The form-error pattern becomes
`useState<FieldError | null>(null)`.
````

- [ ] **Step 3: Add typecheck to the pre-commit gate**

In the `## Pre-commit gate (every ticket)` section, amend step 1:

```markdown
1. **Tests green** — `./scripts/run_tests.sh` (vitest + the Playwright specs the change touches) and `cd client && npm run typecheck`.
```

- [ ] **Step 4: Note the two test extensions in the Tests section**

In `### Tests`, replace the two-extension note with:

```markdown
- `.test.tsx` / `.test.ts` — Vitest (RTL, `renderHook`, `vi.mock`)
- `.spec.ts` — Playwright, under `tests/pages/` or `tests/e2e/`

Two extensions are how Vitest and Playwright tell their files apart — don't cross.
`.test.jsx` and `.spec.js` still exist and still run while the TypeScript migration is in
flight; don't add new ones.
```

- [ ] **Step 5: Verify no other CLAUDE.md section contradicts the new one**

```bash
cd /Users/rob/Development/PlantCare && grep -n "\.jsx\|\.js\b" CLAUDE.md | grep -v "^.*globals.css"
```

Read the hits. The `Foo.test.jsx` example in the Tests layout rule and the `src/components/ui/Action.jsx` example in the Vitest include comment are illustrative of *placement*, not extension policy — leave them. Fix anything that states an extension as a rule.

- [ ] **Step 6: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add CLAUDE.md
git commit -m "docs: codify TypeScript conventions for the migration

Waves 2-6 are reviewed against this section; a convention that only lives in
the spec gets re-litigated once per wave."
```

---

### Task 5: Run the pre-commit gate and open the PR

**Files:** none modified — this task verifies and ships Tasks 1–4.

- [ ] **Step 1: Run the full test suite**

```bash
cd /Users/rob/Development/PlantCare && ./scripts/run_tests.sh
```

Expected: both API and client suites pass. The API is untouched by this wave; an API failure means something pre-existing, not something caused here.

- [ ] **Step 2: Run the type-check gate one final time**

```bash
cd client && npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 3: Comment audit over the diff**

```bash
cd /Users/rob/Development/PlantCare && git diff main...HEAD -- client/ scripts/ .github/
```

Check every added comment against the project bar: it must carry a constraint the code can't express. The preserved comments (`.ts.net` allowedHosts, `/rails` proxy, jsdom stubs, glob-narrowing-in-wave-6b) qualify. Delete anything that narrates the conversion itself.

- [ ] **Step 4: Skip the review triad, with reason**

- `/accessibility` — skip: no markup or component changed.
- `/react-best-practices` — skip: no React component or hook changed.
- `/dhh-rails-reviewer` — skip: no Rails change.

Record these skips in the PR body. The triad returns in wave 3 when `components/ui/` converts.

- [ ] **Step 5: Run lint last**

```bash
cd /Users/rob/Development/PlantCare && ./scripts/lint.sh
```

Expected: Biome, RuboCop, Brakeman, and the new TypeScript check pass. Bundler Audit's pre-existing gem CVE failures are out of scope.

If Biome's auto-fix modifies anything, commit that fix before opening the PR.

- [ ] **Step 6: Push and open the PR**

```bash
cd /Users/rob/Development/PlantCare
git push -u origin refactor/typescript-foundation
gh pr create --title "refactor(ts): add TypeScript toolchain and type-check gate" --body "$(cat <<'BODY'
## Summary

Wave 1 of the client TypeScript migration. Stands up the compiler, the config, and the
type-check gate; converts the three build/test config files. No file under `src/` changes.

`allowJs: true` with `checkJs: false` is the load-bearing choice — the 246 unconverted
`.jsx` files are parsed but not type-checked, so this wave and every wave after it
compiles green without touching files it isn't converting.

Type-checking is a new gate rather than a Biome feature: Biome lints TypeScript syntax
but performs no type inference. `tsc --noEmit` runs after Biome in `lint.sh` and in CI,
because Biome's auto-fix rewrites type-only imports.

Design: `docs/superpowers/specs/2026-09-09-typescript-migration-design.md`
Plan: `docs/superpowers/plans/2026-09-09-typescript-wave-1-foundation.md`

## Test plan

- [x] `npm run typecheck` — passes; verified it *fails* on a deliberate type error before wiring
- [x] `npm run test:unit` — same test count as before the glob widened
- [x] `npm run build` — production build resolves after the config renames
- [x] `npx playwright test` — same spec count as before `testMatch` widened
- [x] `./scripts/lint.sh` — new TypeScript check present and green

Review triad skipped with reason: no markup, no React component or hook, no Rails change.
It returns in wave 3 when `components/ui/` converts.
BODY
)"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement (wave 1 scope) | Task |
|---|---|
| `typescript` + `@types/node` devDeps | 1.1 |
| Single `tsconfig.json`, exact compilerOptions | 1.2 |
| `typecheck` npm script | 1.3 |
| Gate verified to actually catch errors | 1.4–1.7 |
| `vite.config.ts` | 2.2 |
| `playwright.config.ts` | 2.3 |
| `tests/setup.ts` | 2.4 |
| Transitional Vitest glob | 2.2 |
| Transitional Playwright `testMatch` | 2.3 |
| `lint.sh` check, after Biome | 3.2 |
| CI lint-job typecheck step | 3.4 |
| CLAUDE.md TypeScript section | 4.2 |
| `types/` in the directory-layout tree | 4.1 |
| `./scripts/npm_install.sh` after package.json change | 1.8 |
| Full pre-commit gate before PR | 5 |

No gaps.

**Placeholder scan:** none. Every code step carries the literal file content or command.

**Type consistency:** the only cross-task interface is the `npm run typecheck` script name, used identically in Tasks 1, 2, 3, 4, and 5. `setupFiles: './tests/setup.ts'` in Task 2 Step 2 matches the filename created in Task 2 Step 1.

**Out of scope, deliberately:** `src/main.jsx` calls `createRoot(document.getElementById('root'))`, which returns `HTMLElement | null` and will need a non-null assertion or guard under `strict`. That file converts in wave 5, not here — `checkJs: false` means it raises nothing in the meantime.
