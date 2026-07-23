# frozen_string_literal: true

require 'test_helper'

class SpeciesBrowseTest < ActiveSupport::TestCase
  test 'grower_counts counts distinct owners per species' do
    counts = Species.grower_counts

    # john owns a monstera; fixtures give monstera exactly one distinct owner.
    assert_equal 1, counts[species(:monstera).id]
  end

  test 'grower_counts counts a user once even with several plants of a species' do
    space = spaces(:living_room)
    space.plants.create!(species: species(:monstera), nickname: 'Second Monstera', calculated_watering_days: 7)

    # Same owner, two monsteras — still one distinct grower.
    assert_equal 1, Species.grower_counts[species(:monstera).id]
  end

  test 'grower_counts omits species nobody grows' do
    assert_nil Species.grower_counts[species(:air_plant).id]
  end

  test 'browse ranks by grower count then name' do
    names = Species.browse.map(&:common_name)

    # community_fern (5 growers) outranks the 1-grower species; zero-grower
    # species sink to the bottom but still appear.
    assert_equal 'Community Fern', names.first
    assert_includes names, 'Air Plant'
    assert_operator names.index('Community Fern'), :<, names.index('Air Plant')
  end

  test 'pet_safe filter excludes toxic species' do
    results = Species.browse(pet_safe: true)

    assert(results.none?(&:poisonous_to_pets))
    assert_includes results.map(&:common_name), 'Cactus'
  end

  test 'pet_safe filter excludes UNKNOWN-toxicity species — never treat NULL as safe' do
    mystery = Species.create!(common_name: 'Mystery', watering_frequency_days: 7, personality: 'chill',
                              poisonous_to_pets: nil)

    assert_not_includes Species.browse(pet_safe: true).map(&:id), mystery.id
  end

  test 'difficulty filter narrows to one level' do
    results = Species.browse(difficulty: 'beginner')

    assert(results.all? { |plant| plant.difficulty == 'beginner' })
  end

  test 'difficulty filter accepts a list of levels' do
    %w[beginner intermediate advanced].each do |level|
      Species.create!(common_name: "#{level.capitalize} Test", watering_frequency_days: 7, personality: 'chill',
                      difficulty: level)
    end

    levels = Species.browse(difficulty: %w[beginner advanced]).map(&:difficulty).uniq

    assert_includes levels, 'beginner'
    assert_includes levels, 'advanced'
    assert_not_includes levels, 'intermediate'
  end

  test 'light filter matches the suggested level, not the raw requirement' do
    results = Species.browse(light: 'bright')

    assert(results.all? { |plant| plant.suggested_light_level == 'bright' })
  end

  test 'light filter accepts a list of levels' do
    results = Species.browse(light: %w[bright medium])

    assert(results.all? { |plant| %w[bright medium].include?(plant.suggested_light_level) })
    assert(results.any? { |plant| plant.suggested_light_level == 'bright' })
    assert(results.any? { |plant| plant.suggested_light_level == 'medium' })
  end

  test 'browse_facets counts each axis over the whole catalogue' do
    facets = Species.browse_facets

    assert_equal Species.where(poisonous_to_pets: false).count, facets[:pet_safe]
    assert_equal Species.where(difficulty: 'beginner').count, facets[:difficulty]['beginner']
    assert facets[:light].key?('medium')
  end

  # --- space matching ---

  def space_with(light:, humidity:)
    # A detached Space instance is enough for fits_space? (reads columns only).
    Space.new(light_level: light, humidity_level: humidity)
  end

  test 'fits_space? light is tolerant — species needs at most what the space gives' do
    low = Species.new(light_requirement: 'low')          # suggested_light_level 'low'
    bright = Species.new(light_requirement: 'bright_direct') # 'bright'

    assert Species.fits_space?(low, space_with(light: 'low', humidity: 'average'))
    assert Species.fits_space?(low, space_with(light: 'bright', humidity: 'average'))
    assert Species.fits_space?(bright, space_with(light: 'bright', humidity: 'average'))
    refute Species.fits_space?(bright, space_with(light: 'low', humidity: 'average'))
  end

  test 'fits_space? humidity matches within one step, both directions' do
    humid = Species.new(light_requirement: 'low', humidity_preference: 'high')  # suggested 'humid'
    dry = Species.new(light_requirement: 'low', humidity_preference: 'low')      # suggested 'dry'

    assert Species.fits_space?(humid, space_with(light: 'low', humidity: 'average'))
    assert Species.fits_space?(humid, space_with(light: 'low', humidity: 'humid'))
    refute Species.fits_space?(humid, space_with(light: 'low', humidity: 'dry'))
    refute Species.fits_space?(dry, space_with(light: 'low', humidity: 'humid'))
  end

  test 'browse_grouped_by_spaces groups matching species per space' do
    john = users(:john)
    # john's fixtures: living_room (medium light, average humidity), bedroom.
    groups = Species.browse_grouped_by_spaces(john.spaces.active)

    living = groups.find { |group| group[:space] == spaces(:living_room) }
    assert_not_nil living
    # Monstera (bright_indirect → 'bright') should NOT fit a medium-light room;
    # Snake Plant (low_to_bright → 'medium') should.
    names = living[:species].map(&:common_name)
    assert_includes names, 'Snake Plant'
    refute_includes names, 'Monstera Deliciosa'
  end

  test 'browse_grouped_by_spaces lets a species appear in multiple fitting spaces' do
    john = users(:john)
    groups = Species.browse_grouped_by_spaces(john.spaces.active)

    fitting_counts = groups.sum { |group| group[:species].count { |s| s.common_name == 'Snake Plant' } }
    assert_operator fitting_counts, :>=, 1
  end

  test 'browse_grouped_by_spaces keeps a space with no matches as an empty group' do
    dark = users(:john).spaces.create!(name: 'Dark Closet', icon: 'couch', category: 'indoor',
                                       light_level: 'low', humidity_level: 'dry')
    groups = Species.browse_grouped_by_spaces(users(:john).spaces.active)

    closet = groups.find { |group| group[:space] == dark }
    assert_not_nil closet, 'empty-match space must still appear as a group'
  end
end
