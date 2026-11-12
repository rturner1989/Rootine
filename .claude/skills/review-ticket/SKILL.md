---
name: review-ticket
description: Use when the user has finished work on a ticket and wants their changes reviewed against acceptance criteria, design spec, and implementation plan. Invoked with /review-ticket or when the user says review my ticket, check my work, or compare against spec.
---

Review completed work against the ticket's acceptance criteria, the design spec, and the implementation plan. Acts as a support agent that compares the user's solution with what was specified, highlights gaps, and suggests improvements. Not a rubber stamp — be honest and constructive.

## Process

1. **Identify the ticket** — check arguments for a ticket number (e.g. `/review-ticket 3`). If none given, ask which ticket to review, or list open tickets from `docs/tickets/` and let the user pick.

2. **Read the ticket file** — parse the HTML ticket at `docs/tickets/TICKET-NNN.html`. Extract:
   - Requirements (numbered list)
   - Acceptance criteria (checkbox items)
   - Related files
   - Design references (spec sections, mockup references, plan steps)

3. **Read the code changes** — get the diff for the current branch vs main:
   ```bash
   git diff main...HEAD --stat    # files changed
   git diff main...HEAD           # full diff
   ```
   If the user has already pushed a PR, also check `gh pr view` for the PR description.

4. **Read the design spec** — if the ticket references spec sections, read those sections from `docs/superpowers/specs/`. Focus on:
   - Component structure expectations
   - Palette tokens and typography rules
   - Interaction patterns
   - Layout specifications (mobile/desktop)

5. **Read the implementation plan** — if the ticket references plan tasks, read those tasks from `docs/superpowers/plans/`. Note the expected approach and file structure.

6. **Read the actual code** — for each file in the diff, read the full current version. Understand what was built, not just what changed.

   **Tech design doc** — if the ticket cites one in `docs/tech-design-docs/`, check the built contract (endpoint, params, `as_json` shape, access rule, cache keys) against the doc's APIs and Technical highlights. Any drift goes under Suggestions as either *doc wrong* (a deliberate mid-build decision → suggest `/sync-tech-design-doc`) or *code wrong* (nobody decided it → fix the code).

   **Run, don't infer.** Run the tests for what changed on their own (`./scripts/run_tests.sh api` / `client`, or the single file), so a failure isn't lost in a full run. A criterion marked PASS on a check you didn't run this session is UNCLEAR.

   **Tests that guard rules** — for each criterion tagged *(test)* that guards a rule (access scoping, status mapping, edge case), read the assertion and ask whether it would fail if the rule broke. When doubtful, offer to verify by mutation: break the line, run the named test, restore. A test that stays green against broken code is not a test.

7. **Produce the review** — output a structured review in the terminal covering all sections below.

## Review Output Structure

### Header
```
══════════════════════════════════════════
  TICKET REVIEW: TICKET-NNN
  [Ticket title]
  Branch: [branch name] · [N files changed]
══════════════════════════════════════════
```

### 1. Acceptance Criteria Checklist

Go through EVERY acceptance criterion from the ticket. For each one:

| Status | Meaning |
|---|---|
| PASS | Evidence in the code that this criterion is met |
| FAIL | Not implemented, or implemented incorrectly |
| PARTIAL | Started but incomplete, or only works in some cases |
| UNCLEAR | Can't determine from code alone — needs manual testing |

Format:
```
ACCEPTANCE CRITERIA
───────────────────
✅ PASS    — Fetch wrapper sends Authorization header with access token
✅ PASS    — 401 responses trigger automatic token refresh
⚠️ PARTIAL — Original request retried after refresh (retry works but no queue for concurrent requests)
❌ FAIL    — Failed refresh redirects to login (no redirect implemented)
❓ UNCLEAR — No tokens stored in localStorage (need to verify at runtime)
```

Be specific about WHY something passes or fails. Don't just say "FAIL" — say what's missing or wrong. Note how each was checked, matching the ticket's *(UI)* / *(test)* / *(data)* tag: a *(UI)* criterion with no running-app check is UNCLEAR, with what to look at listed.

### 2. Spec Compliance

Compare the implementation against the design spec. Check:

- **Palette tokens** — are the right CSS custom properties used? Are hex values hardcoded instead of using tokens?
- **Typography** — correct fonts, weights, sizes? Plus Jakarta Sans for UI, Fraunces for editorial display?
- **Component structure** — does the component hierarchy match what the spec describes?
- **Layout** — mobile-first? Correct breakpoints? Gradient background on authenticated screens?
- **Patterns** — glass dock, progress rings, care state mapping, personality voice system — do they match spec patterns?
- **Naming** — correct naming conventions? (House not Garden, Greenhouse not Dollhouse, etc.)

Format:
```
SPEC COMPLIANCE
───────────────
✅ Palette tokens used correctly — no hardcoded hex values
✅ Plus Jakarta Sans for UI chrome
⚠️ Fraunces not loaded on desktop page titles — spec says editorial display for desktop h1
❌ Background is solid white — spec requires mint gradient on all authenticated screens
✅ Component hierarchy matches spec §9 structure
```

### 3. Code Quality

Review the code itself (not against the spec, but as code). Look for:

- **Readability** — clear naming, reasonable file sizes, logical structure
- **React patterns** — proper hook usage, no unnecessary re-renders, clean state management
- **Tailwind usage** — using utility classes effectively, not fighting the framework
- **Error handling** — graceful failures, loading states, edge cases
- **Accessibility** — focus states, aria labels, keyboard navigation, touch targets
- **Security** — no tokens in localStorage, no XSS vectors, proper input sanitization

Format as bullet points. Be constructive — "Consider X instead of Y because Z" not just "Y is bad."

### 4. What's Done Well

Explicitly call out things the user did right. This is important — they're learning React, and positive reinforcement matters. Be specific:
- "The auth refresh retry logic is clean — the closure pattern keeps the token out of global scope"
- "Good use of TanStack Query's staleTime to avoid unnecessary refetches"

Not empty praise. Real observations about good decisions.

### 5. Suggestions for Improvement

Concrete, actionable suggestions. Prioritize by impact:

```
SUGGESTIONS
───────────
🔴 HIGH  — Add error boundary around the router to catch render crashes
🟡 MED   — The species search debounce is 100ms — bump to 300ms to reduce API calls
🟢 LOW   — Consider extracting the gradient CSS into a shared utility class
```

Each suggestion should explain WHAT to change, WHERE to change it (file + line if possible), and WHY it matters.

### 6. Summary Verdict

One of three outcomes:

- **SHIP IT** — all acceptance criteria pass, spec compliance is good, no high-priority issues. Ready to merge.
- **ALMOST** — most criteria pass, a few things to fix but nothing fundamental. List the specific items to address.
- **NEEDS WORK** — significant gaps in acceptance criteria or spec compliance. Outline what needs to happen before re-review.

```
VERDICT: ALMOST
───────────────
3 items to address before merge:
1. Add login redirect on failed token refresh (AC #4)
2. Apply mint gradient background to authenticated layout (spec §3.6)
3. Add loading spinner during auth state resolution (UX gap)

After fixing these, the ticket is ready to ship.
```

## Rules

- **Be honest, not harsh.** The user is learning React. Frame feedback as "here's how to make this better" not "this is wrong."
- **Every FAIL needs a fix suggestion.** Don't just flag problems — tell them what to do about it.
- **Spec is guidance, not law.** If the user deviated from the spec in a way that's actually better, say so. The spec isn't infallible.
- **Read the ACTUAL code, not just the diff.** The diff shows what changed, but you need the full file to understand the context.
- **Don't nitpick formatting.** Biome handles that. Focus on logic, structure, and design compliance.
- **Check the mockups.** If the ticket references a mockup file, open it and compare the visual intent against what was built. Note major visual discrepancies.
- **One review per ticket.** If there are issues, the user fixes them and runs `/review-ticket` again. Don't try to cover everything in one pass if the ticket is large — focus on the most important gaps first.
