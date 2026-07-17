# Achievements

Earn-once unlocks (PlayStation-trophy / Steam-achievement style). Distinct from notifications (transient) and goals (in-progress, see `project_goals_exploration.md` memo).

The single source of truth is `app/models/achievement_catalogue.rb`.

## Phase 1 catalogue

| kind | emoji | trigger event | condition |
|---|---|---|---|
| `first_plant` | 🌱 | `:plant_created` | user has any plant |
| `plant_anniversary` | 🏆 | `:daily_sweep` | plant age is 30 / 100 / 365 days |
| `streak_7` | 🔥 | `:care_logged` | current care streak ≥ 7 days |
| `streak_30` | 🔥 | `:care_logged` | current care streak ≥ 30 days |

Per-source achievements (e.g. `plant_anniversary`) include `source_type` + `source_id` so the same kind can unlock multiple times for different sources (one trophy per plant). Global achievements (e.g. `first_plant`) leave source nil — uniqueness fires once per user.

## How to add a new achievement

Single edit. Append an entry to `AchievementCatalogue::KINDS`:

```ruby
'plant_count_10' => {
  emoji: '🌿',
  label: '10 plants in your collection',
  notifier: nil,
  trigger_event: :plant_created,
  condition: ->(user, _source) { user.plants.count >= 10 }
}
```

That's it. Plant.rb's `after_create_commit` already dispatches `:plant_created` events, so the new kind gets checked on every plant create automatically.

### Entry shape

| key | type | required | notes |
|---|---|---|---|
| `:emoji` | string | yes | display glyph |
| `:label` | string OR `lambda(metadata)` | yes | static text or dynamic from saved metadata |
| `:notifier` | symbol or nil | yes | `:achievement` fires `AchievementNotifier` (bell + drawer); nil = silent |
| `:trigger_event` | symbol | yes | matches a callsite event name |
| `:condition` | `lambda(user, source)` → bool | yes | unlock if true |
| `:source_for` | `lambda(source)` → AR record | optional | per-source achievements lift the source from dispatcher payload |
| `:metadata_for` | `lambda(user, source)` → Hash | optional | extra data baked into the row |

### Adding a new trigger event

If your achievement fires from a surface that's not yet wired (e.g. a photo upload):

1. Add the catalogue entry with `trigger_event: :photo_uploaded`
2. Add ONE callback line to the model that fires the event:
   ```ruby
   # plant_photo.rb
   after_create_commit -> { Achievement.check_triggers(event: :photo_uploaded, user: plant.user, source: self) }
   ```

After that, any future `:photo_uploaded` achievement is just one more catalogue entry.

## Coupling B (Achievement is canonical)

When an achievement unlocks AND has a `:notifier` defined, `Achievement#after_create_commit` fires the matching Notifier downstream. The Notifier creates the user-facing notification record + cable broadcast. Achievements never silently duplicate notifications — the uniqueness on `[user, kind, source_type, source_id]` ensures one unlock = one notification.

Sweeper jobs and model callbacks call `Achievement.check_triggers` only — they never call notifiers directly.

## Backfilling

No backfill at present. Triggers fire on new actions going forward; existing care logs / plants don't retroactively unlock. If we ever need backfill, build a single rake task that walks data + calls `Achievement.unlock!` for matching rows. Idempotent re-runs are safe via the uniqueness index.

## Future kinds (parked)

See memos:
- `project_login_rewards_idea.md` — gacha-style login-count rewards (Phase 2/3)
- `project_battle_pass_avatars_idea.md` — Pokémon-Royale-style reward track + cosmetic avatars (Phase 3 with dollhouse)

Both will reuse this catalogue + dispatcher with new event types.
