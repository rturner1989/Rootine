# frozen_string_literal: true

# == Schema Information
#
# Table name: spaces
#
#  id                :bigint           not null, primary key
#  archived_at       :datetime
#  category          :string           default("indoor"), not null
#  humidity_level    :string           default("average"), not null
#  icon              :string
#  light_level       :string           default("medium"), not null
#  name              :string           not null
#  plants_count      :integer          default(0), not null
#  temperature_level :string           default("average"), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  user_id           :bigint           not null
#
# Indexes
#
#  index_spaces_on_user_id                  (user_id)
#  index_spaces_on_user_id_and_archived_at  (user_id,archived_at)
#  index_spaces_on_user_id_and_lower_name   (user_id, lower((name)::text)) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
class Space < ApplicationRecord
  # --- Associations ---
  belongs_to :user
  has_many :plants, dependent: :destroy

  # --- Constants ---
  ICONS = %w[couch kitchen bed bath desk hallway study conservatory patio balcony garden_bed greenhouse].freeze

  CATEGORY_LABELS = {
    indoor: 'Indoor',
    outdoor: 'Outdoor'
  }.freeze

  # Environment modifiers — applied to the species' base watering /
  # feeding cadence to land at the plant's calculated schedule. Values
  # express "this condition wants the plant watered N% sooner / later".
  # Owned by Space (not Plant) because every plant in a room shares the
  # same window and humidity; per-plant variation was the wrong model.
  LIGHT_MODIFIERS = {
    'low' => 0.2,
    'medium' => 0.0,
    'bright' => -0.15
  }.freeze

  TEMPERATURE_MODIFIERS = {
    'cool' => 0.15,
    'average' => 0.0,
    'warm' => -0.1
  }.freeze

  HUMIDITY_MODIFIERS = {
    'dry' => -0.1,
    'average' => 0.0,
    'humid' => 0.15
  }.freeze

  PRESETS = [
    { name: 'Living Room', icon: 'couch', category: 'indoor' },
    { name: 'Kitchen', icon: 'kitchen', category: 'indoor' },
    { name: 'Bedroom', icon: 'bed', category: 'indoor' },
    { name: 'Bathroom', icon: 'bath', category: 'indoor' },
    { name: 'Office', icon: 'desk', category: 'indoor' },
    { name: 'Hallway', icon: 'hallway', category: 'indoor' },
    { name: 'Study', icon: 'study', category: 'indoor' },
    { name: 'Conservatory', icon: 'conservatory', category: 'indoor' },
    { name: 'Patio', icon: 'patio', category: 'outdoor' },
    { name: 'Balcony', icon: 'balcony', category: 'outdoor' },
    { name: 'Garden bed', icon: 'garden_bed', category: 'outdoor' },
    { name: 'Greenhouse', icon: 'greenhouse', category: 'outdoor' }
  ].freeze

  # --- Enums ---
  enum :category, CATEGORY_LABELS.keys.index_with(&:to_s)

  # --- Scopes ---
  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }

  # --- Validations ---
  validates :name, presence: true, uniqueness: { scope: :user_id, case_sensitive: false }
  validates :icon, inclusion: { in: ICONS }, allow_blank: true
  validates :category, presence: true
  validates :light_level, inclusion: { in: LIGHT_MODIFIERS.keys }
  validates :temperature_level, inclusion: { in: TEMPERATURE_MODIFIERS.keys }
  validates :humidity_level, inclusion: { in: HUMIDITY_MODIFIERS.keys }

  # --- Callbacks ---
  # When a space's env shifts, every plant that lives in it needs a fresh
  # schedule — the modifier hashes flow through Plant#calculate_schedule
  # via the space relationship. Re-saving each plant triggers its own
  # before_save callback rather than recomputing inline here.
  after_update :recalculate_plant_schedules, if: :env_changed?

  # --- Class methods ---
  def self.level_options
    {
      light: LIGHT_MODIFIERS.keys,
      temperature: TEMPERATURE_MODIFIERS.keys,
      humidity: HUMIDITY_MODIFIERS.keys
    }
  end

  # --- Instance methods ---
  def archive!
    update!(archived_at: Time.current)
  end

  def unarchive!
    update!(archived_at: nil)
  end

  def archived?
    archived_at.present?
  end

  def as_json(_options = {})
    {
      id: id,
      name: name,
      icon: icon,
      category: category,
      light_level: light_level,
      temperature_level: temperature_level,
      humidity_level: humidity_level,
      archived_at: archived_at,
      plants_count: plants_count,
      created_at: created_at
    }
  end

  # --- Private ---
  private def env_changed?
    saved_change_to_light_level? || saved_change_to_temperature_level? || saved_change_to_humidity_level?
  end

  private def recalculate_plant_schedules
    plants.find_each(&:recalculate_schedule!)
  end
end
