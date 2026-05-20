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
  include FeedFiltering

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
end
