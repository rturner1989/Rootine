# frozen_string_literal: true

class PerenualClient
  BASE_URL = 'https://perenual.com/api/v2'

  HARDINESS_ZONE_TEMPS = {
    '1' => { min: -51.1, max: -45.6 },
    '2' => { min: -45.6, max: -40.0 },
    '3' => { min: -40.0, max: -34.4 },
    '4' => { min: -34.4, max: -28.9 },
    '5' => { min: -28.9, max: -23.3 },
    '6' => { min: -23.3, max: -17.8 },
    '7' => { min: -17.8, max: -12.2 },
    '8' => { min: -12.2, max: -6.7 },
    '9' => { min: -6.7, max: -1.1 },
    '10' => { min: -1.1, max: 4.4 },
    '11' => { min: 4.4, max: 10.0 },
    '12' => { min: 10.0, max: 15.6 },
    '13' => { min: 15.6, max: 21.1 }
  }.freeze

  def initialize(connection: nil)
    @api_key = ENV.fetch('PERENUAL_API_KEY', nil)
    @conn = connection || build_connection
    @reachable = connection.present? || @api_key.present?
  end

  private def build_connection
    Faraday.new(url: BASE_URL) do |f|
      f.params['key'] = @api_key
      f.response :json
      f.response :raise_error
    end
  end

  def search(query)
    return [] unless @reachable

    Rails.cache.fetch("perenual_search:#{query.to_s.downcase.strip}", expires_in: 24.hours) do
      response = @conn.get('species-list', q: query, indoor: 1)
      (response.body['data'] || []).reject { |result| group_rollup?(result) }
    end
  rescue Faraday::Error => e
    Rails.logger.error("Perenual search failed: #{e.message}")
    []
  end

  def details(perenual_id)
    return nil unless @reachable

    response = @conn.get("species/details/#{perenual_id}")
    response.body
  rescue Faraday::Error => e
    Rails.logger.error("Perenual details failed for #{perenual_id}: #{e.message}")
    nil
  end

  def build_species(data)
    Species.new(
      common_name: data['common_name'],
      scientific_name: Array(data['scientific_name']).first,
      watering_frequency_days: parse_watering_days(data),
      feeding_frequency_days: derive_feeding_days(data),
      light_requirement: parse_sunlight(data),
      humidity_preference: derive_humidity(data),
      temperature_min: parse_temperature_min(data),
      temperature_max: parse_temperature_max(data),
      toxicity: parse_toxicity(data),
      poisonous_to_pets: parse_boolean(data['poisonous_to_pets']),
      difficulty: parse_difficulty(data),
      growth_rate: data['growth_rate']&.downcase,
      personality: derive_personality(data),
      description: data['description'],
      care_tips: generate_care_tips(data),
      image_url: data.dig('default_image', 'regular_url'),
      source: 'perenual',
      external_id: data['id'].to_s
    )
  end

  # Perenual's search results include taxonomic rollups like "Tulipa (group)"
  # or "Rose (group)" — umbrella entries for a cultivar group, not individual
  # species. They aren't useful for the onboarding picker, so strip them here
  # at the API boundary.
  private def group_rollup?(result)
    Array(result['scientific_name']).first.to_s.include?('(group)')
  end

  private def parse_watering_days(data)
    benchmark = data.dig('watering_general_benchmark', 'value')

    if benchmark.present?
      parts = benchmark.to_s.split('-').map(&:to_i)
      return parts.sum / parts.size if parts.any?(&:positive?)
    end

    case data['watering']&.downcase
    when 'frequent' then 3
    when 'minimum' then 14
    when 'none' then 30
    else 7 # average or unknown
    end
  end

  private def derive_feeding_days(data)
    case data['maintenance']&.downcase
    when 'high' then 14
    when 'low' then 60
    else 30 # moderate, medium, or unknown
    end
  end

  private def parse_sunlight(data)
    sunlight = Array(data['sunlight']).map { |s| s.to_s.downcase.strip }

    if sunlight.any? { |s| s.include?('full_sun') || s.include?('full sun') }
      'bright_direct'
    elsif sunlight.any? { |s| s.include?('full shade') || s.include?('full_shade') }
      'low'
    else
      'bright_indirect' # part shade, sun-part_shade, or unknown
    end
  end

  private def derive_humidity(data)
    return 'high' if data['tropical'] == true

    case data['watering']&.downcase
    when 'frequent' then 'high'
    when 'minimum', 'none' then 'low'
    else 'average'
    end
  end

  private def parse_temperature_min(data)
    zone = data.dig('hardiness', 'min')&.to_s
    HARDINESS_ZONE_TEMPS.dig(zone, :min)
  end

  private def parse_temperature_max(data)
    zone = data.dig('hardiness', 'max')&.to_s
    HARDINESS_ZONE_TEMPS.dig(zone, :max)
  end

  # Perenual sends this as 0/1 (occasionally true/false). Preserve nil when
  # the key is absent — NULL means "unknown", which the pet-safe filter must
  # never treat as safe.
  private def parse_boolean(value)
    return nil if value.nil?

    ActiveModel::Type::Boolean.new.cast(value)
  end

  private def parse_toxicity(data)
    # Perenual sends 0/1 — and Ruby's 0 is truthy, so cast before branching or
    # a non-toxic (0) species reads as toxic.
    toxic_to_pets = parse_boolean(data['poisonous_to_pets'])
    toxic_to_humans = parse_boolean(data['poisonous_to_humans'])

    if toxic_to_pets && toxic_to_humans
      'Toxic to pets and humans'
    elsif toxic_to_pets
      'Toxic to pets'
    elsif toxic_to_humans
      'Toxic to humans'
    else
      'Non-toxic'
    end
  end

  private def parse_difficulty(data)
    case data['care_level']&.downcase
    when 'low' then 'beginner'
    when 'high' then 'advanced'
    else 'intermediate' # medium, moderate, or unknown
    end
  end

  private def derive_personality(data)
    maintenance = data['maintenance']&.downcase
    drought = data['drought_tolerant']
    watering = data['watering']&.downcase

    if drought && maintenance == 'low'
      'prickly'
    elsif watering == 'frequent' && maintenance == 'high'
      'needy'
    elsif maintenance == 'high' || watering == 'frequent'
      'dramatic'
    elsif drought || watering == 'minimum'
      'stoic'
    else
      'chill'
    end
  end

  private def generate_care_tips(data)
    tips = []

    watering = data['watering']&.downcase
    tips << case watering
            when 'frequent' then 'Keep soil consistently moist.'
            when 'average' then 'Allow top inch of soil to dry between waterings.'
            when 'minimum' then 'Water sparingly — let soil dry out completely.'
    end

    sunlight = Array(data['sunlight']).first
    tips << "Prefers #{sunlight&.downcase} conditions." if sunlight.present?

    if data['pruning_month'].present?
      months = Array(data['pruning_month']).join(', ')
      tips << "Best pruned in #{months}."
    end

    tips << 'Keep away from pets.' if parse_boolean(data['poisonous_to_pets'])
    tips << 'Drought-tolerant — handles occasional neglect.' if data['drought_tolerant']

    tips.compact.join(' ')
  end
end
