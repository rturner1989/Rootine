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
