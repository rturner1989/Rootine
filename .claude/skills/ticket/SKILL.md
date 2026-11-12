---
name: ticket
description: Use when the user wants to create a structured work ticket with requirements and acceptance criteria for a feature, task, or bugfix. Invoked with /ticket or when the user asks to create a ticket, story, or task card.
---

Create a structured work ticket — like a Jira story, but without the PM overhead. The goal is a ticket that a sole developer (Rob) can open, understand in 60 seconds, and start working on **without needing to transcribe a plan, and without being left guessing what they're building**. Output as a self-contained, styled HTML file.

## Audience

This project's tickets are written for Rob, and his profile is specific. **Get the calibration right** — both extremes (treating him as a React beginner OR as a returning React pro) are wrong.

**Who he is now:** a mid-level professional developer with deep Rails/backend experience. Years of production Rails, mature instincts around architecture, testing, deployment, performance.

**Who he was when he learned React:** a *hobbyist learning to code for the first time*, around four years ago, when React 18 was new. He has React projects in his GitHub history from that era, but they reflect a beginner's grasp — not a working React professional's mastery. Since then he's matured into a senior dev via Rails, and React has gone cold.

**What this means for tickets:**

- **Don't talk down on coding fundamentals.** He's a senior dev. He understands software architecture, performance trade-offs, testing patterns, CI/CD. Skip beginner programming context.
- **Don't assume deep React mental models.** He saw `useState`/`useEffect`/JSX/props as a hobbyist beginner four years ago. He remembers the *shapes* but the deeper "why" is hazy: render cycles, dependency array gotchas, the rules of hooks, when re-renders happen, state-vs-ref, controlled-input pattern, StrictMode double-fire, the difference between local state and lifted state. These deserve **light reminders when relevant** — not full tutorials, but not silent assumption either.
- **Anything new since React 18 is genuinely new to him:** `useDeferredValue`, `useTransition`, `<Suspense>` for data fetching, React 19 additions, the React Compiler, modern context patterns, TanStack Query (he probably used 2021-era patterns at best), Vite (he probably used CRA), Tailwind 4, route-level lazy loading, the protected-route async-loading trap. These deserve **full callouts**.
- **Rails analogies are real learning aids,** not just senior-dev cheat sheets. He's fluent in Rails — the Rails ↔ React mapping table genuinely helps him bridge concepts, not just confirm an already-correct mental model.

**The test for "should I explain this?":**

> Would a smart, rusty hobbyist-level React user — backed by years of professional Rails dev maturity — need to look this up to use it confidently in this ticket?

- **Yes** → include a short callout (2–4 sentences, no code, "what is it / why care").
- **No** → skip silently. Don't pad.

**Three-tier triage for React concepts:**

| Concept type | Treatment |
|---|---|
| Foundational React he saw as a beginner (useState, JSX, props, basic useEffect, components) | **Light reminder when relevant** — one-line, in passing, not a full callout |
| Advanced foundations he probably never internalised (dep array gotchas, render timing, refs vs state, controlled inputs, hook rules, StrictMode, lifting state) | **Short callout** — 2–3 sentences with the "why" |
| New since React 18 / library-specific patterns (Suspense for data, useDeferredValue, TanStack Query, route-level lazy, modern context) | **Full callout** — 3–4 sentences, with a Rails analogy if it genuinely helps |

This calibration is the single most important thing in the skill. If you get it wrong in either direction, Rob will tell you — and when he does, update both this section AND `~/.claude/projects/-Users-rob-Development-PlantCare/memory/user_learning_react.md` at the same time so the two sources don't drift apart.

## Process

1. **Gather context** — read the user's request (arguments or conversation context). If vague, ask ONE clarifying question. Don't over-interview.

2. **Check for existing tickets** — scan `docs/tickets/` in the project root. Auto-increment from the highest existing `TICKET-NNN.html`. Starts at `TICKET-001` if the directory is empty.

3. **Find design references automatically** — search the project for relevant context. Read the files, don't ask the user:
   - **Tech design doc** at `docs/tech-design-docs/` — if one covers this feature, its Scope, Technical highlights and APIs are **settled decisions**: carry them in, cite the section (`§6.2`), don't re-ask them. Only its Open questions are still open. If the code now contradicts the doc, say so in the ticket's Notes and suggest `/sync-tech-design-doc` rather than quietly diverging.
   - **Design specs** at `docs/specs/` — find and quote relevant sections
   - **Mockup files** at `docs/mockups/` — find related HTML mockups and link to them
   - **Implementation plans** at `docs/plans/` — find relevant task/step details
   - **Existing code** — note relevant files that will be created or modified, with `file:line`. **Check the request's premises against the code.** Tickets get written from memory; when a premise is wrong ("the endpoint already returns X"), the ticket states the correction and its evidence. An existing endpoint or component isn't reusable just because it exists — check its access rule, rows, order and fields against what this ticket needs.
   - **Numbers** — where a decision turns on how common something is, measure it (read-only, via `./scripts/console.sh`) and put the count in the ticket.
   - Include only references that are genuinely useful for this ticket. Don't pad.

4. **Settle open questions before writing.** One the code or data can answer → answer it in the ticket. One that needs Rob (a product call) → ask with `AskUserQuestion`, recommendation first, and record the answer as a decision. One that needs someone or something else → mark it open in the section it blocks. **Never create a ticket for a question**, and list follow-ups in your reply rather than ticketing them.

5. **Identify where this ticket fits in the plan.** What ticket(s) came before? What does this ticket unlock for later tickets? Every ticket needs a "Where this fits" paragraph anchored in the wider plan.

6. **List the concrete artifacts.** What files/components/screens will exist when this is done? Each gets a one-sentence description of its *job* (not its code). This is the "What you're building" section — the missing middle between abstract outcomes and prescribed code.

7. **Generate the HTML ticket** using the template structure below. Self-contained, styled, opens in any browser.

8. **Save directly** to `docs/tickets/TICKET-NNN.html` — no approval step. Tell the user:
   ```
   open docs/tickets/TICKET-NNN.html
   ```

9. **Print a one-line confirmation.** Ticket number + title + path. Nothing more.

## HTML Template Structure

Every ticket has these sections in this order. **None are optional** — if a section genuinely doesn't apply, explain why in one line rather than omitting it silently.

```
┌──────────────────────────────────────────────┐
│ TICKET-NNN                                   │
│ [Title]                                      │
│ Status: Open  Priority: High                 │
├──────────────────────────────────────────────┤
│ SUMMARY                                      │
│ 2–3 sentences. What this ticket delivers.    │
│ End with a one-line "in one sentence:" pitch │
├──────────────────────────────────────────────┤
│ WHERE THIS FITS                              │
│ Progress strip across the full plan.         │
│ What came before (the groundwork).           │
│ What this unlocks (the follow-ons).          │
│ Optional: mental model / Rails analogy.      │
├──────────────────────────────────────────────┤
│ WHAT YOU'RE BUILDING                          │
│ Concrete list of artifacts, each with a     │
│ one-sentence role description. Optional     │
│ ASCII structure diagram showing how they    │
│ fit together.                                │
├──────────────────────────────────────────────┤
│ REQUIREMENTS                                 │
│ Outcome-focused, numbered, testable.        │
├──────────────────────────────────────────────┤
│ ACCEPTANCE CRITERIA                          │
│ Browser/DevTools-checkable conditions.      │
├──────────────────────────────────────────────┤
│ DESIGN REFERENCES                            │
│ Mockup previews (iframes), spec excerpts,   │
│ plan reference link.                         │
├──────────────────────────────────────────────┤
│ REACT CONCEPTS WORTH LOOKING UP              │
│ Short explainers for the React-specific    │
│ things this ticket will touch. Use Rails   │
│ analogies where they help.                   │
├──────────────────────────────────────────────┤
│ RAILS ↔ REACT MENTAL MAP                     │
│ Filtered table: only the rows relevant to   │
│ this ticket. See mapping library below.     │
├──────────────────────────────────────────────┤
│ RELATED FILES                                │
│ File list with create/modify/extend tags.   │
│ Flagged as "a shape hint, not a spec."      │
├──────────────────────────────────────────────┤
│ NOTES & GOTCHAS                              │
│ Don't-touch-this warnings, common errors,   │
│ closing checklist (lint + tests + PR).      │
└──────────────────────────────────────────────┘
```

### Section-by-section guidance

#### Summary
Two or three sentences describing what this ticket delivers in plain language. Close with `<p>In one sentence: <strong>...</strong></p>` — a single elevator-pitch line that Rob can skim and instantly grok.

#### Where this fits
The "big picture" section. This is what prevents Rob from feeling lost as a sole developer with no standups or team to orient him. Must contain:

- **Progress strip** — a row of small pills representing every ticket in the plan, with:
  - `done` styling for already-completed tickets
  - `current` styling for the one you're writing now
  - plain styling for future tickets
  - Collapse later tickets into ranges (e.g. "08–14 Screens & polish") to keep it scannable.
- **What came before** — one paragraph naming the immediately preceding tickets by number and explaining what they delivered.
- **What this unlocks** — one paragraph naming the next 2–3 tickets this ticket is a prerequisite for, and why.
- **Mental model** (when useful) — a one-line Rails analogy. Example: *"Mental model: this ticket is Rails' `application.html.erb` + `routes.rb` + a `before_action :authenticate` filter, all at once."* Not every ticket needs this, but if there's a clean Rails parallel, include it.

#### What you're building
This is the section that answers "what am I actually making?" — the missing middle between abstract requirements and copy-paste code. Rob has flagged that pure outcome-only prose leaves him unable to picture the deliverable. Must contain:

- **Artifact list** — one entry per file/component/major piece. Each entry has:
  - A **kind tag** (component / page / rewrite / extend / util / hook / style, etc.)
  - The **file path** (monospace)
  - A **2–3 sentence role description** explaining what this artifact's *job* is. Not how to write it — *what it's for*. Example: *"ProtectedRoute: a small wrapper whose only job is 'am I logged in?'. If yes, it renders its children. If no, it redirects to /login and remembers where the user was trying to go so Login can bounce them back after auth. While initial session-restore is in flight, it shows a spinner — this is what prevents the login flash on refresh."*
- **Structure diagram** (when useful) — an ASCII tree showing how the artifacts nest or wire together. Use for tickets that introduce multi-component hierarchies. Skip for tickets that produce one file.
- **Placeholder note** — if this ticket produces scaffolding that will be filled in by later tickets, say so explicitly so Rob doesn't over-engineer the placeholder.

#### Requirements
Numbered, outcome-focused, never action-focused. Each requirement is a condition that describes the finished state.

- ✅ *"Unauthenticated users visiting a protected route get redirected to `/login`, and the location they were trying to reach is remembered so login can bounce them back."*
- ❌ *"Create `ProtectedRoute.jsx` that uses `useAuth()` and returns `<Navigate to='/login' />` if no user."*

The first describes *what the app does*. The second prescribes *how to code it*. Always write the first kind.

Cover, where they apply:
- **States** — loading, error, empty, populated. Say which have a mockup frame; often empty/error don't (mockups 28 + 32 cover per-page empty/error states).
- **Access** — the scoping rule (`current_user.…`) and what someone who fails it sees. Withheld, not empty: an empty card asserts something false.
- **Cache** — what makes the data refetch after a write (see CLAUDE.md "Mutation cache pattern").

#### Acceptance criteria
Things Rob can literally check by clicking around in a browser or opening DevTools. Not code-review items.

- ✅ *"Visiting `/this-does-not-exist` shows the 404 page, not a blank screen."*
- ✅ *"Refreshing the page while logged in does NOT briefly flash the login screen."*
- ✅ *"DevTools → Network: navigating from `/` to `/house` fetches a new JS chunk."*
- ❌ *"The code uses `React.lazy` for all pages."*

Tag each criterion with how it's checked: *(UI)* seen in the running app, *(test)* an automated assertion, *(data)* a database or response check. Every rule a builder could plausibly get wrong (a status mapping, an access edge, an empty-list case) gets its own box. `/review-ticket` reports against these tags.

Always end with *"pre-commit gate passes"* as a trailing criterion.

#### Design references
- **Mockup iframes** — embed related mockups from `docs/mockups/` with `<iframe>` previews (360px tall, full width). Use relative paths: `../mockups/plantcare-ui/01-today-mobile-urgent-and-care-animation.html`. Include an "Open ↗" link next to the iframe label.
- **Spec excerpts** — quote the specific paragraphs from `docs/specs/` that inform this ticket. Use styled blockquotes. Don't copy the whole spec — just the bits that matter.
- **Plan reference** — a styled link to the implementation plan with the task number. Explicitly frame it as *"one worked example, not a script to transcribe."*
- **Scope-limiting callout** — if the mockup shows more than this ticket builds, spell out what's in scope vs. out of scope for this ticket. Prevents Rob from trying to build everything at once.

#### React concepts worth looking up
A series of highlighted callouts (use `.learn` styling) explaining the React concepts this ticket will touch. Calibrated for Rob's specific profile: senior dev maturity, hobbyist-level React from 4 years ago that's gone cold (see Audience section above for the full picture). Purpose: give him enough to google the right thing, not to hand him the answer, and not to re-teach things he doesn't need re-taught.

**Pick 3–6 concepts per ticket using the three-tier triage from the Audience section.**

**Tier 1 — full callouts (always include if relevant to the ticket):**
- `useDeferredValue` and `useTransition` — added in React 18, post-dates his hobby learning
- `<Suspense>` for data fetching (not just lazy components) — much newer than the 2021 patterns
- Route-level code splitting with `React.lazy` + `<Suspense>`
- TanStack Query patterns: `useQuery`, `useMutation`, query keys, cache invalidation, `enabled`, `staleTime` vs `gcTime`
- React Router v7: layout routes, `<Outlet />`, route `state` channel for redirect-back, `useNavigate` vs `<Link>`
- Vite-specific things: `import.meta.env`, dev-vs-build differences (he probably used CRA)
- Tailwind 4: the new `@theme` block, CSS-variable design tokens
- React Compiler / "auto-memo" signals — what to write differently now
- Modern context patterns and when context is enough vs when you need a store
- The protected-route async-loading trap (the "login flash on refresh" bug)
- When NOT to reach for `useMemo`/`useCallback` — Vercel's `rerender-simple-expression-in-memo` rule

**Tier 2 — short callouts (include if the ticket has a real gotcha around them):**
- `useEffect` dependency arrays — closures, stale captures, the "why does my effect not re-fire" trap
- StrictMode double-fire and how to write effects that survive it
- Refs vs state — when to reach for `useRef`
- Controlled inputs and form state ownership
- Lifting state up — when local state stops being enough
- The rules of hooks (no conditional hooks, top-level only) — he's seen them but may not remember why
- Render cycles — when do components re-render, and why
- Keys in lists and reconciliation

**Tier 3 — light one-line reminders (in-passing, NOT full callouts):**
- What `useState` is
- What JSX/props/components are
- That `useEffect` runs after render

Each Tier 1 or Tier 2 callout is 2–4 sentences. Always answer "what is this and why do I care in *this ticket*", never paste code. If a Rails parallel genuinely helps bridge the concept, include it — Rails analogies are a real learning aid for Rob, not decoration.

#### Rails ↔ React mental map
A filtered table of entries from the mapping library below (see "Rails ↔ React mapping library"). Include only rows relevant to this ticket — usually 3–8 rows. This is Rob's **translation key**, not a remedial bridge: he uses it to confirm his mental model maps correctly between the two ecosystems, not to learn React for the first time. Think of it as the kind of cheat sheet a senior dev pins next to their monitor when context-switching between stacks, not a beginner's tutorial.

Format:

```html
<table class="rails-map">
  <thead>
    <tr><th>Rails</th><th>React equivalent in this ticket</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>app/views/layouts/application.html.erb</code></td>
      <td><code>Layout.jsx</code></td>
      <td>The persistent frame around every authenticated page</td>
    </tr>
    ...
  </tbody>
</table>
```

#### Related files
A simple list with action tags (`create`, `rewrite`, `extend`, `minor tidy`). **Always** close with: *"This is a shape hint, not a spec. If you find a cleaner split during implementation, follow your nose."*

#### Notes & gotchas
- Things not to touch (with the reason)
- Common errors and how to recognise them
- Scope-limiting reminders ("don't try to build X here — that's ticket N")
- Out-of-scope items each name where they go: a ticket number, or "not planned"
- Closing checklist: the CLAUDE.md pre-commit gate (tests → comment audit → review triad → lint last) → commit on a branch → PR

## Rails ↔ React mapping library

This is a standing library the ticket writer draws from. When writing a ticket, include only the rows that are relevant to the work in question. Do not paste the whole table into every ticket.

| Rails | React / frontend equivalent | Notes |
|---|---|---|
| `app/views/layouts/application.html.erb` | `Layout.jsx` with `<Outlet />` | The persistent frame |
| `<%= yield %>` | `<Outlet />` | The slot where child content renders |
| `config/routes.rb` | `<Routes>` + `<Route>` inside `App.jsx` | Declarative route table |
| `before_action :authenticate_user!` | `<ProtectedRoute>` wrapper component | Guards pages behind auth |
| `redirect_to login_path` | `<Navigate to="/login" />` | Imperative navigation from render |
| `rescue_from ActionController::RoutingError` | `<Route path="*" element={<NotFound />} />` | Catch-all 404 |
| `current_user` helper | `useAuth()` hook reading `AuthContext` | Current user via context |
| Controller action + view | Page component in `client/src/pages/` | One component per screen |
| Partial (`_card.html.erb`) | Reusable component in `client/src/components/` | Imported, not rendered from a string |
| Instance variables (`@plants`) | `useQuery({ queryKey: ['plants'], ... })` | Fetched on render, cached |
| `render json: @plant` | `usePlant(id)` hook + render JSX | Client fetches via API wrapper |
| `flash[:notice]` | Toast library or local state | No built-in equivalent |
| `link_to 'Today', root_path` | `<Link to="/">Today</Link>` or `<NavLink>` | Client-side nav, no full page reload |
| `button_to` with `method: :delete` | `useMutation` + `onClick` handler | TanStack Query manages the request |
| `form_with model: @plant` | Controlled form + `useMutation` on submit | You own the state; `useState` per field (or `useReducer`) |
| `validates :name, presence: true` (client-side hint) | Local validation in form component | Server still validates; client is UX |
| `helper_method :format_date` | Plain utility function imported where needed | No magic — just an import |
| `before_filter :set_plant` | `const { data: plant } = usePlant(id)` at the top of the page component | Fetching-as-side-effect, not controller method |
| `turbo_stream` / `turbo_frame` | `queryClient.invalidateQueries(['plants'])` after mutation | TanStack refetches invalidated keys automatically |
| `application.css` / Sprockets | `index.css` + Tailwind classes in JSX | Utility-first, compiled by Vite |
| Session cookies | JWT access token (memory) + refresh cookie (httpOnly) | See `api/client.js` |
| `rails console` | React DevTools + `console.log` | No REPL for live component state |
| `rails test` / `rails routes` | `npm test` / route list is `App.jsx` | Routes live in code, not a config |
| `config.action_controller.perform_caching` | TanStack Query's `staleTime` / `gcTime` | Cache lives in memory, not Redis |
| `respond_to do |format|` | Not needed — API returns JSON, client renders JSX | Content negotiation is a non-issue |
| `render 'shared/header'` | `<Header />` component import | Components are first-class, not strings |
| `link_to` with `data: { turbo_method: :delete }` | `<button onClick={() => mutation.mutate()}>` | No framework sugar — you wire it yourself |
| Rails asset pipeline precompile | `vite build` | Different but same idea: bundle for production |
| `params.expect(plant: [...])` | Manually pick fields in the submit handler | No strong-params equivalent on the client |
| `RAILS_ENV` | `import.meta.env.MODE` | Vite env via `import.meta.env` |
| `I18n.t('hello')` | No built-in — use a library if needed | Not in MVP scope for PlantCare |

*Add new rows to this table as new React concepts come up in tickets.* When you use a concept in a ticket that isn't in the table yet, add it here at the same time — so the library grows with the project.

## Styling

Use this baseline CSS. The key additions over the original template are `.plan-strip`, `.artifact`, `.shape`, `.learn`, and `.rails-map` — these power the new sections.

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: #f5f5f0;
  color: #1a1a1a;
  padding: 40px;
  line-height: 1.6;
}
.ticket {
  max-width: 960px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  overflow: hidden;
}
.header {
  background: #1a1a2e;
  color: #fff;
  padding: 32px 40px;
}
.header .id { font-size: 13px; opacity: 0.6; letter-spacing: 0.1em; text-transform: uppercase; }
.header h1 { font-size: 28px; font-weight: 700; margin: 8px 0 16px; }
.badges { display: flex; gap: 8px; }
.badge {
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
}
.badge.status { background: #2d6a4f; color: #fff; }
.badge.priority-high { background: #e63946; color: #fff; }
.badge.priority-medium { background: #f4a261; color: #1a1a1a; }
.badge.priority-low { background: #a8dadc; color: #1a1a1a; }
section { padding: 28px 40px; border-top: 1px solid #eee; }
section h2 {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #666;
  margin-bottom: 16px;
}
section > p { font-size: 15px; margin-bottom: 12px; }
ol, ul { padding-left: 20px; }
li { margin-bottom: 10px; font-size: 15px; }

/* Progress strip — "Where this fits" */
.plan-strip {
  display: flex;
  gap: 4px;
  margin: 16px 0 20px;
  flex-wrap: wrap;
}
.plan-step {
  flex: 1;
  min-width: 80px;
  padding: 10px 8px;
  text-align: center;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: #f0f0ea;
  color: #888;
  border: 1px solid transparent;
}
.plan-step.done { background: #d8ecdc; color: #2d6a4f; }
.plan-step.current { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
.plan-step .num { display: block; font-size: 10px; opacity: 0.6; margin-bottom: 2px; }

/* Artifact cards — "What you're building" */
.artifact-list {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}
.artifact {
  padding: 14px 18px;
  background: #f8faf8;
  border-left: 3px solid #2d6a4f;
  border-radius: 0 8px 8px 0;
}
.artifact .name {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
}
.artifact .role {
  font-size: 14px;
  color: #444;
  margin-top: 4px;
}
.artifact .kind {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 100px;
  background: #1a1a2e;
  color: #fff;
  margin-right: 8px;
  vertical-align: middle;
}
.artifact .kind.page { background: #2d6a4f; }
.artifact .kind.component { background: #1a1a2e; }
.artifact .kind.rewrite { background: #f4a261; color: #1a1a1a; }
.artifact .kind.extend { background: #f4a261; color: #1a1a1a; }
.artifact .kind.hook { background: #4a6fa5; }
.artifact .kind.util { background: #6a4a8f; }

/* Structure diagram */
.shape {
  background: #1a1a2e;
  color: #d4d4d4;
  border-radius: 8px;
  padding: 20px 24px;
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  margin-top: 12px;
  overflow-x: auto;
  white-space: pre;
}

/* Acceptance criteria */
.criterion { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.criterion .box {
  width: 18px; height: 18px;
  border: 2px solid #ccc;
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 3px;
}
.criterion span { font-size: 15px; }

/* Mockup previews */
.mockup-preview {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  margin: 12px 0;
}
.mockup-preview iframe {
  width: 100%;
  height: 360px;
  border: none;
  background: #fff;
}
.mockup-preview .label {
  padding: 10px 14px;
  background: #f5f5f0;
  font-size: 12px;
  font-weight: 700;
  color: #666;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mockup-preview .label a { color: #2d6a4f; text-decoration: none; font-weight: 700; }
.mockup-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 720px) { .mockup-grid { grid-template-columns: 1fr; } }

blockquote {
  border-left: 3px solid #2d6a4f;
  padding: 12px 16px;
  margin: 12px 0;
  background: #f8faf8;
  border-radius: 0 8px 8px 0;
  font-size: 14px;
  color: #444;
}
code {
  background: #f0f0ea;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'SF Mono', Consolas, monospace;
}

/* React concept callouts */
.learn {
  background: #fff8e8;
  border-left: 3px solid #f4a261;
  padding: 14px 18px;
  border-radius: 0 8px 8px 0;
  margin: 12px 0;
  font-size: 14px;
  color: #4a3a1a;
}
.learn strong { color: #7a5a1a; }

/* Rails ↔ React map */
.rails-map {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 8px;
}
.rails-map th {
  text-align: left;
  padding: 10px 12px;
  background: #1a1a2e;
  color: #fff;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}
.rails-map td {
  padding: 12px;
  border-bottom: 1px solid #eee;
  vertical-align: top;
}
.rails-map tr:last-child td { border-bottom: none; }
.rails-map td:nth-child(3) { color: #666; font-size: 13px; }

.plan-link {
  display: inline-block;
  padding: 8px 14px;
  background: #f0f0ea;
  border-radius: 6px;
  font-size: 13px;
  color: #444;
  text-decoration: none;
  margin-top: 8px;
}
.plan-link:hover { background: #e6e6de; }

.file-list { list-style: none; padding: 0; }
.file-list li {
  padding: 10px 14px;
  background: #f8f8f5;
  border-radius: 6px;
  margin-bottom: 4px;
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
}
.file-list .action {
  font-family: inherit;
  font-size: 11px;
  color: #888;
  font-weight: 700;
  text-transform: uppercase;
}
```

## Rules

These are the non-negotiables. Internalise them before every ticket.

### Voice and framing

- **Requirements are outcomes, not actions.** *"Unauth users bounce to /login"*, not *"Create ProtectedRoute.jsx with useAuth()"*. The first describes the finished state; the second dictates the implementation.
- **Acceptance criteria are browser-testable.** Things Rob can check by clicking, refreshing, or opening DevTools. Not code-review items like *"uses React.lazy"*.
- **Never paste code blocks from the plan into a ticket.** The plan has code; the ticket is the brief. Reference the plan as *"one worked example, not a script to transcribe"*.
- **Concrete before abstract.** Every ticket must have a "What you're building" section with named artifacts and their jobs. Pure outcome-only tickets leave Rob unable to picture the deliverable.
- **Orient Rob in the big picture.** Every ticket must have a "Where this fits" section — progress strip, what came before, what this unlocks. Rob is a sole developer with no team to orient him; the ticket has to do that work.

### Learning

- **Explain React concepts inline — but only the rusty/new ones.** Apply the test from the Audience section: *"would a competent React 18 dev returning after 4 years have to look this up?"* If yes, callout. If no (foundational stuff like useState, JSX, props, basic useEffect), skip. Wasted explainers are noise. Use Rails analogies only when they genuinely help, not for pedagogy.
- **Include a filtered Rails ↔ React mental map.** Pick the 3–8 rows from the mapping library that apply to this ticket. This is Rob's translation key.
- **Extend the mapping library.** If this ticket introduces a React concept not in the library yet, add a row at the same time you write the ticket.

### No unexplained jargon

- **No UI/design jargon without an inline gloss.** *Chrome*, *shell*, *viewport*, *above the fold*, *affordance*, *scrim*, *FAB* — either swap for plain language (*"persistent frame"*, *"wrapper around content"*) or define on first use.
- **No React jargon without context.** *Hydration*, *reconciliation*, *fiber*, *portal*, *transition* — explain what it means if you use it at all.
- **The design spec uses these terms freely; tickets should not.** A glossary note at the bottom is fine, but the main body should be self-explanatory.

### Scope

- **One ticket per logical unit of work.** Suggest splitting if it's really three things.
- **No time estimates. No story points. No sprints.** Priority is relative to other open tickets. High = do first.
- **Design references must be genuinely relevant.** Don't include every mockup — only the ones that inform this specific ticket. If the mockup shows more than this ticket builds, spell out what's in vs. out of scope.
- **Scope-limit scaffolding.** When a ticket produces placeholders that future tickets will replace, say so explicitly so Rob doesn't over-engineer the placeholder.

### Mechanics

- **Mockup iframes use relative paths.** `../mockups/plantcare-ui/01-today-mobile-urgent-and-care-animation.html`.
- **Close with a checklist.** Every ticket's Notes section ends with: *"When you're done: run the pre-commit gate from CLAUDE.md (tests + typecheck → comment audit → review triad → `./scripts/lint.sh` last), commit on a feature branch, then open a PR."*
- **File list is a shape hint.** Always annotate: *"If you find a cleaner split during implementation, follow your nose."*
- **Keep it scannable.** Rob should be able to open the ticket, glance at the summary, check the mockup preview, skim the artifacts, and start building within 60 seconds.
