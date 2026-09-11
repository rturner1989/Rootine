# Encyclopedia Space Matching — Design

**Date:** 2026-07-23
**Status:** Approved for planning
**Branch:** expansion off `feat-encyclopedia-frontend` (#92)
**Related:** memory `project_auto_layout_suggestions` (this is the Encyclopedia slice of that idea)
**Note:** planning artifact — kept local, NOT committed to the repo (per Rob's preference on superpowers docs).

## Problem

The Encyclopedia lets users browse and search species, but doesn't connect the catalogue to the user's *own* spaces. Users already tell us each space's conditions (light, humidity) during onboarding — so we can recommend which species actually suit each room.

## What we're building

A **"By space" view** in the Encyclopedia: the browse grid splits into sections — *"Great for your Living Room"*, *"Great for your Bedroom"* — each showing species whose light + humidity fit that space. Toggled via a House-style header control; the flat grid stays the default.

## Decisions

| Question | Decision |
|---|---|
| Interaction | Group browse results into per-space sections |
| Where the toggle lives | A `SegmentedControl` in `PageHeader`'s `actions` slot, mirroring House's Rooms/List toggle — NOT in the filter panel |
| Match axes | Light + humidity. **Temperature is excluded** — `suggested_temperature_level` is hardcoded `'average'` for every species, so it can't discriminate |
| Vocab | Already aligned — both Space and Species use `low/medium/bright` (light) and `dry/average/humid` (humidity). No equalisation needed |
| Where matching runs | Server (business logic + the user's spaces are server-side) |

## Match rule

Both axes use shared vocab, so no mapping.

**Light — tolerant, directional ("enough light").** Rank `low(0) < medium(1) < bright(2)`. A species fits when it needs **≤** what the space provides:

```
species_light_rank <= space_light_rank
```

So a low-light species fits any room, a medium species fits medium/bright, a bright-demanding species fits only a bright room. More light than needed is fine; only bright-demanding plants fail a dark room.

**Humidity — tolerant by one step, both directions.** Humidity isn't "more is better" — a humid-loving fern suffers in a dry room *and* a cactus rots in a humid one. So it's a proximity match:

```
|species_humidity_rank - space_humidity_rank| <= 1
```

Ranks `dry(0) < average(1) < humid(2)`. An average plant fits anywhere; a humid plant fits average/humid (not dry); a dry plant fits dry/average (not humid).

**A species fits a space when `light_ok AND humidity_ok`.**

## Backend

**Endpoint** — extend browse with a `group` param:

```
GET /api/v1/species?browse=1&group=spaces  →  { groups: [ { space, species: [...] }, ... ] }
```

`index`'s guard clauses gain one line, before plain browse:

```ruby
return Species.search_with_api(params[:q]) if params[:q].present?
return grouped_payload if params[:browse].present? && params[:group] == "spaces"
return browse_payload  if params[:browse].present?
Species.popular_payload
```

`grouped_payload` builds `{ groups: Species.browse_grouped_by_spaces(current_user.spaces.active, **browse_filters) }` (the existing `Space.active` scope = `where(archived_at: nil)`), each group `{ space: space, species: [...] }` (rendered through the existing `as_json`).

**Matcher — a class method on `Species`** (fat model, reuses `browse`):

```ruby
LIGHT_RANK    = { "low" => 0, "medium" => 1, "bright" => 2 }.freeze
HUMIDITY_RANK = { "dry" => 0, "average" => 1, "humid" => 2 }.freeze

def self.browse_grouped_by_spaces(spaces, **filters)
  ranked = browse(**filters)   # existing filtered + grower-ranked list
  spaces.map { |space| { space: space, species: ranked.select { |sp| fits_space?(sp, space) } } }
end

def self.fits_space?(species, space)
  LIGHT_RANK[species.suggested_light_level] <= LIGHT_RANK[space.light_level] &&
    (HUMIDITY_RANK[species.suggested_humidity_level] - HUMIDITY_RANK[space.humidity_level]).abs <= 1
end
```

- Species stay in grower-rank order within each group (reuses `browse`'s ordering — no new ranking).
- A species fitting several spaces appears in each group — it's recommendations, not a partition.
- **Empty groups are kept** — a space with no matches still appears so the client can say "nothing fits yet" rather than silently dropping the space.
- **No caching** — small in-memory fold over the (small) catalogue × the user's few spaces, and it depends on live space env (changes on edit). Revisit only if measured slow, same trigger as pagination.
- Filters (`pet_safe`/`difficulty`/`light`) flow through `browse(**filters)`, so they narrow every group.

Where `LIGHT_RANK`/`HUMIDITY_RANK` live: on `Species` (constants section) — they encode plant-vs-space ordering, which the matcher owns. Do NOT derive them from `Space::*_MODIFIERS` hash order (those values are schedule multipliers, and relying on hash insertion order for ranking is fragile).

## Frontend

**Toggle** — `SegmentedControl` in `PageHeader` `actions`, `options: [Grid, By space]`, state in the URL (`?view=spaces`), mirroring House.

**Render branching** in `Encyclopedia.jsx` (`renderBody` early-returns):
- Searching → flat `SpeciesSearchResults` (search overrides the toggle).
- `view=spaces` → grouped view.
- else → flat `SpeciesGrid`.

**New pieces:**
- `useEncyclopediaGrouped(filters)` — hook against `?browse=1&group=spaces`, returns `{ groups }`. Query key `['species', 'browse', 'grouped', filters]`. `keepPreviousData` like the browse hook.
- `SpaceGroups.jsx` (`components/encyclopedia/`) — renders each group as a section: heading *"Great for your {space.name}"* (space emoji via `getSpaceEmoji`) + `SpeciesGrid` of the group's species, or the empty note. Reuses `SpeciesGrid`, `Heading`, `spaceIcons`.

**Cache coupling:** `useUpdateSpace` invalidates `['species', 'browse', 'grouped']` (alongside its existing `['spaces']`/`['plants']`) — a space's light/humidity edit reflows the recommendations.

## States

- **No active spaces** → `EmptyState`: "Add a space to see recommendations" + link to House.
- **A space with zero matches** → keep the section, small note: "Nothing in the catalogue fits {space} yet — try search for more."
- **Loading** → `Spinner`, matching the flat grid.

## Testing

**Backend:**
- `fits_space?` — light tolerance (low fits all, medium fits medium/bright, bright fits only bright), humidity ±1 (dry↮humid excluded, average fits all), both-axes AND.
- `browse_grouped_by_spaces` — correct grouping; a species fitting two spaces appears in both; filters narrow groups; empty group retained.
- Controller — `?browse=1&group=spaces` returns `{ groups }`; archived spaces excluded; respects `pet_safe`/`difficulty`/`light`.

**Frontend:**
- Toggle switches view + writes `?view=spaces`.
- Grouped view renders a section per space; species land in the right groups.
- No-spaces empty state.
- Search overrides the toggle (flat results while searching).
- Playwright: toggle → grouped sections visible, one has cards.

## Non-goals / follow-ups

- **Temperature axis** — revisit if `suggested_temperature_level` ever becomes a real derived value (today it's hardcoded `'average'`).
- **Best-space-on-add, plant-doctor mismatch flags, auto-layout** — the other slices of `project_auto_layout_suggestions`; out of scope here.
- **Fit strength / ranking by match quality** — groups rank by grower count (reuses browse); a "% fit" score is deliberately not built (legibility over precision).
- **Caching / nightly job** — only if the in-memory fold measures slow.
