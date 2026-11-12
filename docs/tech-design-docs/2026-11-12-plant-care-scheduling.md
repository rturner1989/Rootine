# Plant care scheduling

**Author:** Rob · **Date:** 2026-11-12 · **Status:** As-built
**Built in:** MVP plan 2026-04-03 (`ScheduleCalculator` task, since folded into `Plant`), TICKET-045 (#46), TICKET-048 (#57), TICKET-049 (#59), TICKET-062 (#68), notification lifecycle (#105)

> **Skimming, or checking whether this affects something else?** Read 1, 3 and 6.
> **Changing it?** Read 5, 7 and 9.

## 1. Outline

**What it does.** Each plant gets a watering and feeding rhythm that the user never types in. They
describe each space's light, temperature and humidity once. Every surface then shows when each plant
is next due: Today, House, Plant Detail, the journal calendar and the notification drawer.

**How it works.**

- A plant's interval is its species' base frequency, scaled by one factor built from its space's
  environment (§5.1).
- The schedule is anchored on the last time care happened. Logging care or editing the date moves the
  anchor; nothing adapts the interval to the user's habits (§5.4).
- The server owns every number. The client renders `as_json` fields and only formats them (§5.6).
- Intervals are stored on the plant and recalculated when the inputs change: species, space, or the
  space's environment (§5.3).

## 2. Definitions

| Term | Meaning |
| ---- | ------- |
| Interval | `plants.calculated_watering_days` / `calculated_feeding_days`: days between care, after environment adjustment. Feeding is `nil` for species with no feeding cycle. |
| Anchor | `plants.last_watered_at` / `last_fed_at`: the last care, from which the next due date counts. |
| Base frequency | `species.watering_frequency_days` (required, > 0) and `feeding_frequency_days` (nullable). |
| Status | `water_status` / `feed_status`: `overdue`, `due_today`, `due_soon`, `healthy`, or `unknown` when there's no anchor or interval. |

## 3. What exists

- **Calculation:** `Plant#calculate_schedule`, a `before_save` (`api/app/models/plant.rb:304`). §5.1–5.3
- **Modifiers:** `Space::LIGHT_MODIFIERS`, `TEMPERATURE_MODIFIERS`, `HUMIDITY_MODIFIERS` (`api/app/models/space.rb:48`). Validation reads their `.keys`. §5.1
- **Status and due dates:** `Plant#water_status`, `#days_until_water`, `#next_water_on`, and the feed equivalents (`plant.rb:76–130`). §5.5
- **Re-anchoring:** `CareLog#update_plant_timestamps` (`api/app/models/care_log.rb:62`), plus anchors editable directly on the plant. §5.4
- **Readers:** `GET /dashboard` (Today rituals and week dots), `GET /journal/calendar` via `CareSchedule` (`api/app/models/care_schedule.rb`), and `NotificationsSweeperJob`. §6, §7
- **Client:** reads the fields above; `client/src/utils/careStatus.ts` formats `days_until_*` only. §4

## 4. Front-end behaviour

### 4.1 Read, don't compute

- **What:** The client renders `days_until_*`, `*_status` and `calculated_*_days` as shipped. The only client logic is wording ("In 3 days", "Due today", "2 days overdue").
- **Why:** A client mirror of the formula drifts silently when the server's numbers change; one existed for an Add Plant preview and was deleted (TICKET-047, see CLAUDE.md "Server owns business calculations").

### 4.2 Two ways to log care

- **What:** Today logs care with one tap, timestamped now. Plant Detail's `LogCareDialog` takes a date, so care can be backdated.
- **Why:** Today is the fast triage path; Plant Detail is where a user is deliberately working on one plant (decided 2026-05-10, TICKET-049).

### 4.3 Anchors on create

- **What:** Add Plant asks when the plant was last watered and fed, defaulting to today. The feed picker is hidden when the species has no feeding cycle.
- **Why:** Without it, every new plant started as "watered just now" and the first due date was wrong (TICKET-048, #57).

## 5. Decisions and justifications

### 5.1 One additive factor from the space

- **What:** `interval = round(base × (1.0 + light + temperature + humidity))`, floored at 1 day. Low light and cool or humid spaces lengthen the interval; bright, warm or dry ones shorten it. The combined factor ranges from 0.65 to 1.5. Feeding uses the same factor.
- **Why:** The modifier values, additive stacking and rounding are starting heuristics, not taken from horticultural data; tune them from real usage (confirmed 2026-11-12). The floor stops a zero-day interval (MVP plan test "never returns less than 1 day").

### 5.2 Environment lives on the space, not the plant

- **What:** Light, temperature and humidity are columns on `spaces`. Plants read them through their space.
- **Why:** Every plant in a room shares its window and humidity, so per-plant values were the wrong model. It also enables matching species needs against space conditions later (TICKET-045, #46).

### 5.3 Stored, and recalculated when inputs change

- **What:** Intervals are columns, computed in `before_save` when the plant is new or its species or space changes (`plant.rb:245`). A change to a space's environment re-saves every plant in it (`space.rb:101`, `Plant#recalculate_schedule!`).
- **Why:** Storing rather than computing on read: reason not recorded. The space callback exists because `should_recalculate?` only watches the plant's own columns (`plant.rb:68`, TICKET-045 #46).
- The space re-save runs in `after_update`, inside the space's transaction: one plant that fails to save rolls back the environment change. See §9.

### 5.4 Anchored on last care; no adaptive interval

- **What:** Each `CareLog` sets the matching anchor to its `performed_at`. Edit Plant can also set the anchors directly. A new plant with no water date is anchored on creation time (`plant.rb:253`).
- **Why:** Re-anchoring on every log is simple and corrects itself as soon as care is logged. An interval that slides toward the user's actual habits is deliberately Phase 2 (decided 2026-05-08).
- **Anchor bounds:** an anchor must be in the past and no more than 12 months ago (`plant.rb:52`). This clamps absurd input from the date pickers (commit `52f43c0`).

### 5.5 Status thresholds

- **What:** `due_soon` is up to 2 days out for water and 3 for feed. Below zero is `overdue`; zero is `due_today`.
- **Why:** Starting heuristics, tuned like the modifiers (confirmed 2026-11-12).

### 5.6 The server owns the numbers

- **What:** Every value in §5.1–5.5 is computed in Rails and shipped in `Plant#as_json`. The modifier hashes are never exposed or mirrored.
- **Why:** See §4.1. A preview before saving, if ever needed, should be a server endpoint that reuses `calculate_schedule`.

### 5.7 Species is optional on purpose

- **What:** `plants.species_id` is nullable. A plant with no species has no intervals, and its status is `unknown`. Every create path sets a species today (0 of 751 dev plants lack one).
- **Why:** Room for custom or unidentified plants later; `unknown` is the designed fallback (confirmed 2026-11-12).

### 5.8 Overdue on the calendar

- **What:** The journal calendar projects upcoming care forward at its interval. An overdue task appears once, on today, carrying `overdue_since`, and does not recur (`plant.rb:152`).
- **Why:** The next date can't be known until care is logged. Overdue care is outstanding now, so today collects it, the same way Today's rituals do (TICKET-062, #68).

## 6. Impact on other areas

**Other screens**

- **Today:** rituals list (`User#tasks_on`) and the week's dots read `next_*_on`. Dots are cumulative: an overdue task counts on every later day until done.
- **Journal calendar:** `scheduled` entries from `CareSchedule` (§5.8).
- **House, Plant Detail, QuickDialog:** status colours, the urgent ring and "In N days" copy.
- **Onboarding Step 4:** saves each space's environment, which reschedules its plants (§5.3).

**Background behaviour**

- **Care-due notifications:** `NotificationsSweeperJob` runs at 07:00 UTC and notifies on `overdue` / `due_today`. Changing an anchor resolves the notification when the status is no longer due (`plant.rb:265`, #105). "Due today" is approximate for distant time zones (`api/config/schedule.yml`).
- **Streaks and achievements:** every `CareLog` bumps the user's care streak and queues `CheckAchievementsJob`.

**Existing data**

- Changing a modifier value or the formula doesn't reschedule existing plants until their space's environment or their species changes; a plain re-save doesn't recalculate. A real change needs a one-off recalculation.

## 7. APIs

### 7.1 Plant schedule fields

#### `GET /api/v1/plants`, `GET /api/v1/plants/:id`: relied on

- **Access:** the current user's plants, through `current_user`.
- **Response:** schedule fields on each plant. `*_status` is a symbol serialised as a string. `days_until_*`, `calculated_*_days` and `last_*_at` are `null` when there's no species, no anchor, or no feeding cycle.

<details><summary>Example response (schedule fields only)</summary>

```json
{
  "id": 627,
  "nickname": "Monty",
  "space_id": 41,
  "calculated_watering_days": 8,
  "calculated_feeding_days": 34,
  "water_status": "due_soon",
  "feed_status": "healthy",
  "days_until_water": 2,
  "days_until_feed": 19,
  "last_watered_at": "2026-11-06T08:12:00.000Z",
  "last_fed_at": "2026-10-28T09:00:00.000Z"
}
```

</details>

#### `PATCH /api/v1/plants/:id`: relied on

- **Request:** accepts `last_watered_at` and `last_fed_at` (`plants_controller.rb:53`). It does not accept `space_id` (§9).
- **Errors:** 422 when an anchor is in the future or more than 12 months ago.
- **Side effects:** resolves a care-due notification when the plant is no longer due.

### 7.2 Care logs

#### `POST /api/v1/plants/:plant_id/care_logs`: relied on

- **Access:** a plant of the current user (`PlantScopedController`).
- **Request:** `care_log: { care_type: "watering" | "feeding", performed_at?, notes? }`. `performed_at` defaults to now.
- **Response:** 201 with the log. The plant's anchor moves to `performed_at`.
- **Errors:** 422 for a missing or unknown `care_type`. A `performed_at` that fails the plant's anchor bounds raises from the callback instead of returning field errors (§9).
- **Side effects:** care streak, `CheckAchievementsJob`, care-due resolution.

### 7.3 Readers

- **`GET /api/v1/dashboard`:** `tasks` (the rituals for `?date=`, default today) and `tasks_by_day` (7 days of `{ water, feed }` counts). Each task carries `kind`, `due_on`, `due_state` (`overdue` / `due_today`) and a server-written `due_label`.
- **`GET /api/v1/journal/calendar`:** `scheduled[]` entries `{ date, kind, state: scheduled | due_today | overdue, overdue_since, plant_id, plant_nickname }`, filtered by `plant_ids`, `kinds`, `date_from` and `date_to`.
- **`PATCH /api/v1/spaces/:id`:** changing `light_level`, `temperature_level` or `humidity_level` reschedules every plant in the space.

## 8. Schema

| Table | Columns that matter | Constraints, indexes, notes |
| ----- | ------------------- | --------------------------- |
| `species` | `watering_frequency_days`, `feeding_frequency_days` | Watering not null and > 0; feeding nullable (no feeding cycle) |
| `spaces` | `light_level`, `temperature_level`, `humidity_level` | Not null, defaults `medium` / `average` / `average`; validated against the modifier keys |
| `plants` | `calculated_watering_days`, `calculated_feeding_days`, `last_watered_at`, `last_fed_at`, `species_id` | All nullable; anchors validated to the last 12 months |
| `care_logs` | `care_type`, `performed_at` | `care_type` in `CareLog::CARE_TYPES`; `performed_at` required |

## 9. Known gaps

Code-wrong follow-ups. None are fixed or ticketed yet.

- **A backdated log moves the anchor backwards.** `update_plant_timestamps` always writes `performed_at`, so logging an older watering after a newer one pulls the schedule back. The anchor should only move forward (confirmed 2026-11-12) (`care_log.rb:62`).
- **Status and due dates use different clocks.** `days_until_*` counts elapsed 24-hour periods (`plant.rb:237`), while `next_*_on`, the rituals and the calendar use calendar dates. On a 1-day interval, watered at 23:00, the card says `due_soon` at 08:00 while the rituals say "Due today" (reproduced in dev). They should both use calendar days (confirmed 2026-11-12).
- **The 12-month anchor bound is checked on every save.** It was meant for input (`52f43c0`), but it runs on each save. A plant left unwatered for over a year can't be saved, and since Space re-saves its plants inside the update transaction (§5.3), that one plant blocks environment changes for its whole space: `PATCH /spaces/:id` returns 422 with an empty `errors` (reproduced in dev).
- **Moving a plant to another space does nothing.** `PATCH /plants/:id` drops `space_id`, so the `space_id_changed?` recalculation path is unreachable through the API. Tracked separately as the plant space-move bug.
- **A backdated log out of range raises.** It surfaces as a callback exception rather than a field error on `performed_at`.
- **Contradictory comments in `dashboard_controller.rb`.** Line 44 says future-day dots count only the exact due date; line 58 and the code say they're cumulative.
