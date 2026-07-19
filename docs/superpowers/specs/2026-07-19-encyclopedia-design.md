# Encyclopedia (R6) — Design

**Date:** 2026-07-19
**Status:** Approved for planning
**Mockup:** `docs/mockups/plantcare-ui/v2/25-encyclopedia-v1.html`
**Supersedes:** the open question in memory `project_encyclopedia_articles_sourcing.md`

## Problem

Encyclopedia is the last placeholder route in the app (`App.jsx` renders `<PlaceholderPage title="Encyclopedia" />`). It has been blocked since 2026-04-24 on an unresolved question: plant-care articles can't be admin-hand-written, because bad advice about pet safety or pest diagnosis damages trust in a way a solo project can't recover from.

## The reframe

The blocker is **dissolved, not answered.**

Encyclopedia's job is research-before-you-buy — look a plant up, understand what owning it involves, decide whether it suits your home. The differentiator is not authored articles but **what this app's own users do with that species**: how often they really water it, what light they keep it in, whether they keep up.

That is a fact about our users, not horticultural advice. No botanist, no licensing, no hallucination risk, no citation burden. It is also the one thing a competitor pulling the same Perenual feed cannot copy.

Articles are cut from v1 entirely. Nothing in this design blocks adding them later.

## Decisions

| Question | Decision |
|---|---|
| Core job | Research before you buy — extended info on species you may not own |
| Content source | Anonymous aggregates from our own users. No authored articles |
| Community data shape | Aggregates only. No shared entries, photos, consent flow, or moderation |
| Catalogue breadth | Grows organically; browse grid ranked by how many users grow each species |
| Articles | Cut from v1 |
| Plant Doctor card | Omitted until R13 ships — see Non-goals |

## Scope

### In

- `/encyclopedia` — search, filter, sort, browse grid
- `/encyclopedia/species/:id` — standalone species page with reference data + community block
- Structured pet-safety data
- Community aggregates endpoint
- Generic filter control extracted from Journal (own ticket, see Sequencing)

### Non-goals

- **Articles** of any kind. This is the whole point of the reframe.
- **A Plant Doctor entry card.** Mockup 25 features one, but R13 is still stubbed. Replacing three article placeholders with one Doctor placeholder is a lateral move on a page whose purpose is to *remove* the last placeholder. It slots in when R13 lands.
- **Shared user content** — entries, photos, attribution, moderation, reporting.
- **Pagination.** Per CLAUDE.md, the trigger is real volume; revisit past ~100 rows.
- **Bulk-seeding the catalogue.** Ruled out: ~10 days of runtime at Perenual's 100/day for 1,000 species, and nearly every seeded row would show an empty community block — blanking the differentiator on most pages.

## Information architecture

Two routes. The species page is genuinely new: Plant Detail's Species tab is scoped to a plant you already own, and the purpose here is researching plants you don't. `SpeciesView.jsx` is shared between both rather than forked.

```
/encyclopedia                 → PageHeader · search · filter chips · sort · species grid
/encyclopedia/species/:id     → Breadcrumb · hero · SpeciesView (reference) · CommunityStats · "Add to my home"
```

The mockup's `"4,812 species · 73 articles"` meta line becomes a real species count plus a grower count. The article count is dropped along with articles. If it reads thin at first, that is honest and it climbs on its own.

### Mockup filter chips vs available data

Mockup 25 shows four chips. Only two can be built truthfully:

| Chip | Status |
|---|---|
| Pet-safe | Ships — backed by `poisonous_to_pets` (see Backend) |
| Beginner | Ships — backed by existing `difficulty` |
| Tropical | **Cut.** No such concept in the schema. Approximating it from `humidity_preference` would be a guess dressed as a category |
| Air-purifying | **Cut.** Not in Perenual's payload; the popular claim traces to a 1989 NASA chamber study whose findings don't transfer to real rooms. Not a claim to make without a source |

A `light` axis is added in their place — it is the question people actually ask when researching a plant for a specific room, and the data already exists.

## Backend

### Pet safety

`PerenualClient#parse_toxicity` already receives `poisonous_to_pets` and `poisonous_to_humans` as booleans, then flattens them into a display string and discards the structure. The fix is to stop discarding it, not to parse the prose back out.

- Add nullable booleans `poisonous_to_pets`, `poisonous_to_humans`.
- Keep `toxicity` as the human-readable display string (already rendered in `SpeciesView`).
- Populate at ingest. Existing Perenual rows re-derive through the `refresh_if_stale!` 7-day gate; seed rows are set explicitly.

**Safety invariant: `NULL` means unknown and must never satisfy the Pet-safe filter.**

Query as `poisonous_to_pets = false`, never `NOT poisonous_to_pets`, and never a `LIKE '%non-toxic%'` over the display string. Absence of data must not render as a safety claim. This is the one defect in this feature that could get an animal hurt, and it needs a test asserting that an unknown-toxicity species is excluded from Pet-safe results.

Free-text values such as `"Non-toxic (but spiny)"` and `"Mildly toxic to pets (gel is safe for humans)"` are hand-written seed rows, not Perenual output — another reason not to build the filter on string matching.

### Community aggregates

Ownership resolves through `Plant → space → user` (`Plant` has `delegate :user, to: :space`).

| Stat | Derivation |
|---|---|
| Growers | `distinct count(user_id)` over plants of that species |
| Actual watering interval | Median gap between consecutive `care_logs` where `care_type = 'watering'` |
| Typical conditions | Mode of `space.light_level` across those plants |
| Kept on schedule | Share of plants whose `water_status != :overdue` |

The watering-interval stat is the valuable one: it contrasts the app's prescribed schedule with real behaviour — *"the app says every 7 days; people here water every 9."*

**Honesty constraint on the fourth stat.** `Plant#water_status` returns `:healthy`, but it measures schedule adherence, not plant health. It must be labelled as upkeep ("kept on schedule"), never as "thriving" or "healthy". Presenting user diligence as plant outcome is both misleading and mildly shaming. It remains genuinely useful for a buying decision — it answers "is this high-maintenance in practice?" — provided the label matches the measurement.

**Privacy floor: suppress the entire community block below 5 growers.** With one or two growers, "waters every 40 days" is not a pattern — it is one identifiable person's habits, deanonymisable by inference on a small user base. Below the floor the block is absent, not zeroed.

### Endpoint

`GET /api/v1/species` currently returns `popular_payload` (10 rows) when no `q` is present. Extend it with a browse mode:

- No query → **all** local species, ranked by grower count descending, then common name ascending. Species with zero growers still appear; they sort to the bottom rather than being hidden, so the grid never looks emptier than the catalogue actually is
- Filters: `pet_safe`, `difficulty`, `light`
- Sort: community rank (default), name, difficulty
- Facet counts for the filter chips, computed over the unfiltered local catalogue

Search is unchanged and already works: `search_with_api` tries local `pg_search` first and falls back to Perenual, and `find_or_fetch_from_api` **persists** any species a user opens. The catalogue therefore grows itself whenever anyone looks a plant up — this is the organic-growth mechanism, and it already exists.

Cache aggregates and facet counts in `Rails.cache` with a 24h TTL, following the existing `species:popular:v1` key shape. A nightly recompute job (mirroring `User#recompute_aggregates!`) is the upgrade path *if it measures slow* — not before.

## Frontend

### Reuse

Existing, used as-is: `PageHeader`, `Card`, `Badge`, `Avatar`, `EmptyState`, `Spinner`, `Popover`, `Dialog`, `SegmentedControl` (sort), `Breadcrumb`, `SpeciesView`, and `useRegisterSearchScope` for search. Encyclopedia was named as a future consumer of the search-scope system when it was built in TICKET-039c; this is it arriving.

### Filter control extraction

Journal's filter system — trigger pill with active count, `ActiveChips` row, Popover on desktop / Dialog on mobile, draft-then-commit to URL — is the right shape, but welded to journal's domain. `readJournalFilters`/`applyFilters` hardcode `plant_ids`/`kinds`/`date_from`/`date_to`; `config.js` exports journal vocabulary; `FilterToolbar` calls `usePlants()` internally.

Extract the chrome into `components/ui/FilterControl.jsx`, driven by an axis schema, with fields supplied via a slot:

```
axis: { id, param, label, type: 'multi' | 'bool' | 'range', options }

journal:      plants (multi) · kinds (multi) · date (range)
encyclopedia: petSafe (bool) · difficulty (multi) · light (multi)
```

URL read/apply becomes schema-driven. Each feature keeps its own `filter/config.js` for labels and options.

**This is its own ticket, sequenced first.** Multi-consumer with a wide blast radius across a shipped surface — CLAUDE.md's threshold says split, not bundle.

**It requires characterisation tests first.** `readJournalFilters` and `applyFilters` are pure functions with *zero* unit coverage; only four Playwright specs touch journal filtering, and they cover happy paths. Pinning current behaviour is cheap — no JSX, no mocks — and is the difference between a safe refactor and a blind one. Journal's filters work today; the failure mode is quietly breaking them for a page that does not exist yet.

### New components

- `pages/Encyclopedia.jsx`
- `pages/SpeciesDetail.jsx`
- `components/encyclopedia/SpeciesCard.jsx` — grid cell: photo, common name, scientific name, trait badges
- `components/encyclopedia/CommunityStats.jsx` — the aggregates block
- `components/encyclopedia/filter/config.js`

### States

| State | Treatment |
|---|---|
| Loading | `Spinner`, matching sibling pages |
| No search results | `EmptyState` — offer to search Perenual by name |
| Filters exclude everything | Filtered-empty state with a clear-filters action, mirroring Journal |
| Species below grower floor | Community block absent entirely — no empty shell, no "0 growers" |
| Perenual unreachable | Local results still render; surface a non-blocking notice. Never a dead page |
| Unknown pet safety | Renders as "Unknown", never as safe |

Per CLAUDE.md, the species page reads server-computed values; no client-side re-derivation of intervals or statuses.

## Testing

- **Model** — aggregate maths against fixtures: median interval with irregular gaps, mode of light levels, grower counting across multiple spaces owned by one user (must count the user once).
- **Privacy floor** — a species with 4 growers exposes no community payload; 5 does.
- **Pet-safe filter** — unknown-toxicity species excluded. Mutation-test this one: flipping the query to `NOT poisonous_to_pets` must fail the suite.
- **Endpoint** — browse ranking, each filter axis, facet counts, sort, and that search behaviour is unchanged.
- **Filter control** — characterisation tests written *before* extraction, then re-run unchanged against the generic implementation. That is the actual safety net for the refactor.
- **Playwright** — browse → filter → open species → add to my home. Journal's existing four filter specs must stay green throughout the extraction.

## Sequencing

Three tickets:

1. **Extract `FilterControl`** — characterisation tests on journal filters, extract the chrome, migrate Journal, keep its specs green. No user-visible change.
2. **Backend** — pet-safety booleans, aggregates with the privacy floor, browse/filter/sort/facets on the species endpoint.
3. **Encyclopedia frontend** — both routes, the new components, states, and the Playwright pass.

Each is independently shippable and independently reviewable. (1) has no user-visible surface, so it can merge on its own without waiting for the rest.

## Follow-ups this creates

- **Plant Doctor (R13)** gains a natural home on this page once built. Mockup 25's featured card is the slot.
- **Community aggregates** get more interesting as the user base grows; the "most grown here / thriving in low light" inversion is a plausible phase-2 evolution of the grid.
- **Pagination** when the catalogue passes ~100 rows — `useInfiniteQuery` + cursor, per the existing pagination memory.
- **`species:popular:v1` cache key** may need a bump if the browse payload shape changes.
