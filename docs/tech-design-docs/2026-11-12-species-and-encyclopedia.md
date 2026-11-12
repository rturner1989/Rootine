# Species and the Encyclopedia

**Author:** Rob · **Date:** 2026-11-12 · **Status:** As-built
**Built in:** seed catalogue (`6d29b87`), Perenual sourcing (#26, #29), TICKET-057 staleness (#63), Encyclopedia R6: browse and community backend (#89), frontend (#92), space matching (#93)

> **Skimming, or checking whether this affects something else?** Read 1, 3 and 6.
> **Changing it?** Read 5, 7 and 9.

## 1. Outline

**What it does.** Species are the reference data behind every plant: how often it wants water and
food, what light and humidity suit it, whether it's safe for pets, and its personality. The
Encyclopedia lets people browse the species we hold, filter them, see how other growers keep each
one, find which of their rooms suit it, and search the wider Perenual library.

**How it works.**

- Two tiers. A small **local catalogue** (seed rows, plus every Perenual species someone has opened)
  is browsed and grouped. **Search** spans the local catalogue first, then the whole Perenual library (§5.1).
- Perenual is rate-limited to 100 requests a day, so every call is cached, deduped or debounced, and
  every failure falls back to local data (§5.2).
- Community figures come from our own users' plants, shown only above a 5-grower privacy floor (§5.6).
- Unknown pet safety is never shown or filtered as safe (§5.7).

## 2. Definitions

| Term | Meaning |
| ---- | ------- |
| Local catalogue | Every `species` row: 15 seeded (`source: 'seed'`) plus Perenual species persisted on first open (`source: 'perenual'`, `external_id` = Perenual id). 17 in dev. |
| Search result | A Perenual hit not yet persisted: a `SpeciesSearchResult` with `id: nil` and a `perenual_id`. It becomes a `Species` row when opened. |
| Suggested levels | A species' needs mapped onto the space vocabulary (`low/medium/bright`, `dry/average/humid`). These drive Add Plant defaults and space matching. |
| Grower | A distinct user with at least one plant of the species. |

## 3. What exists

- **Catalogue reads:** `Species.popular_payload`, `.browse`, `.browse_facets`, `.browse_grouped_by_spaces` (`api/app/models/species.rb:109–163`). §5.3–5.5
- **Perenual sourcing:** `Species.search_with_api`, `.find_or_fetch_from_api`, `#refresh_if_stale!` (`species.rb:176–228`), on top of `PerenualClient` (`api/app/clients/perenual_client.rb`). §5.1–5.2
- **Community stats:** `Species#community_stats` (`species.rb:264`). §5.6
- **Endpoint:** `GET /api/v1/species` with four read modes, and `GET /api/v1/species/:id` (or `lookup?perenual_id=`). §7
- **Client:** `/encyclopedia` (grid, filters, By space view, search) and `/encyclopedia/species/:id`; the onboarding and Add Plant species picker. Query keys live under `species` in `client/src/api/queryKeys.ts`.

## 4. Front-end behaviour

### 4.1 Browse is local; search reaches everything

- **What:** The grid is headed "Popular species" and shows the local catalogue, ranked by grower count. Typing swaps the grid for search results: local matches first, then Perenual hits. Opening a Perenual hit persists it, after which it appears in the grid.
- **Why:** The catalogue is deliberately small. Bulk-seeding hundreds of Perenual species (about ten days of the daily quota) was declined, and the header was reframed so it doesn't promise more than the grid holds (PR #92). Whether the Encyclopedia becomes a comprehensive catalogue or embraces a curated shelf is an open product decision (memory: encyclopedia identity, 2026-07-23).

### 4.2 Search input is debounced

- **What:** Search fires 300ms after typing stops, here and in the species picker.
- **Why:** Before this, typing "rose" cost three Perenual calls, and the free tier is 100 a day (`f90e60a`; `SpeciesSearchResults.tsx:17`). It's debounced rather than deferred because the value triggers a network call (CLAUDE.md "Deferred rendering").

### 4.3 A species page never goes blank while refreshing

- **What:** Plant Detail's Species tab renders the species it already has, and refreshes in the background with a spinner on the tab.
- **Why:** The refresh can call Perenual, and a blank tab while it does read as broken (TICKET-057, #63).

## 5. Decisions and justifications

### 5.1 Local first, Perenual second, persist on open

- **What:** Search returns up to 10 local matches (pg_search on common and scientific name, prefix plus trigram), then Perenual results with entries we already hold removed by `external_id`, capped at 20 (`species.rb:176`). Opening a hit persists it as a `Species`.
- **Why:** Local rows carry community data and link by id. Previously a term with any local match never reached Perenual, so plants outside the catalogue couldn't be found (`cc7e715`).

### 5.2 Spending the Perenual budget carefully

- **What:**
  - Search responses are cached 24 hours per normalised query (`perenual_search:<query>`).
  - Search is filtered to indoor plants, and "(group)" cultivar rollups are dropped.
  - Every client failure returns `[]` or `nil`, never an exception.
  - If details fail when a hit is opened, we save a fallback row built from the search summary, with default 7-day watering and 30-day feeding (`species.rb:214`).
- **Why:**
  - The free tier is 100 calls a day, and one details call per opened species used it up fast. When details hit a 429, onboarding used to get stuck on a 404 (`a21fff8`).
  - The fallback row has no `details_synced_at`, so it counts as stale and refreshes itself on its next open (§5.8).
  - Indoor only, because the app tracks plants kept in rooms (confirmed 2026-11-12).
  - Rollups are umbrella entries, not species (`perenual_client.rb:81`).

### 5.3 The popular list

- **What:** `POPULAR_NAMES` holds six beginner-friendly, iconic species. The seed flags matching rows `popular`, and the bare index serves them, cached an hour as `species:popular:v1`. Changing `Species#as_json` means bumping that key (CLAUDE.md "Server-side caches").
- **Why:** These are empty-state picks for the species picker (`species.rb:53`). The cache exists because on a cold cache the fetch landed after the 220ms step animation and the results popped in (`4a3e1d7`). Room for up to 10, and a usage-driven "popular", are noted in memory (popular species expand).

### 5.4 Browse ranks by growers, filters in Ruby

- **What:** Browse loads the whole local catalogue, filters by pet-safe, difficulty and light, and sorts by distinct grower count, then name. Light filters in Ruby because it's a derived value, not a column.
- **Why:** The catalogue is small, so in-memory filtering is fine until pagination is needed (`species.rb:125`). That's tied to the encyclopedia rework, and the approach is set in CLAUDE.md "Pagination".

### 5.5 Matching species to a user's spaces

- **What:**
  - A species fits a space when its suggested light is at most the space's light, and its humidity is within one step of the space's (`species.rb:163`).
  - Temperature isn't used.
  - The ranks are their own constants, not taken from `Space::*_MODIFIERS`.
  - Only the user's active spaces are grouped.
  - A species can appear under several spaces, and a space with no matches still shows.
- **Why:**
  - More light than needed is fine, but humidity fails both ways: a fern dries out, a cactus rots.
  - Every species suggests `average` temperature, so it can't tell species apart (spec 2026-07-23, §Match rule).
  - The modifiers are schedule multipliers, and ranking by hash order would be fragile (`species.rb:82`).

### 5.6 Community figures with a privacy floor

- **What:** `community_stats` returns grower count, median days between waterings, typical light and kept-on-schedule %, or `nil` below 5 growers. It's cached 24 hours as `species:<id>:community:v1`. The median runs in Postgres, and plants with no trackable schedule are left out of the on-schedule figure entirely.
- **Why:**
  - Below 5 growers the numbers describe one or two identifiable people, not a pattern (`species.rb:49`, PR #89).
  - An encyclopedia tolerates day-old figures (`species.rb:263`).
  - The median needs every watering log, which shouldn't be pulled into Ruby (`11b370b`).
  - Counting `:unknown` plants as on schedule inflated the figure with plants nobody cares for. This was caught in review (PR #89).

### 5.7 Pet safety is three-state

- **What:** `poisonous_to_pets` is nullable, and `pet_safe` is true, false or `nil`. The UI shows `nil` as "Unknown", and the pet-safe filter matches only `false`, never `nil`. Perenual's `0/1` is cast before branching.
- **Why:** An unknown species must never be presented as safe for pets (`species.rb:123`, PR #89). Ruby treats `0` as truthy, so an uncast non-toxic `0` read as toxic (`c8f3790`).

### 5.8 Perenual species refresh after 7 days

- **What:** Opening a Perenual species whose details are older than 7 days, or never synced, re-fetches and overwrites its attributes. `popular` and the id are kept. On failure it shows what we have (`species.rb:228`). Seed rows have no `external_id` and never refresh.
- **Why:** `details_synced_at` is the cache, so no second cache layer is needed (TICKET-057, #63).

### 5.9 Derived fields

- **What:** Perenual's care fields map onto our vocabulary: watering days, light requirement, humidity, difficulty and personality. Tolerant light ranges land on `medium`. Personality is a rule over drought tolerance, maintenance and watering (`perenual_client.rb:179`).
- **Why:** Personality drives the visual layer (CLAUDE.md "Plant Personality"). The mapping is a first-pass heuristic, not sourced, to tune as personality work deepens (confirmed 2026-11-12). `medium` is a neutral starting point the user can adjust (`species.rb:67`).

## 6. Impact on other areas

**Other screens**

- **Onboarding and Add Plant:** the species picker uses the popular list and search. Opening a hit persists it, and the suggested levels prefill the space questions.
- **Plant Detail:** the Species tab reads `GET /species/:id`, which may refresh the species (§5.8).
- **Scheduling:** `watering_frequency_days` and `feeding_frequency_days` are the base of every plant's interval (scheduling doc §5.1).

**Existing data**

- Deleting a species unlinks its plants rather than deleting them (`dependent: :nullify`). Those plants lose their schedule (scheduling doc §5.7).
- Changing the community or popular payload shape needs a cache-key bump (§5.3, §5.6).

## 7. APIs

### 7.1 `GET /api/v1/species`: four read modes

- **Access:** authenticated (`BaseController`).
- **`q=<text>`:** search (§5.1). An array of species, plus Perenual results shaped `{ id: null, perenual_id, common_name, scientific_name, image_url, source: "perenual" }`.
- **`browse=1`:** `{ species: [...], facets: { pet_safe, difficulty: {…}, light: {…} } }`. Optional `pet_safe=true`, `difficulty=a,b`, `light=a,b`.
- **`browse=1&group=spaces`:** `{ groups: [{ space, species: [...] }] }` over the current user's active spaces.
- **No params:** the popular list (cached, §5.3).

### 7.2 `GET /api/v1/species/:id` and `GET /api/v1/species/lookup?perenual_id=…`

- **Response:** `Species#as_json(community: true)`: the reference fields, `pet_safe`, the `suggested_*_level`s, `plant_levels`, and `community` (`null` below the floor).
- **Lookup** takes the search summary (`common_name`, `scientific_name`, `image_url`) for the fallback row (§5.2).
- **Errors:** 404 `{ error: 'Not found' }` for an unknown id, or when Perenual has nothing and no summary was given.

<details><summary>Example response (community block)</summary>

```json
{
  "id": 3,
  "common_name": "Snake Plant",
  "pet_safe": false,
  "suggested_light_level": "medium",
  "suggested_humidity_level": "average",
  "community": {
    "grower_count": 7,
    "median_watering_days": 13,
    "typical_light": "medium",
    "kept_on_schedule_pct": 86
  }
}
```

</details>

## 8. Schema

| Table | Columns that matter | Constraints, indexes, notes |
| ----- | ------------------- | --------------------------- |
| `species` | `common_name`, `scientific_name`, `watering_frequency_days`, `feeding_frequency_days`, `light_requirement`, `humidity_preference`, `poisonous_to_pets`, `difficulty`, `personality`, `popular`, `source`, `external_id`, `details_synced_at` | `watering_frequency_days` > 0, `personality` required, `poisonous_to_pets` nullable (unknown), pg_search over the names |

## 9. Known gaps

Recorded during the backfill; not fixed or ticketed yet.

- **A refresh can change a species' base frequency without rescheduling its plants.** `refresh_if_stale!` rewrites `watering_frequency_days` and `feeding_frequency_days`, but `Plant` only recalculates when its own species or space changes (`plant.rb:245`). Plants should be rescheduled (confirmed 2026-11-12).
- **Search makes one query per Perenual result** to find already-persisted rows (`species.rb:186`), up to about 20 per search. A single `where(external_id: …)` would do.
- **The Encyclopedia's identity is undecided:** a comprehensive catalogue or a curated shelf (§4.1). Pagination waits on that.
