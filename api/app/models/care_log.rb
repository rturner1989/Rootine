# frozen_string_literal: true

# == Schema Information
#
# Table name: care_logs
#
#  id           :bigint           not null, primary key
#  care_type    :string           not null
#  notes        :string
#  performed_at :datetime         not null
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  plant_id     :bigint           not null
#
# Indexes
#
#  index_care_logs_on_plant_id                   (plant_id)
#  index_care_logs_on_plant_id_and_performed_at  (plant_id,performed_at)
#
# Foreign Keys
#
#  fk_rails_...  (plant_id => plants.id)
#
class CareLog < ApplicationRecord
  # --- Associations ---
  belongs_to :plant

  # --- Constants ---
  WATERING = 'watering'
  FEEDING = 'feeding'
  CARE_TYPES = [WATERING, FEEDING].freeze

  # --- Scopes ---
  scope :chronological, -> { order(performed_at: :desc) }

  # --- Validations ---
  validates :care_type, presence: true, inclusion: { in: CARE_TYPES }
  validates :performed_at, presence: true

  # --- Callbacks ---
  before_validation :set_performed_at, on: :create
  after_create :update_plant_timestamps
  after_create_commit :update_user_aggregates
  after_create_commit :check_care_logged_achievements

  # --- Instance methods ---
  def as_json(_options = {})
    {
      id: id,
      care_type: care_type,
      performed_at: performed_at,
      notes: notes,
      created_at: created_at
    }
  end

  # --- Private ---
  private def set_performed_at
    self.performed_at ||= Time.current
  end

  private def update_plant_timestamps
    case care_type
    when WATERING then plant.update!(last_watered_at: performed_at)
    when FEEDING then plant.update!(last_fed_at: performed_at)
    end
  end

  private def check_care_logged_achievements
    CheckAchievementsJob.perform_later(
      event: 'care_logged',
      user_id: plant.user.id,
      source_type: 'CareLog',
      source_id: id
    )
  end

  # increment_counter is the atomic SQL op Rails' built-in counter_cache
  # uses — Plant -> Space -> User is a through-association so direct
  # counter_cache: true wouldn't work. Streak update is custom logic
  # (not a simple counter), runs after the increment.
  # rubocop:disable Rails/SkipsModelValidations -- atomic counter, no validations needed
  private def update_user_aggregates
    user = plant.user
    User.increment_counter(:care_logs_count, user.id)
    user.reload.bump_care_streak_for_today!
  end
  # rubocop:enable Rails/SkipsModelValidations
end
