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

  # Whole-set totals, ignoring pagination. Counts are filter-aware; the
  # streak is the user's global care habit (deliberately not filter-scoped).
  def summary
    counts = kind_counts
    {
      entry_count: counts.values.sum,
      plant_count: plant_tally.size,
      kind_counts: counts,
      top_plants: top_plants,
      streak: { days: @user.effective_current_care_streak_days }
    }
  end

  # Compact event list driving the Calendar tab's per-day dots: every
  # matching event in the window as { occurred_at, kind }, unpaginated.
  # Ships raw timestamps so the client buckets by local day — same TZ
  # basis as the Timeline's grouping. Far lighter than full entries (no
  # plant payload, notes, captions) and immune to the 30-per-page cap,
  # which would silently truncate a busy month.
  def calendar_events
    [
      care_scope.pluck(:performed_at, :care_type)
                .map { |performed_at, type| { occurred_at: performed_at, kind: CARE_KIND_BY_TYPE.fetch(type) } },
      photo_scope.pluck(:taken_at).map { |taken_at| { occurred_at: taken_at, kind: 'photo' } },
      acquisition_scope.pluck(:acquired_at).map { |acquired_at| { occurred_at: acquired_at.to_time, kind: 'acquisition' } },
      achievement_scope.pluck(:earned_at).map { |earned_at| { occurred_at: earned_at, kind: 'achievement' } }
    ].flatten
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

  # One shared aggregation pass feeding both plant_count and top_plants, so
  # neither re-scans the four sources.
  private def plant_tally
    @plant_tally ||= begin
      tally = Hash.new(0)
      care_scope.group(:plant_id).count.each { |id, count| tally[id] += count }
      photo_scope.group(:plant_id).count.each { |id, count| tally[id] += count }
      acquisition_scope.pluck(:id).each { |id| tally[id] += 1 }
      achievement_scope.where(source_type: 'Plant').group(:source_id).count.each { |id, count| tally[id] += count }
      tally.reject! { |id, _| id.nil? }
      tally
    end
  end

  private def top_plants(limit = 5)
    ranked = plant_tally.sort_by { |_, count| -count }.first(limit)
    plants = @user.plants.where(id: ranked.map(&:first)).includes(:species).index_by(&:id)
    ranked.filter_map do |id, count|
      plant = plants[id]
      plant && { id: id, nickname: plant.nickname, image_url: plant.species&.image_url, count: count }
    end
  end

  private def kind_counts
    care_by_type = care_scope.group(:care_type).count
    {
      water: care_by_type[CareLog::WATERING] || 0,
      feed: care_by_type[CareLog::FEEDING] || 0,
      photo: photo_scope.count,
      achievement: achievement_scope.count,
      acquisition: acquisition_scope.count
    }
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
