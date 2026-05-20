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
  KINDS = %w[water feed photo achievement acquisition].freeze
  CARE_KIND_BY_TYPE = { CareLog::WATERING => 'water', CareLog::FEEDING => 'feed' }.freeze
  DEFAULT_LIMIT = 30
  MAX_LIMIT = 100

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

  private def merged_entries
    [care_entries, photo_entries, acquisition_entries, achievement_entries]
      .flatten
      .sort_by { |entry| entry[:occurred_at] }
      .reverse
      .first(@limit)
  end

  private def care_entries
    care_types = CARE_KIND_BY_TYPE.keys.select { |type| kind_included?(CARE_KIND_BY_TYPE[type]) }
    return [] if care_types.empty?

    scope = @user.care_logs.where(care_type: care_types)
    scope = scope.where(plant_id: @plant_ids) if @plant_ids
    scope = apply_time_filters(scope, :performed_at)
    scope.includes(plant: :species).map { |log| care_entry(log) }
  end

  private def photo_entries
    return [] unless kind_included?('photo')

    scope = PlantPhoto.where(plant_id: user_plant_ids)
    scope = scope.where(plant_id: @plant_ids) if @plant_ids
    scope = apply_time_filters(scope, :taken_at)
    scope.includes(plant: :species).map { |photo| photo_entry(photo) }
  end

  private def acquisition_entries
    return [] unless kind_included?('acquisition')

    scope = @user.plants.where.not(acquired_at: nil)
    scope = scope.where(id: @plant_ids) if @plant_ids
    scope = scope.where(acquired_at: ..@date_to.to_date) if @date_to
    scope = scope.where(acquired_at: @date_from.to_date..) if @date_from
    scope = scope.where(acquired_at: ...@before.to_date) if @before
    scope.includes(:species).order(acquired_at: :desc).limit(@limit).map { |plant| acquisition_entry(plant) }
  end

  private def achievement_entries
    return [] unless kind_included?('achievement')

    scope = @user.achievements
    scope = scope.where(source_type: 'Plant', source_id: @plant_ids) if @plant_ids
    scope = apply_time_filters(scope, :earned_at)
    scope.includes(:source).map { |achievement| achievement_entry(achievement) }
  end

  private def kind_included?(kind)
    @kinds.nil? || @kinds.include?(kind)
  end

  private def apply_time_filters(scope, column)
    scope = scope.where(column => @date_from..) if @date_from
    scope = scope.where(column => ..@date_to) if @date_to
    scope = scope.where(column => ...@before) if @before
    scope.order(column => :desc).limit(@limit)
  end

  private def user_plant_ids
    @user_plant_ids ||= @user.plants.pluck(:id)
  end

  private def parse_plant_ids(value)
    ids = Array(value).flat_map { |entry| entry.to_s.split(',') }.map(&:strip).reject(&:empty?).map(&:to_i)
    ids.presence
  end

  # Accepts either a full ISO8601 timestamp (e.g. "2026-05-01T12:00:00Z")
  # or a date-only string (e.g. "2026-05-01"). Date-only inputs land at
  # start-of-day in the app timezone.
  private def parse_time(value)
    return nil if value.blank?
    return value if value.respond_to?(:to_time) && !value.is_a?(String)

    Time.zone.parse(value.to_s)
  rescue ArgumentError
    nil
  end

  # date_to is treated as an inclusive day cap. A date-only string
  # ("2026-05-31") parses to midnight; pushing it to end-of-day makes
  # the filter include events on the cap date itself.
  private def parse_inclusive_date_to(value)
    parsed = parse_time(value)
    return nil unless parsed
    return parsed.end_of_day if parsed == parsed.beginning_of_day

    parsed
  end

  private def clamp_limit(limit)
    parsed = limit.to_i
    return DEFAULT_LIMIT if parsed <= 0

    [parsed, MAX_LIMIT].min
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
