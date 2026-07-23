# frozen_string_literal: true

require 'test_helper'

class SpeciesTest < ActiveSupport::TestCase
  test 'valid species' do
    species = Species.new(common_name: 'Fern', watering_frequency_days: 3, personality: 'needy')
    assert species.valid?
  end

  test 'requires common_name' do
    species = Species.new(watering_frequency_days: 7)
    assert_not species.valid?
    assert_includes species.errors[:common_name], "can't be blank"
  end

  test 'requires watering_frequency_days' do
    species = Species.new(common_name: 'Fern')
    assert_not species.valid?
    assert_includes species.errors[:watering_frequency_days], "can't be blank"
  end

  test 'search finds by common name' do
    results = Species.search('monstera')
    assert_equal 1, results.length
    assert_equal 'Monstera Deliciosa', results.first.common_name
  end

  test 'search finds by scientific name' do
    results = Species.search('trifasciata')
    assert_equal 1, results.length
    assert_equal 'Snake Plant', results.first.common_name
  end

  test 'search is case insensitive' do
    results = Species.search('CACTUS')
    assert_equal 1, results.length
  end

  test 'search returns empty for no match' do
    results = Species.search('unicorn')
    assert_empty results
  end

  test 'search_with_api merges local matches with Perenual results' do
    perenual_hit = { 'id' => 55, 'common_name' => 'Swiss Cheese Vine', 'scientific_name' => ['Monstera adansonii'] }
    stub = StubClient.new(search_response: [perenual_hit])

    results = Species.search_with_api('monstera', client: stub)
    names = results.map(&:common_name)

    # Local Monstera (community-ranked) first, then the Perenual-only result.
    assert_includes names, 'Monstera Deliciosa'
    assert_includes names, 'Swiss Cheese Vine'
    assert_equal 'Monstera Deliciosa', names.first
  end

  test 'search_with_api dedupes Perenual results already stored locally' do
    persisted = Species.create!(common_name: 'Fiddle Leaf Fig', watering_frequency_days: 7, personality: 'chill',
                                source: 'perenual', external_id: '77')
    stub = StubClient.new(search_response: [{ 'id' => 77, 'common_name' => 'Fiddle Leaf Fig (dupe)' }])

    results = Species.search_with_api('fiddle', client: stub)

    # The Perenual entry maps to the already-stored record — not a second card.
    assert_equal(1, results.count { |entry| entry.respond_to?(:external_id) && entry.external_id == '77' })
    assert_not_includes results.map(&:common_name), 'Fiddle Leaf Fig (dupe)'
    assert_includes results.map(&:id), persisted.id
  end

  test 'search_with_api returns just local results when Perenual yields nothing' do
    results = Species.search_with_api('monstera', client: StubClient.new(search_response: []))

    assert_equal ['Monstera Deliciosa'], results.map(&:common_name)
  end

  test 'popular scope returns only flagged species' do
    results = Species.popular
    assert_includes results.map(&:common_name), 'Monstera Deliciosa'
    assert_includes results.map(&:common_name), 'Snake Plant'
    assert_not_includes results.map(&:common_name), 'Cactus'
  end

  test 'popular defaults to false for new species' do
    species = Species.new(common_name: 'Orchid', watering_frequency_days: 7, personality: 'needy')
    assert_not species.popular
  end

  # suggested_light_level collapses the wider Species.light_requirement
  # enum onto Plant's three-way picker. Doubles as living docs for
  # which values land where.
  test 'suggested_light_level collapses direct and indirect bright species into "bright"' do
    assert_equal 'bright', Species.new(light_requirement: 'bright_direct').suggested_light_level
    assert_equal 'bright', Species.new(light_requirement: 'bright_indirect').suggested_light_level
  end

  test 'suggested_light_level maps low-light species to "low"' do
    assert_equal 'low', Species.new(light_requirement: 'low').suggested_light_level
  end

  test 'suggested_light_level maps tolerant ranges to "medium" for a neutral start' do
    assert_equal 'medium', Species.new(light_requirement: 'low_to_bright').suggested_light_level
    assert_equal 'medium', Species.new(light_requirement: 'low_to_bright_indirect').suggested_light_level
  end

  test 'suggested_light_level falls back to "medium" for unknown or missing values' do
    assert_equal 'medium', Species.new(light_requirement: 'wat').suggested_light_level
    assert_equal 'medium', Species.new(light_requirement: nil).suggested_light_level
  end

  test 'suggested_humidity_level maps high/low/average to humid/dry/average' do
    assert_equal 'humid', Species.new(humidity_preference: 'high').suggested_humidity_level
    assert_equal 'dry', Species.new(humidity_preference: 'low').suggested_humidity_level
    assert_equal 'average', Species.new(humidity_preference: 'average').suggested_humidity_level
  end

  test 'suggested_humidity_level falls back to "average" for unknown or missing values' do
    assert_equal 'average', Species.new(humidity_preference: 'wat').suggested_humidity_level
    assert_equal 'average', Species.new(humidity_preference: nil).suggested_humidity_level
  end

  test 'as_json includes suggested levels and plant_levels option arrays' do
    payload = species(:monstera).as_json

    assert_equal 'bright', payload[:suggested_light_level]
    assert_equal 'average', payload[:suggested_temperature_level]
    assert_equal 'humid', payload[:suggested_humidity_level]
    assert_equal Space.level_options, payload[:plant_levels]
  end

  class StubClient
    def initialize(details_response: nil, species_response: nil, search_response: [])
      @details_response = details_response
      @species_response = species_response
      @search_response = search_response
    end

    def details(_perenual_id) = @details_response
    def build_species(_data) = @species_response
    def search(_query) = @search_response
  end

  test 'find_or_fetch_from_api returns the persisted row when one already exists' do
    existing = Species.create!(common_name: 'Persistent', watering_frequency_days: 7, personality: 'chill',
                               source: 'perenual', external_id: '888')

    result = Species.find_or_fetch_from_api('888', client: StubClient.new,
                                            fallback: { common_name: 'IGNORED' })

    assert_equal existing.id, result.id
    assert_equal 'Persistent', result.common_name
  end

  test 'find_or_fetch_from_api falls back to search-summary fields when details are unavailable' do
    species = Species.find_or_fetch_from_api('999999',
      client: StubClient.new(details_response: nil),
      fallback: {
        common_name: 'Gardenia',
        scientific_name: 'Gardenia jasminoides',
        image_url: 'https://example.com/g.jpg'
      })

    assert_predicate species, :persisted?
    assert_equal 'Gardenia', species.common_name
    assert_equal 'Gardenia jasminoides', species.scientific_name
    assert_equal 'perenual', species.source
    assert_equal '999999', species.external_id
    assert_equal 7, species.watering_frequency_days
    assert_equal 'chill', species.personality
  end

  test 'find_or_fetch_from_api returns nil when details fail and no fallback is given' do
    assert_nil Species.find_or_fetch_from_api('999998', client: StubClient.new(details_response: nil))
  end

  test 'find_or_fetch_from_api stamps details_synced_at on a fresh fetch' do
    fresh = Species.new(common_name: 'Aloe', watering_frequency_days: 7, personality: 'chill',
                        source: 'perenual', external_id: '12345')
    stub = StubClient.new(details_response: { 'id' => '12345' }, species_response: fresh)

    species = Species.find_or_fetch_from_api('12345', client: stub)

    assert_predicate species, :persisted?
    assert_not_nil species.details_synced_at
    assert_in_delta Time.current, species.details_synced_at, 5
  end

  test 'refresh_if_stale! is a no-op when external_id is missing' do
    seeded = species(:monstera)
    assert_nil seeded.external_id
    result = seeded.refresh_if_stale!(client: StubClient.new)
    assert_equal seeded.id, result.id
    assert_nil result.details_synced_at
  end

  test 'refresh_if_stale! is a no-op when details_synced_at is within the stale window' do
    existing = Species.create!(common_name: 'Fresh', watering_frequency_days: 7, personality: 'chill',
                               source: 'perenual', external_id: 'p1',
                               details_synced_at: 1.day.ago)
    stub = StubClient.new(species_response: Species.new(common_name: 'WRONG'))

    result = existing.refresh_if_stale!(client: stub)

    assert_equal 'Fresh', result.common_name
  end

  test 'refresh_if_stale! refreshes attributes from Perenual when stale' do
    existing = Species.create!(common_name: 'Old', watering_frequency_days: 7, personality: 'chill',
                               source: 'perenual', external_id: 'p2',
                               details_synced_at: 10.days.ago)
    incoming = Species.new(common_name: 'Refreshed', scientific_name: 'New name',
                           watering_frequency_days: 5, personality: 'dramatic',
                           source: 'perenual', external_id: 'p2', care_tips: 'updated tips')
    stub = StubClient.new(details_response: { 'id' => 'p2' }, species_response: incoming)

    result = existing.refresh_if_stale!(client: stub)

    assert_equal existing.id, result.id
    assert_equal 'Refreshed', result.common_name
    assert_equal 'updated tips', result.care_tips
    assert_in_delta Time.current, result.details_synced_at, 5
  end

  test 'refresh_if_stale! preserves the popular flag on refresh' do
    existing = Species.create!(common_name: 'Iconic', watering_frequency_days: 7, personality: 'chill',
                               source: 'perenual', external_id: 'p3',
                               popular: true, details_synced_at: 10.days.ago)
    incoming = Species.new(common_name: 'Iconic', watering_frequency_days: 7, personality: 'chill',
                           source: 'perenual', external_id: 'p3', popular: false)
    stub = StubClient.new(details_response: { 'id' => 'p3' }, species_response: incoming)

    result = existing.refresh_if_stale!(client: stub)

    assert result.popular, 'popular flag should survive Perenual refresh'
  end

  test 'refresh_if_stale! falls back to self when Perenual returns nil' do
    existing = Species.create!(common_name: 'Cached', watering_frequency_days: 7, personality: 'chill',
                               source: 'perenual', external_id: 'p4',
                               details_synced_at: 10.days.ago)
    stub = StubClient.new(details_response: nil)

    result = existing.refresh_if_stale!(client: stub)

    assert_equal existing.id, result.id
    assert_equal 'Cached', result.common_name
  end
end
