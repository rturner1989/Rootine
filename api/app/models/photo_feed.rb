# frozen_string_literal: true

# Read-only photo feed shared by two surfaces:
#   - Api::V1::PhotosController (root /photos) — all the user's photos,
#     the Journal Photos tab's masonry grid.
#   - Api::V1::Plants::PlantPhotosController#index — one plant's photos,
#     the (future) Plant Detail photo section.
#
# Both pass through here so cursor pagination + payload shape stay
# identical. Scoped through current_user; cursor on taken_at, newest
# first. Plain Ruby class, not an ActiveRecord model.
class PhotoFeed
  DEFAULT_LIMIT = 30
  MAX_LIMIT = 100

  attr_reader :limit

  def initialize(user, plant_ids: nil, before: nil, date_from: nil, date_to: nil, limit: DEFAULT_LIMIT)
    @user = user
    @plant_ids = parse_plant_ids(plant_ids)
    @before = parse_time(before)
    @date_from = parse_time(date_from)
    @date_to = parse_inclusive_date_to(date_to)
    @limit = clamp_limit(limit)
  end

  def photos
    @photos ||= records.map { |photo| payload(photo) }
  end

  def next_cursor
    return nil if photos.size < @limit

    photos.last[:taken_at]&.iso8601(3)
  end

  private def records
    scope = @user.plant_photos.includes(plant: :species).chronological
    scope = scope.where(plant_id: @plant_ids) if @plant_ids
    scope = scope.where(taken_at: @date_from..) if @date_from
    scope = scope.where(taken_at: ..@date_to) if @date_to
    scope = scope.where(taken_at: ...@before) if @before
    scope.limit(@limit).to_a
  end

  private def payload(photo)
    {
      id: photo.id,
      image_url: photo.image_url,
      caption: photo.caption,
      taken_at: photo.taken_at,
      plant: { id: photo.plant.id, nickname: photo.plant.nickname }
    }
  end

  private def parse_plant_ids(value)
    ids = Array(value).flat_map { |entry| entry.to_s.split(',') }.map(&:strip).reject(&:empty?).map(&:to_i)
    ids.presence
  end

  private def parse_time(value)
    return nil if value.blank?
    return value if value.respond_to?(:to_time) && !value.is_a?(String)

    Time.zone.parse(value.to_s)
  rescue ArgumentError
    nil
  end

  # date_to is an inclusive day cap: a date-only string ("2026-05-31")
  # parses to midnight, so push it to end-of-day to include that day.
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
end
