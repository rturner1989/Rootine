# Encyclopedia Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Species endpoint a browse mode (community-ranked, filterable by pet-safety / difficulty / light) and a per-species community-aggregates block, on data we already hold.

**Architecture:** Pet-safety becomes a nullable boolean captured at Perenual ingest instead of discarded. Community aggregates are computed in Ruby over the existing `plants` / `care_logs` / `spaces` graph — the row counts are tiny, so this stays readable model code rather than SQL machinery, with a documented trigger to move to SQL/a nightly job when volume warrants. The browse endpoint is gated behind a `?browse=1` param so the existing onboarding picker (bare `/species` → popular) is untouched.

> **Scope note (post-DHH-review):** an earlier draft also added `poisonous_to_humans`. Dropped — nothing consumes it (the pet-safe filter keys only on pets, and human toxicity is already in the `toxicity` display string via `parse_toxicity`). A nullable column with no reader is speculative schema; add it in a two-line migration when a consumer actually exists.

**Tech Stack:** Rails 8 API, PostgreSQL, Minitest + fixtures, `Rails.cache` (Redis).

## Global Constraints

- `private def method_name` inline style, never `private` blocks.
- `params.expect`, never `params.require`/`permit`.
- Scope through associations; no policy gems.
- Fat models, skinny controllers. No service objects.
- `as_json` on the model for JSON; opt-in extras via an options key (mirrors `User#as_json`'s `stats:` flag).
- Cache keys follow `<resource>:<selector>:v<N>` — e.g. `species:42:community:v1`. Version suffix only on a breaking payload change.
- **Safety invariant (pet-safe filter):** unknown toxicity (`NULL`) must NEVER satisfy "pet-safe". Query `where(poisonous_to_pets: false)`, never `NOT poisonous_to_pets` and never a `LIKE` over the display string. This carries a mutation test.
- Run backend commands in the container: `cd /Users/rob/Development/PlantCare && docker compose exec -T api bin/rails …`.
- Run the API suite with `./scripts/run_tests.sh api`; lint with `./scripts/lint.sh` as the final step before commit.

---

## File Structure

**Create:**
- `api/db/migrate/<timestamp>_add_poisonous_to_pets_to_species.rb`
- `api/test/models/species_community_test.rb` — aggregates + privacy floor
- `api/test/models/species_browse_test.rb` — filters, ranking, facets, pet-safe NULL-safety

**Modify:**
- `api/app/models/species.rb` — pet-safety helper, `grower_counts`, `community_stats`, `browse`, `browse_facets`, `as_json`
- `api/app/clients/perenual_client.rb` — populate `poisonous_to_pets` in `build_species`
- `api/db/seeds/species.rb` — set `poisonous_to_pets` on each seed row
- `api/app/controllers/api/v1/species_controller.rb` — browse mode + community on show
- `api/test/fixtures/{users,spaces,plants,care_logs}.yml` — enough growers to exercise the privacy floor
- `api/test/controllers/api/v1/species_controller_test.rb` — browse + show-community coverage

---

### Task 1: Add the pet-toxicity boolean

**Files:**
- Create: `api/db/migrate/<timestamp>_add_poisonous_to_pets_to_species.rb`

**Interfaces:**
- Produces: `species.poisonous_to_pets`, `boolean`, nullable (NULL = unknown). Consumed by Tasks 2, 3, 5, 6, 7.

- [ ] **Step 1: Generate the migration**

Run: `cd /Users/rob/Development/PlantCare && docker compose exec -T api bin/rails g migration add_poisonous_to_pets_to_species poisonous_to_pets:boolean`

- [ ] **Step 2: Confirm the migration is nullable with no default**

Open the generated file. It must read exactly (no `default:`, no `null: false` — absence is meaningful state):

```ruby
class AddPoisonousToPetsToSpecies < ActiveRecord::Migration[8.1]
  def change
    add_column :species, :poisonous_to_pets, :boolean
  end
end
```

No index: at Phase-1 catalogue size (<100 rows) an index on a low-cardinality boolean earns nothing. Note for the follow-up: add one alongside pagination when the catalogue grows.

- [ ] **Step 3: Migrate and restart**

Run: `docker compose exec -T api bin/rails db:migrate && docker compose restart api`

(The restart is load-bearing: a running dev server half-loads the `Species` class after a schema change and errors on the next request. Minitest forks a fresh boot so tests are unaffected, but the browser check later needs the restart.)

Expected: migration runs, `schema.rb` gains the column.

- [ ] **Step 4: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add api/db/migrate api/db/schema.rb
git commit -m "feat(v2): add poisonous_to_pets boolean to species"
```

---

### Task 2: Capture pet-safety at Perenual ingest

`parse_toxicity` already receives the `poisonous_to_pets` boolean from Perenual and flattens it into a display string. Stop discarding the structured value.

**Files:**
- Modify: `api/app/clients/perenual_client.rb`
- Test: `api/test/clients/perenual_client_test.rb` (add cases; create the file if it does not exist)

**Interfaces:**
- Consumes: the column from Task 1.
- Produces: `build_species` sets `poisonous_to_pets` from the raw Perenual payload.

- [ ] **Step 1: Write the failing test**

Check whether `api/test/clients/perenual_client_test.rb` exists (`ls api/test/clients/`). If it does, add these two tests inside the existing class. If not, create it:

```ruby
# frozen_string_literal: true

require 'test_helper'

class PerenualClientTest < ActiveSupport::TestCase
  test 'build_species captures the raw pet-toxicity boolean' do
    data = { 'id' => 99, 'common_name' => 'Test Fern', 'poisonous_to_pets' => 1 }

    species = PerenualClient.new.build_species(data)

    assert_equal true, species.poisonous_to_pets
  end

  test 'build_species leaves poisonous_to_pets nil when Perenual omits it' do
    data = { 'id' => 99, 'common_name' => 'Mystery Plant' }

    species = PerenualClient.new.build_species(data)

    assert_nil species.poisonous_to_pets
  end
end
```

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T api bin/rails test test/clients/perenual_client_test.rb`
Expected: FAIL — `poisonous_to_pets` is nil (not yet set by `build_species`).

- [ ] **Step 3: Populate the boolean**

In `api/app/clients/perenual_client.rb`, add a coercion helper near the other `private` parsers:

```ruby
  # Perenual sends this as 0/1 (occasionally true/false). Preserve nil when
  # the key is absent — NULL means "unknown", which the pet-safe filter must
  # never treat as safe.
  private def parse_boolean(value)
    return nil if value.nil?

    ActiveModel::Type::Boolean.new.cast(value)
  end
```

Then in `build_species`, add the attribute alongside `toxicity:`:

```ruby
      toxicity: parse_toxicity(data),
      poisonous_to_pets: parse_boolean(data['poisonous_to_pets']),
```

- [ ] **Step 4: Run to verify it passes**

Run: `docker compose exec -T api bin/rails test test/clients/perenual_client_test.rb`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add api/app/clients/perenual_client.rb api/test/clients/perenual_client_test.rb
git commit -m "feat(v2): capture pet-toxicity boolean from Perenual"
```

---

### Task 3: Backfill the seed species

Seed rows are hand-written and authoritative; set the booleans explicitly rather than parsing their prose.

**Files:**
- Modify: `api/db/seeds/species.rb`

**Interfaces:**
- Produces: every seeded species has `poisonous_to_pets` set (never nil), so browse and the pet-safe filter behave on a fresh DB.

- [ ] **Step 1: Add the boolean to each seed hash**

For each entry in `species_data`, add `poisonous_to_pets:` derived from its existing `toxicity:` prose. Use this mapping (read each row's toxicity string and set accordingly):

| toxicity prose | poisonous_to_pets |
|---|---|
| `Toxic to pets and children` | `true` |
| `Toxic to pets` | `true` |
| `Mildly toxic to pets` | `true` |
| `Non-toxic (but spiny)` | `false` |
| `Non-toxic` | `false` |

Example — the Monstera entry becomes:

```ruby
    toxicity: 'Toxic to pets and children',
    poisonous_to_pets: true,
```

Apply to every entry. None stays nil — seed data is known.

- [ ] **Step 2: Re-seed and verify**

Run: `docker compose exec -T api bin/rails runner 'load Rails.root.join("db/seeds/species.rb"); puts Species.where(poisonous_to_pets: nil).count'`
Expected: `0` (every seed row now has a value).

The seed upserts via `find_or_initialize_by(common_name:)` + `save!`, so re-loading the file updates existing rows in place — no DB reset needed.

- [ ] **Step 3: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add api/db/seeds/species.rb
git commit -m "feat(v2): backfill toxicity booleans on seed species"
```

---

### Task 4: Grower counts

**Files:**
- Modify: `api/app/models/species.rb`
- Test: `api/test/models/species_browse_test.rb`

**Interfaces:**
- Produces: `Species.grower_counts` → `{ species_id => distinct_user_count }`. A species owned by nobody is absent from the hash (callers default to 0). Consumed by Task 6.

- [ ] **Step 1: Write the failing test**

Create `api/test/models/species_browse_test.rb`:

```ruby
# frozen_string_literal: true

require 'test_helper'

class SpeciesBrowseTest < ActiveSupport::TestCase
  test 'grower_counts counts distinct owners per species' do
    counts = Species.grower_counts

    # john owns a monstera; fixtures give monstera exactly one distinct owner.
    assert_equal 1, counts[species(:monstera).id]
  end

  test 'grower_counts counts a user once even with several plants of a species' do
    space = spaces(:living_room)
    space.plants.create!(species: species(:monstera), nickname: 'Second Monstera', calculated_watering_days: 7)

    # Same owner, two monsteras — still one distinct grower.
    assert_equal 1, Species.grower_counts[species(:monstera).id]
  end

  test 'grower_counts omits species nobody grows' do
    assert_nil Species.grower_counts[species(:air_plant).id]
  end
end
```

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T api bin/rails test test/models/species_browse_test.rb`
Expected: FAIL — `NoMethodError: undefined method 'grower_counts'`.

- [ ] **Step 3: Implement**

In `api/app/models/species.rb`, add:

```ruby
  # { species_id => number of distinct users growing it }. One grouped query;
  # species grown by nobody are simply absent (callers treat missing as 0).
  def self.grower_counts
    Plant.joins(:space).group(:species_id).distinct.count('spaces.user_id')
  end
```

- [ ] **Step 4: Run to verify it passes**

Run: `docker compose exec -T api bin/rails test test/models/species_browse_test.rb`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add api/app/models/species.rb api/test/models/species_browse_test.rb
git commit -m "feat(v2): distinct grower counts per species"
```

---

### Task 5: Community stats with the privacy floor

**Files:**
- Modify: `api/app/models/species.rb`
- Modify: `api/test/fixtures/{users,spaces,plants,care_logs}.yml`
- Test: `api/test/models/species_community_test.rb`

**Interfaces:**
- Consumes: the loaded `plants → space → user` and `plants → care_logs` graph.
- Produces: `Species#community_stats` → a hash `{ grower_count, median_watering_days, typical_light, kept_on_schedule_pct }`, or `nil` when fewer than `COMMUNITY_MIN_GROWERS` growers. Consumed by Task 7.

- [ ] **Step 1: Add fixtures that clear the privacy floor**

The floor is 5 growers. Give `snake_plant` five distinct owners with watering logs at a known cadence, so the median is deterministic.

Match the existing block-YAML style. Existing users use `password_digest: <%= BCrypt::Password.create("greenthumb99") %>` — reuse it. Append to `api/test/fixtures/users.yml`:

```yaml
grower_a:
  name: Grower A
  email: grower_a@example.com
  password_digest: <%= BCrypt::Password.create("greenthumb99") %>
grower_b:
  name: Grower B
  email: grower_b@example.com
  password_digest: <%= BCrypt::Password.create("greenthumb99") %>
grower_c:
  name: Grower C
  email: grower_c@example.com
  password_digest: <%= BCrypt::Password.create("greenthumb99") %>
grower_d:
  name: Grower D
  email: grower_d@example.com
  password_digest: <%= BCrypt::Password.create("greenthumb99") %>
grower_e:
  name: Grower E
  email: grower_e@example.com
  password_digest: <%= BCrypt::Password.create("greenthumb99") %>
```

Append five spaces to `api/test/fixtures/spaces.yml`, all `light_level: medium` except one `bright` (so the mode is unambiguously `medium`):

```yaml
grower_a_room:
  user: grower_a
  name: Room A
  icon: couch
  category: indoor
  light_level: medium
grower_b_room:
  user: grower_b
  name: Room B
  icon: couch
  category: indoor
  light_level: medium
grower_c_room:
  user: grower_c
  name: Room C
  icon: couch
  category: indoor
  light_level: medium
grower_d_room:
  user: grower_d
  name: Room D
  icon: couch
  category: indoor
  light_level: bright
grower_e_room:
  user: grower_e
  name: Room E
  icon: couch
  category: indoor
  light_level: medium
```

Append five plants to `api/test/fixtures/plants.yml`, four on-schedule and one overdue (so `kept_on_schedule_pct` is a deterministic 80):

```yaml
snake_a:
  space: grower_a_room
  species: snake_plant
  nickname: Snake A
  calculated_watering_days: 14
  last_watered_at: <%= 2.days.ago %>
snake_b:
  space: grower_b_room
  species: snake_plant
  nickname: Snake B
  calculated_watering_days: 14
  last_watered_at: <%= 2.days.ago %>
snake_c:
  space: grower_c_room
  species: snake_plant
  nickname: Snake C
  calculated_watering_days: 14
  last_watered_at: <%= 2.days.ago %>
snake_d:
  space: grower_d_room
  species: snake_plant
  nickname: Snake D
  calculated_watering_days: 14
  last_watered_at: <%= 2.days.ago %>
snake_e:
  space: grower_e_room
  species: snake_plant
  nickname: Snake E
  calculated_watering_days: 14
  last_watered_at: <%= 40.days.ago %>
```

Append watering logs to `api/test/fixtures/care_logs.yml` — give two plants a clean 10-day gap so the median interval is exactly 10:

```yaml
snake_a_w1:
  plant: snake_a
  care_type: watering
  performed_at: <%= 22.days.ago %>
snake_a_w2:
  plant: snake_a
  care_type: watering
  performed_at: <%= 12.days.ago %>
snake_b_w1:
  plant: snake_b
  care_type: watering
  performed_at: <%= 20.days.ago %>
snake_b_w2:
  plant: snake_b
  care_type: watering
  performed_at: <%= 10.days.ago %>
```

- [ ] **Step 2: Write the failing test**

Create `api/test/models/species_community_test.rb`:

```ruby
# frozen_string_literal: true

require 'test_helper'

class SpeciesCommunityTest < ActiveSupport::TestCase
  test 'community_stats is nil below the grower floor' do
    # monstera has a single grower in fixtures — under the floor.
    assert_nil species(:monstera).community_stats
  end

  test 'community_stats reports aggregates once the floor is met' do
    stats = species(:snake_plant).community_stats

    assert_not_nil stats
    assert_equal 5, stats[:grower_count]
    assert_equal 10, stats[:median_watering_days]
    assert_equal 'medium', stats[:typical_light]
    assert_equal 80, stats[:kept_on_schedule_pct]
  end

  test 'the grower floor is exactly five' do
    assert_equal 5, Species::COMMUNITY_MIN_GROWERS
  end

  test 'never-watered plants do not inflate kept_on_schedule_pct' do
    # A sixth grower with an untracked plant (no last_watered_at → :unknown
    # status). It must not be scored as "on schedule". Fixtures give 4/5
    # tracked snake plants on schedule = 80%; adding an unwatered one keeps
    # the tracked denominator at 5, so the number must stay 80, not rise.
    space = spaces(:janes_kitchen)
    space.plants.create!(species: species(:snake_plant), nickname: 'Untracked', calculated_watering_days: 14)

    assert_equal 80, species(:snake_plant).community_stats[:kept_on_schedule_pct]
  end
end
```

Because `community_stats` caches per species id and the test-env cache persists across tests in a process, this class MUST clear the cache before each test or one test's cached aggregates leak into the next. Add a `setup` block at the top of the class:

```ruby
class SpeciesCommunityTest < ActiveSupport::TestCase
  setup { Rails.cache.clear }
```

- [ ] **Step 3: Run to verify it fails**

Run: `docker compose exec -T api bin/rails test test/models/species_community_test.rb`
Expected: FAIL — `COMMUNITY_MIN_GROWERS` / `community_stats` undefined.

- [ ] **Step 4: Implement**

First declare the association `Species` is aggregating (it doesn't have one yet). Near the top of the model, with the other macros:

```ruby
  has_many :plants, dependent: :nullify
```

`dependent: :nullify` matches `Plant`'s existing `belongs_to :species, optional: true` — deleting a species leaves its plants, just unlinked.

Add the constant near the other constants:

```ruby
  # Below this many distinct growers, aggregates would describe one or two
  # identifiable people rather than a community pattern — suppress entirely.
  COMMUNITY_MIN_GROWERS = 5
```

Add the methods:

```ruby
  # Anonymous, community-derived facts about this species — grower count,
  # how often people really water it, the light they keep it in, and how
  # well they keep up. Returns nil below the privacy floor. Cached: an
  # encyclopedia tolerates day-old numbers, and this walks every grower's
  # care logs.
  def community_stats
    Rails.cache.fetch("species:#{id}:community:v1", expires_in: 24.hours) { compute_community_stats }
  end

  private def compute_community_stats
    owned = plants.includes(:space, :care_logs).to_a
    grower_count = owned.map { |plant| plant.space.user_id }.uniq.size
    return nil if grower_count < COMMUNITY_MIN_GROWERS

    intervals = owned.flat_map { |plant| watering_intervals_for(plant) }
    lights = owned.map { |plant| plant.space.light_level }

    {
      grower_count: grower_count,
      median_watering_days: self.class.median(intervals),
      typical_light: lights.tally.max_by { |_level, count| count }&.first,
      kept_on_schedule_pct: kept_on_schedule_pct(owned)
    }
  end

  # Days between consecutive waterings, from the already-loaded association
  # (no per-plant query).
  private def watering_intervals_for(plant)
    logs = plant.care_logs.select { |log| log.care_type == CareLog::WATERING }.sort_by(&:performed_at)
    logs.each_cons(2).map { |earlier, later| ((later.performed_at - earlier.performed_at) / 1.day).round }
  end

  # "Keeping up" only means something for plants with a trackable status.
  # Plant#water_status returns :unknown when a plant has never been watered
  # — counting those as on-schedule (because :unknown != :overdue) would
  # inflate the number with plants nobody is actually caring for. Exclude
  # them from BOTH sides; nil when nothing is trackable.
  private def kept_on_schedule_pct(owned)
    tracked = owned.reject { |plant| plant.water_status == :unknown }
    return nil if tracked.empty?

    on_schedule = tracked.count { |plant| plant.water_status != :overdue }
    (100.0 * on_schedule / tracked.size).round
  end

  def self.median(numbers)
    return nil if numbers.empty?

    sorted = numbers.sort
    middle = sorted.size / 2
    return sorted[middle] if sorted.size.odd?

    ((sorted[middle - 1] + sorted[middle]) / 2.0).round
  end
```

- [ ] **Step 5: Run to verify it passes**

Run: `docker compose exec -T api bin/rails test test/models/species_community_test.rb`
Expected: PASS, 3 tests.

- [ ] **Step 6: Run the wider suite (fixtures touch other tests)**

Adding users/spaces/plants can shift counts other tests assert on.

Run: `cd /Users/rob/Development/PlantCare && ./scripts/run_tests.sh api`
Expected: all green. If a dashboard/notification test now fails on a count, read it — the fix is almost always to scope that assertion to its own user's fixtures, not to remove the new fixtures. If unsure, stop and ask.

- [ ] **Step 7: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add api/app/models/species.rb api/test/models/species_community_test.rb api/test/fixtures
git commit -m "feat(v2): community aggregates for species with a 5-grower privacy floor"
```

---

### Task 6: Browse filtering, ranking, and facets

**Files:**
- Modify: `api/app/models/species.rb`
- Test: `api/test/models/species_browse_test.rb`

**Interfaces:**
- Consumes: `grower_counts` (Task 4), `suggested_light_level` (existing), the Task-1 columns.
- Produces:
  - `Species.browse(pet_safe:, difficulty:, light:)` → array of `Species`, filtered, sorted by grower count desc then common name asc. Zero-grower species appear, sorted last.
  - `Species.browse_facets` → `{ pet_safe:, difficulty:, light: }` counts over the unfiltered catalogue.

- [ ] **Step 1: Write the failing tests (including the safety mutation target)**

Add to `api/test/models/species_browse_test.rb`:

```ruby
  test 'browse ranks by grower count then name' do
    names = Species.browse.map(&:common_name)

    # snake_plant (5 growers) outranks monstera/cactus (1 each); zero-grower
    # species sink to the bottom but still appear.
    assert_equal 'Snake Plant', names.first
    assert_includes names, 'Air Plant'
  end

  test 'pet_safe filter excludes toxic species' do
    results = Species.browse(pet_safe: true)

    assert(results.none? { |plant| plant.poisonous_to_pets })
    assert_includes results.map(&:common_name), 'Cactus'
  end

  test 'pet_safe filter excludes UNKNOWN-toxicity species — never treat NULL as safe' do
    mystery = Species.create!(common_name: 'Mystery', watering_frequency_days: 7, personality: 'chill',
                              poisonous_to_pets: nil)

    refute_includes Species.browse(pet_safe: true).map(&:id), mystery.id
  end

  test 'difficulty filter narrows to one level' do
    results = Species.browse(difficulty: 'beginner')

    assert(results.all? { |plant| plant.difficulty == 'beginner' })
  end

  test 'light filter matches the suggested level, not the raw requirement' do
    results = Species.browse(light: 'bright')

    assert(results.all? { |plant| plant.suggested_light_level == 'bright' })
  end

  test 'browse_facets counts each axis over the whole catalogue' do
    facets = Species.browse_facets

    assert_equal Species.where(poisonous_to_pets: false).count, facets[:pet_safe]
    assert_equal Species.where(difficulty: 'beginner').count, facets[:difficulty]['beginner']
    assert facets[:light].key?('medium')
  end
```

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T api bin/rails test test/models/species_browse_test.rb`
Expected: FAIL — `browse` / `browse_facets` undefined.

- [ ] **Step 3: Implement**

In `api/app/models/species.rb`:

```ruby
  # The browse grid: the local catalogue filtered and ranked by how many
  # people here grow each species. pet_safe is deliberately `= false`, not
  # `NOT poisonous_to_pets` — a NULL (unknown) species must never surface as
  # pet-safe. difficulty is a column; light is the derived suggested level,
  # so it filters in Ruby after load (the catalogue is small — revisit with
  # pagination when it isn't).
  def self.browse(pet_safe: false, difficulty: nil, light: nil)
    scope = all
    scope = scope.where(poisonous_to_pets: false) if pet_safe
    scope = scope.where(difficulty: difficulty) if difficulty.present?

    species = scope.to_a
    species = species.select { |plant| plant.suggested_light_level == light } if light.present?

    counts = grower_counts
    species.sort_by { |plant| [-(counts[plant.id] || 0), plant.common_name] }
  end

  # Counts per filter value over the whole local catalogue, for the chip
  # badges. pet_safe counts only the known-safe (false), never the unknowns.
  def self.browse_facets
    catalogue = all.to_a
    {
      pet_safe: catalogue.count { |plant| plant.poisonous_to_pets == false },
      difficulty: catalogue.group_by(&:difficulty).transform_values(&:size),
      light: catalogue.group_by(&:suggested_light_level).transform_values(&:size)
    }
  end
```

- [ ] **Step 4: Run to verify it passes**

Run: `docker compose exec -T api bin/rails test test/models/species_browse_test.rb`
Expected: PASS.

- [ ] **Step 5: Mutation-check the safety invariant**

The pet-safe NULL test is the one that matters. Prove it bites: in `species.rb`, temporarily change the pet-safe line to `scope = scope.where.not(poisonous_to_pets: true) if pet_safe` (the tempting-but-wrong form that lets NULL through).

Run: `docker compose exec -T api bin/rails test test/models/species_browse_test.rb`
Expected: FAIL on "never treat NULL as safe".

Revert to `where(poisonous_to_pets: false)`. Re-run — expected: PASS. Do not continue until the mutation fails as described.

- [ ] **Step 6: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add api/app/models/species.rb api/test/models/species_browse_test.rb
git commit -m "feat(v2): community-ranked species browse with pet-safe/difficulty/light filters"
```

---

### Task 7: Expose it through `as_json` and the controller

**Files:**
- Modify: `api/app/models/species.rb`
- Modify: `api/app/controllers/api/v1/species_controller.rb`
- Test: `api/test/controllers/api/v1/species_controller_test.rb`

**Interfaces:**
- Consumes: `browse`, `browse_facets`, `community_stats`, the pet-safety columns.
- Produces:
  - `Species#pet_safe` → `true` / `false` / `nil` (tri-state; nil = unknown).
  - `as_json` always includes `pet_safe`; includes `community` only when passed `community: true`.
  - `GET /api/v1/species?browse=1` → `{ species: [...], facets: {...} }`, honouring `pet_safe` / `difficulty` / `light` params.
  - `GET /api/v1/species/:id` → the species with its `community` block.
  - Bare `GET /api/v1/species` (no `q`, no `browse`) → unchanged `popular_payload` (onboarding picker).

- [ ] **Step 1: Write the failing controller tests**

The existing file has a `setup` block defining `@user` and calls `get api_v1_species_index_path(...), headers: auth_headers(@user), as: :json`. Match that exactly. Add:

```ruby
  test 'bare index still returns the popular payload for the onboarding picker' do
    get api_v1_species_index_path, headers: auth_headers(@user), as: :json

    body = response.parsed_body
    assert body.is_a?(Array), 'bare index must stay the popular array shape'
  end

  test 'browse index returns ranked species plus facets' do
    get api_v1_species_index_path(browse: 1), headers: auth_headers(@user), as: :json

    body = response.parsed_body
    assert body.key?('species')
    assert body.key?('facets')
    assert_equal 'Snake Plant', body['species'].first['common_name']
  end

  test 'browse index applies the pet_safe filter' do
    get api_v1_species_index_path(browse: 1, pet_safe: true), headers: auth_headers(@user), as: :json

    names = response.parsed_body['species'].map { |plant| plant['common_name'] }
    assert_includes names, 'Cactus'
    refute_includes names, 'Monstera Deliciosa'
  end

  test 'show includes the community block' do
    get api_v1_species_path(species(:snake_plant)), headers: auth_headers(@user), as: :json

    community = response.parsed_body['community']
    assert_equal 5, community['grower_count']
  end

  test 'show omits community below the floor' do
    get api_v1_species_path(species(:monstera)), headers: auth_headers(@user), as: :json

    assert_nil response.parsed_body['community']
  end
```

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T api bin/rails test test/controllers/api/v1/species_controller_test.rb`
Expected: FAIL — browse/community not wired.

- [ ] **Step 3: Add `pet_safe` + `as_json` community, in the model**

In `api/app/models/species.rb`:

```ruby
  # Tri-state: true (known safe), false (known toxic), nil (unknown). The UI
  # renders nil as "Unknown" — never as a safety claim.
  def pet_safe
    return nil if poisonous_to_pets.nil?

    !poisonous_to_pets
  end
```

Change the `as_json` signature and add the keys, following the exact shape `User#as_json` already uses — assign the hash to a local, conditionally add the opt-in key, return it (not `.tap`, so the two `as_json`s read as siblings). Replace `def as_json(_options = {})` with `def as_json(options = {})`, add `pet_safe: pet_safe,` next to `toxicity:`, and change the method's tail from `}` + `end` to:

```ruby
      suggested_humidity_level: suggested_humidity_level,
      pet_safe: pet_safe,
      plant_levels: Space.level_options
    }

    payload[:community] = community_stats if options[:community]
    payload
  end
```

(That means renaming the opening `{` line to `payload = {` — the hash is now assigned to a local before returning.)

- [ ] **Step 4: Wire the controller**

Replace `api/app/controllers/api/v1/species_controller.rb`'s `index` and `show`:

```ruby
      def index
        if params[:q].present?
          render json: Species.search_with_api(params[:q])
        elsif params[:browse].present?
          render json: browse_payload
        else
          render json: Species.popular_payload
        end
      end

      def show
        species = if params[:perenual_id]
          Species.find_or_fetch_from_api(params[:perenual_id], fallback: search_summary)
        else
          Species.find_by(id: params[:id])&.refresh_if_stale!
        end

        return render json: { error: 'Not found' }, status: :not_found unless species

        render json: species.as_json(community: true)
      end
```

Add a private builder near `search_summary`:

```ruby
      private def browse_payload
        {
          species: Species.browse(**browse_filters),
          facets: Species.browse_facets
        }
      end

      private def browse_filters
        {
          pet_safe: ActiveModel::Type::Boolean.new.cast(params[:pet_safe]),
          difficulty: params[:difficulty].presence,
          light: params[:light].presence
        }
      end
```

`Species.browse` returns model instances; Rails renders each through `as_json` (without `community:`), so browse rows carry `pet_safe` but not the community block — correct, community is a show-only concern.

- [ ] **Step 5: Run to verify it passes**

Run: `docker compose exec -T api bin/rails test test/controllers/api/v1/species_controller_test.rb`
Expected: PASS.

- [ ] **Step 6: Full API suite**

Run: `cd /Users/rob/Development/PlantCare && ./scripts/run_tests.sh api`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
cd /Users/rob/Development/PlantCare
git add api/app/models/species.rb api/app/controllers/api/v1/species_controller.rb api/test/controllers/api/v1/species_controller_test.rb
git commit -m "feat(v2): expose species browse + community via endpoint"
```

---

### Task 8: Verify against the running app, then lint

**Files:** none (verification + lint only).

- [ ] **Step 1: Restart and exercise the endpoints**

```bash
cd /Users/rob/Development/PlantCare
docker compose restart api
sleep 8
# Browse mode — expect { species: [...], facets: {...} }, ranked
docker compose exec -T api curl -s "http://localhost:3000/api/v1/species?browse=1" | head -c 400
echo
# Pet-safe filter — expect no known-toxic species
docker compose exec -T api curl -s "http://localhost:3000/api/v1/species?browse=1&pet_safe=true" | head -c 400
```

Expected: browse returns the wrapped shape with facet counts; pet_safe filtering visibly drops toxic species. (Community stats need ≥5 real growers, absent in dev seed data — that is expected; the block simply won't appear, which is the privacy floor doing its job.)

- [ ] **Step 2: Lint**

Run: `cd /Users/rob/Development/PlantCare && ./scripts/lint.sh`
Expected: all four checks pass. Fix any RuboCop finding and re-run.

- [ ] **Step 3: Final commit if lint changed anything**

```bash
cd /Users/rob/Development/PlantCare
git add -A
git commit -m "chore(v2): lint pass for species browse backend" || echo "nothing to commit"
```

---

## Definition of done

- `poisonous_to_pets` exists, is populated at Perenual ingest and on seed rows, and is never treated-as-safe when NULL.
- `Species.browse` ranks by grower count and filters on pet-safety / difficulty / light; `browse_facets` counts each axis.
- `Species#community_stats` returns aggregates above a 5-grower floor and `nil` below it.
- `GET /api/v1/species?browse=1` returns `{ species, facets }`; `GET /api/v1/species/:id` includes `community`; bare `GET /api/v1/species` is unchanged.
- The pet-safe NULL-safety test is mutation-verified.
- API suite and lint green.

## Follow-ups this creates

- **Ticket 3 (frontend)** consumes `?browse=1`, the facet counts (into the extracted `FilterControl`'s chip badges), and the `community` block on the species page. If its filter axes don't map cleanly onto `pet_safe`/`difficulty`/`light`, revisit `filterSchema.js` rather than fork it.
- **Perf trigger:** if `community_stats` or `browse` measures slow past ~100 species, promote aggregates to a nightly recompute job (mirroring `User#recompute_aggregates!`) and move the light filter + ranking into SQL. Not before — the cache + Ruby fold is honest at Phase-1 scale.
- **Cache busting:** `community_stats` is TTL-only (24h). If day-old numbers ever feel too stale, bust `species:<id>:community:v1` on care-log create for that species' plants.
- **Index:** add one on `poisonous_to_pets` alongside pagination when the catalogue grows.
