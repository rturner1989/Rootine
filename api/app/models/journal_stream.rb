# frozen_string_literal: true

# Read-only aggregation of event-shaped data scattered across CareLog,
# PlantPhoto, Plant#acquired_at, and Achievement. Drives the Journal
# Timeline page (TICKET-059).
#
# Each source query applies filters at the SQL level so the merge step
# only sorts already-narrow result sets. Cursor pagination keys on
# `occurred_at` — stable under concurrent writes, no OFFSET cost.
#
# Plant filter hides user-scope achievements (login_streak etc.), per
# ticket guidance — they have no associated plant and would clutter a
# single-plant view.
class JournalStream
  include FeedFiltering

  KINDS = %w[water feed photo achievement acquisition].freeze
  CARE_KIND_BY_TYPE = { CareLog::WATERING => 'water', CareLog::FEEDING => 'feed' }.freeze

  attr_reader :limit

  def initialize(user, plant_ids: nil, kinds: nil, before: nil, date_from: nil, date_to: nil, limit: DEFAULT_LIMIT)
    @user = user
    @plant_ids = parse_plant_ids(plant_ids)
    @kinds = Array(kinds).map(&:to_s).intersection(KINDS).presence
    @before = parse_time(before)
    @date_from = parse_time(date_from)
    @date_to = parse_inclusive_date_to(date_to)
    @limit = clamp_limit(limit)
  end

  def entries
    @entries ||= merged_entries
  end

  def next_cursor
    return nil if entries.size < @limit

    entries.last[:occurred_at]&.iso8601(3)
  end

  # Totals across the full filtered set (ignoring pagination) — drives the
  # journal header summary line. plant_count counts distinct plants the
  # entries touch (a plant-less achievement contributes nothing).
  def summary
    { entry_count: [care_scope, photo_scope, acquisition_scope, achievement_scope].sum(&:count),
      plant_count: feed_plant_ids.size }
  end

  private def merged_entries
    [care_entries, photo_entries, acquisition_entries, achievement_entries]
      .flatten
      .sort_by { |entry| entry[:occurred_at] }
      .reverse
      .first(@limit)
  end

  # Per-source scopes carry the plant + kind + date filters but NOT the
  # cursor/limit — entries layer pagination on top via #paged, summary
  # counts them whole.

  private def care_scope
    care_types = CARE_KIND_BY_TYPE.keys.select { |type| kind_included?(CARE_KIND_BY_TYPE[type]) }
    return @user.care_logs.none if care_types.empty?

    scope = @user.care_logs.where(care_type: care_types)
    scope = scope.where(plant_id: @plant_ids) if @plant_ids
    apply_date_range(scope, :performed_at)
  end

  private def photo_scope
    return PlantPhoto.none unless kind_included?('photo')

    scope = PlantPhoto.where(plant_id: user_plant_ids)
    scope = scope.where(plant_id: @plant_ids) if @plant_ids
    apply_date_range(scope, :taken_at)
  end

  private def acquisition_scope
    return @user.plants.none unless kind_included?('acquisition')

    scope = @user.plants.where.not(acquired_at: nil)
    scope = scope.where(id: @plant_ids) if @plant_ids
    scope = scope.where(acquired_at: ..@date_to.to_date) if @date_to
    scope = scope.where(acquired_at: @date_from.to_date..) if @date_from
    scope
  end

  private def achievement_scope
    return @user.achievements.none unless kind_included?('achievement')

    scope = @user.achievements
    scope = scope.where(source_type: 'Plant', source_id: @plant_ids) if @plant_ids
    apply_date_range(scope, :earned_at)
  end

  private def care_entries
    paged(care_scope, :performed_at).includes(plant: :species).map { |log| care_entry(log) }
  end

  private def photo_entries
    paged(photo_scope, :taken_at).includes(plant: :species).map { |photo| photo_entry(photo) }
  end

  private def acquisition_entries
    scope = acquisition_scope
    scope = scope.where(acquired_at: ...@before.to_date) if @before
    scope.includes(:species).order(acquired_at: :desc).limit(@limit).map { |plant| acquisition_entry(plant) }
  end

  private def achievement_entries
    paged(achievement_scope, :earned_at).includes(:source).map { |achievement| achievement_entry(achievement) }
  end

  private def feed_plant_ids
    (care_scope.distinct.pluck(:plant_id) +
      photo_scope.distinct.pluck(:plant_id) +
      acquisition_scope.pluck(:id) +
      achievement_scope.where(source_type: 'Plant').distinct.pluck(:source_id)).compact.uniq
  end

  private def kind_included?(kind)
    @kinds.nil? || @kinds.include?(kind)
  end

  private def apply_date_range(scope, column)
    scope = scope.where(column => @date_from..) if @date_from
    scope = scope.where(column => ..@date_to) if @date_to
    scope
  end

  private def paged(scope, column)
    scope = scope.where(column => ...@before) if @before
    scope.order(column => :desc).limit(@limit)
  end

  private def user_plant_ids
    @user_plant_ids ||= @user.plants.pluck(:id)
  end

  private def care_entry(log)
    kind = CARE_KIND_BY_TYPE.fetch(log.care_type)
    {
      id: "#{kind}-#{log.id}",
      kind: kind,
      occurred_at: log.performed_at,
      plant: plant_payload(log.plant),
      notes: log.notes
    }
  end

  private def photo_entry(photo)
    {
      id: "photo-#{photo.id}",
      kind: 'photo',
      occurred_at: photo.taken_at,
      plant: plant_payload(photo.plant),
      caption: photo.caption,
      image_url: photo.image_url
    }
  end

  private def acquisition_entry(plant)
    {
      id: "acquisition-#{plant.id}",
      kind: 'acquisition',
      occurred_at: plant.acquired_at.to_time,
      plant: plant_payload(plant)
    }
  end

  private def achievement_entry(achievement)
    source = achievement.source
    {
      id: "achievement-#{achievement.id}",
      kind: 'achievement',
      occurred_at: achievement.earned_at,
      label: achievement.label,
      emoji: achievement.emoji,
      plant: source.is_a?(Plant) ? plant_payload(source) : nil
    }
  end

  private def plant_payload(plant)
    return nil unless plant

    {
      id: plant.id,
      nickname: plant.nickname,
      species: plant.species && {
        id: plant.species.id,
        common_name: plant.species.common_name,
        personality: plant.species.personality
      }
    }
  end
end
