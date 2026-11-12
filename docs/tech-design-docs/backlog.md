# Tech docs backlog

Shipped features with no as-built tech design doc, ranked. `/backfill-tech-docs <feature>` writes one
per run; mark the row Documented when it lands. Reorder freely: later runs edit rows, they don't
regenerate the table.

**Inventory:** 2026-11-12, against `main` @ `2d9061c`.

- **Churn:** commits touching the feature's files in the last 6 months, with fix commits in brackets.
- **Fan-in:** files outside the feature that use its hooks, models or endpoints.
- **Tacit:** decisions living only in memory, CLAUDE.md, comments or fix commits. Rated by hand.

The April specs (`docs/specs/2026-04-*`) predate most of the v2 build, so Partial coverage from them
is probably out of date.

## Top band

| # | Feature | Coverage | Churn | Fan-in | Tacit | Main paths | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Plant care scheduling | Partial: CLAUDE.md "Plant Scheduling", MVP spec | 7 (3) | H 17 | H: TICKET-048 schedule anchor, overdue sweep dropped, server owns calculation | `api/app/models/plant.rb`, `care_schedule.rb`, `care_log.rb`, `client/src/utils/careStatus` | Documented: [2026-11-12-plant-care-scheduling.md](2026-11-12-plant-care-scheduling.md) |
| 2 | Auth & sessions | Partial: MVP spec §Authentication | 11 (2) | H 38 | H: refresh-cookie path coupled to cable mount (`api/config/routes.rb:14`), token rotation pending, trusted_proxies unset | `concerns/authenticatable.rb`, token models, `AuthContext`, `api/client.ts` | Documented: [2026-11-12-auth-and-sessions.md](2026-11-12-auth-and-sessions.md) |
| 3 | Species & Encyclopedia | Partial: encyclopedia space-matching spec | 34 (4) | M 8 | H: Perenual 100/day + cache, 7-day stale gate, cache-key bump rule | `species.rb`, `perenual_client.rb`, `pages/encyclopedia/` | Documented: [2026-11-12-species-and-encyclopedia.md](2026-11-12-species-and-encyclopedia.md) |
| 4 | Plants (CRUD + add flow) | Partial: UI spec §9–10 (v1) | 18 (5) | H 18 | H: space move is a silent no-op (open bug), self-managed AddPlant wizard | `plants_controller.rb`, `AddPlantContext`, `components/plants/` | Todo |
| 5 | Spaces & environment | Partial: WizardDialog spec | 18 (2) | H 15 | M: presets, archive, environment modifiers | `space.rb`, `controllers/api/v1/spaces/`, `House.tsx` | Todo |
| 6 | Journal + photos | Partial: calendar-alignment spec | 25 (4) | L 2 | H: TICKET-059–064, timeline + calendar merge, shared feed filtering | `journal_stream.rb`, `photo_feed.rb`, `feed_filtering.rb`, `components/journal/` | Todo |

## Mid band

| # | Feature | Coverage | Churn | Fan-in | Tacit | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 7 | Notifications | None | 13 (4) | L 5 | H: resolve / roll-off / close-on-nav lifecycle (#105), Organiser split, sweeper job | Todo |
| 8 | Onboarding | Partial: UI spec §7 (v1) | 9 (1) | M 11 | H: eager commit per step, resume from `step_reached` | Todo |
| 9 | Realtime (ActionCable) | None | 3 (0) | M 7 | H: three silent dev-setup gotchas, cookie path coupling. May fold into #2 or #7 | Todo |
| 10 | Today / dashboard | Partial: UI spec §5 (v1) | 12 (4) | L 6 | M: one-tap log vs Plant Detail dialog, intentionally split | Todo |
| 11 | Achievements | Partial: `docs/achievements.md` | 7 (2) | M 8 | M: Achievement is canonical, backfilling | Todo |
| 12 | API client + Zod boundary | Partial: TypeScript migration spec, CLAUDE.md | 10 (3) | H 24 | L: already written down | Todo |

## Low band

| # | Feature | Coverage | Churn | Fan-in | Status |
| --- | --- | --- | --- | --- | --- |
| 13 | Profile / Me | Partial: memory only | 10 (1) | L 2 | Todo |
| 14 | Weather | None (forecast-only rule lives in memory) | 2 (1) | L 2 | Todo |
| 15 | Organiser | None | 4 (1) | L 1 | Todo |
| 16 | Search | None | 6 (0) | M 8 | Todo |
