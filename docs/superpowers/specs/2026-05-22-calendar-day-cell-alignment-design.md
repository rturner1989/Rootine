# Today ↔ journal calendar alignment (TICKET-068)

Date: 2026-05-22 · Status: approved (brainstorm) · Origin: TICKET-064 follow-up ([[project_today_week_journal_calendar_alignment]])

## Problem

Today's week strip (`today/week/WeekStrip.jsx`) and the journal Week/Month views
(`journal/WeekAgenda.jsx`, `journal/calendar/MonthGrid.jsx`) drifted after the
journal calendar matured through TICKET-062/064. Same domain (a day, its care),
different visual language:

- **Care colours diverge.** Today: water `bg-sky-deep`, feed `bg-sunshine-deep`.
  Journal: water `--color-water` (#4bb4d8), feed `bg-leaf`. Feed is a different
  *hue* (amber vs green) for the same concept.
- **"Today" marker diverges.** Today: coral dot. Journal: emerald eyebrow + mint
  row. Coral-for-today also *clashes* with coral's established meaning (overdue).

## Decisions (brainstorm, with Rob)

1. **Scope = shared visual language + shared atoms** (not full functional parity).
   The two surfaces serve different jobs and keep them: Today strip is a day-**picker**
   that drives the rituals list; journal is a **browser** of history + schedule.
2. **Architecture = shared atoms, two thin cells** (not one mega `<DayCell>`).
   Extract the genuinely-common pieces; Today chip and Month cell stay separate.
3. **Palette:** water = `--color-water` (#4bb4d8), feed = `bg-leaf` (green),
   "today" = emerald accent. **Coral reserved for overdue only.**
4. **Weather circle icons stay exactly as they are** (Today-only slot, untouched).

## Design

### Shared atom
- Promote `journal/calendar/dots.js` → **`components/care/dots.js`** (new care-domain
  folder, sibling to `plants/`, `spaces/`). It already owns the canonical dot
  vocabulary: `DOT_FILL` / `DOT_RING` / `DOT_LABEL` + `dotClass({ kind, variant })`
  (logged = filled, scheduled = ring, overdue = coral-pulse). Both surfaces import it.
- Update imports in: `MonthGrid`, `WeekAgenda`, `ScheduledRow`, `entries/Toolbar`
  legend (any current importer of `journal/calendar/dots`).

### Token reconciliation (the bulk of the visible change)
- `WeekStrip` count dots: `bg-sky-deep` → `--color-water`, `bg-sunshine-deep` →
  `bg-leaf`, sourced via the shared dot module's colour maps.

### Today-marker convention
- `WeekStrip`: retire the coral "today" dot → emerald accent (eyebrow/ring). Keep
  **today** (emerald) and **selected** (mint + leaf border + scale) distinguishable;
  a day can be both at once.
- `MonthGrid`: already emerald today — unchanged beyond the import re-point.

### Stays surface-specific (NOT changed — this was option C, rejected)
- Weather circles (`WeatherIcon`).
- Today's select→rituals interaction + `DayRituals`. Today keeps **forward task
  counts**; it does NOT gain the scheduled/overdue overlay.
- Journal's period navigation, day-detail popover, roving-tabindex keyboard nav.
- Week-agenda vertical full-entry layout.

## Testing & gates
- Move `dots.js`: re-point importers; add/extend a `care/dots` unit test.
- Update `WeekStrip` tests for new colour classes + today-marker.
- `today.spec` + `journal.spec` stay green.
- Review gates: `/accessibility` (dot aria, today-marker contrast) +
  `/react-best-practices`. DHH n/a — no backend changes.

## Out of scope / follow-ups
- No functional parity (rejected option C).
- Chip-remove tap-target + semantics/landmark audit are separate queued tickets.
