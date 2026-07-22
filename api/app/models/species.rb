# frozen_string_literal: true

# == Schema Information
#
# Table name: species
#
#  id                      :bigint           not null, primary key
#  care_tips               :text
#  common_name             :string           not null
#  description             :text
#  details_synced_at       :datetime
#  difficulty              :string
#  feeding_frequency_days  :integer
#  growth_rate             :string
#  humidity_preference     :string
#  image_url               :string
#  light_requirement       :string
#  personality             :string           default("chill"), not null
#  poisonous_to_pets       :boolean
#  popular                 :boolean          default(FALSE), not null
#  scientific_name         :string
#  source                  :string           default("seed"), not null
#  temperature_max         :decimal(4, 1)
#  temperature_min         :decimal(4, 1)
#  toxicity                :string
#  watering_frequency_days :integer          not null
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  external_id             :string
#
# Indexes
#
#  index_species_on_common_name             (common_name)
#  index_species_on_popular                 (popular) WHERE (popular = true)
#  index_species_on_scientific_name         (scientific_name)
#  index_species_on_source_and_external_id  (source,external_id) UNIQUE WHERE (external_id IS NOT NULL)
#
class Species < ApplicationRecord
  include PgSearch::Model

  # Deleting a species leaves its plants, just unlinked — matches Plant's
  # `belongs_to :species, optional: true`.
  has_many :plants, dependent: :nullify

  # Below this many distinct growers, aggregates would describe one or two
  # identifiable people rather than a community pattern — suppress entirely.
  COMMUNITY_MIN_GROWERS = 5

  # Species surfaced as empty-state suggestions in the onboarding search
  # picker (before the user has typed anything). Curated for beginner
  # friendliness + iconic status. The seed reads this list and flags
  # matching rows with `popular: true` on insert/update.
  POPULAR_NAMES = [
    'Monstera Deliciosa',
    'Snake Plant',
    'Pothos',
    'Spider Plant',
    'ZZ Plant',
    'Aloe Vera'
  ].freeze

  # Collapse Species.light_requirement onto Plant's three-way picker.
  # Tolerant ranges land on 'medium' as a neutral starting point.
  SUGGESTED_LIGHT_LEVEL = {
    'bright_direct' => 'bright',
    'bright_indirect' => 'bright',
    'low' => 'low',
    'low_to_bright' => 'medium',
    'low_to_bright_indirect' => 'medium'
  }.freeze

  SUGGESTED_HUMIDITY_LEVEL = {
    'high' => 'humid',
    'low' => 'dry',
    'average' => 'average'
  }.freeze

  STALE_AFTER = 7.days

  pg_search_scope :search,
    against: [:common_name, :scientific_name],
    using: {
      tsearch: { prefix: true },
      trigram: {}
    }

  scope :popular, -> { where(popular: true) }

  def self.popular_payload
    Rails.cache.fetch('species:popular:v1', expires_in: 1.hour) do
      popular.order(:common_name).limit(10).as_json
    end
  end

  # { species_id => number of distinct users growing it }. One grouped query;
  # species grown by nobody are simply absent (callers treat missing as 0).
  def self.grower_counts
    Plant.joins(:space).group(:species_id).distinct.count('spaces.user_id')
  end

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

  def self.median(numbers)
    return nil if numbers.empty?

    sorted = numbers.sort
    middle = sorted.size / 2
    return sorted[middle] if sorted.size.odd?

    ((sorted[middle - 1] + sorted[middle]) / 2.0).round
  end

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

  validates :common_name, presence: true
  validates :watering_frequency_days, presence: true, numericality: { greater_than: 0 }
  validates :personality, presence: true

  def self.search_with_api(query)
    return [] if query.blank?

    local_results = search(query).limit(10).to_a
    return local_results if local_results.any?

    client = PerenualClient.new
    api_results = client.search(query)

    # Return search summaries — details fetched on selection, not upfront
    api_results.first(10).map do |result|
      existing = find_by(source: 'perenual', external_id: result['id'].to_s)
      existing || SpeciesSearchResult.new(result)
    end
  end

  def self.find_or_fetch_from_api(perenual_id, fallback: {}, client: PerenualClient.new)
    existing = find_by(source: 'perenual', external_id: perenual_id.to_s)
    return existing.refresh_if_stale!(client: client) if existing

    details = client.details(perenual_id)

    species = if details
      client.build_species(details).tap { |built| built.details_synced_at = Time.current }
    elsif fallback[:common_name].present?
      build_fallback_from_search(perenual_id, fallback)
    end

    return nil unless species

    unless species.save
      Rails.logger.warn("Failed to save species from Perenual (ID: #{perenual_id}): #{species.errors.full_messages.join(', ')}")
      return nil
    end

    species
  end

  def refresh_if_stale!(client: PerenualClient.new)
    return self unless external_id.present? && stale_details?

    details = client.details(external_id)
    return self unless details

    fresh = client.build_species(details)
    assign_attributes(fresh.attributes.except('id', 'created_at', 'updated_at', 'popular'))
    self.details_synced_at = Time.current
    save ? self : tap { reload }
  end

  def stale_details?
    details_synced_at.nil? || details_synced_at < STALE_AFTER.ago
  end

  def self.build_fallback_from_search(perenual_id, data)
    new(
      common_name: data[:common_name],
      scientific_name: data[:scientific_name].presence,
      image_url: data[:image_url].presence,
      source: 'perenual',
      external_id: perenual_id.to_s,
      watering_frequency_days: 7,
      feeding_frequency_days: 30
    )
  end

  def suggested_light_level
    SUGGESTED_LIGHT_LEVEL[light_requirement] || 'medium'
  end

  def suggested_humidity_level
    SUGGESTED_HUMIDITY_LEVEL[humidity_preference] || 'average'
  end

  def as_json(_options = {})
    {
      id: id,
      common_name: common_name,
      scientific_name: scientific_name,
      watering_frequency_days: watering_frequency_days,
      feeding_frequency_days: feeding_frequency_days,
      light_requirement: light_requirement,
      humidity_preference: humidity_preference,
      temperature_min: temperature_min,
      temperature_max: temperature_max,
      toxicity: toxicity,
      difficulty: difficulty,
      growth_rate: growth_rate,
      personality: personality,
      popular: popular,
      description: description,
      care_tips: care_tips,
      image_url: image_url,
      suggested_light_level: suggested_light_level,
      # Species.temperature_min/max are hardiness ranges, not ideal-spot
      # temperatures — no clean map to cool/average/warm. User adjusts.
      suggested_temperature_level: 'average',
      suggested_humidity_level: suggested_humidity_level,
      plant_levels: Space.level_options
    }
  end
end
