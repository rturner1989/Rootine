# frozen_string_literal: true

# == Schema Information
#
# Table name: plant_photos
#
#  id         :bigint           not null, primary key
#  caption    :string
#  taken_at   :datetime         not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  plant_id   :bigint           not null
#
# Indexes
#
#  index_plant_photos_on_plant_id               (plant_id)
#  index_plant_photos_on_plant_id_and_taken_at  (plant_id,taken_at)
#
# Foreign Keys
#
#  fk_rails_...  (plant_id => plants.id)
#
class PlantPhoto < ApplicationRecord
  belongs_to :plant
  has_one_attached :image

  validates :taken_at, presence: true
  validates :image, presence: true

  before_validation :set_taken_at, on: :create

  scope :chronological, -> { order(taken_at: :desc) }

  def as_json(_options = {})
    {
      id: id,
      caption: caption,
      taken_at: taken_at,
      image_url: image_url,
      created_at: created_at
    }
  end

  # Proxy mode (not redirect) — streams the blob through Rails at a
  # stable /rails/active_storage/.../proxy/... path. Avoids the redirect
  # controller's 302 to a host-dependent disk URL, which breaks behind a
  # dev/prod reverse proxy (the redirect target would point at the
  # internal API host the browser can't reach).
  def image_url
    return nil unless image.attached?

    Rails.application.routes.url_helpers.rails_storage_proxy_url(image, only_path: true)
  end

  private def set_taken_at
    self.taken_at ||= Time.current
  end
end
