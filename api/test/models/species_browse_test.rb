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

    assert(results.none? { |plant| plant.poisonous_to_pets })
    assert_includes results.map(&:common_name), 'Cactus'
  end

  test 'pet_safe filter excludes UNKNOWN-toxicity species — never treat NULL as safe' do
    mystery = Species.create!(common_name: 'Mystery', watering_frequency_days: 7, personality: 'chill',
                              poisonous_to_pets: nil)

    refute_includes Species.browse(pet_safe: true).map(&:id), mystery.id
  end

  test 'difficulty filter narrows to one level' do
    results = Species.browse(difficulty: 'beginner')

    assert(results.all? { |plant| plant.difficulty == 'beginner' })
  end

  test 'light filter matches the suggested level, not the raw requirement' do
    results = Species.browse(light: 'bright')

    assert(results.all? { |plant| plant.suggested_light_level == 'bright' })
  end

  test 'browse_facets counts each axis over the whole catalogue' do
    facets = Species.browse_facets

    assert_equal Species.where(poisonous_to_pets: false).count, facets[:pet_safe]
    assert_equal Species.where(difficulty: 'beginner').count, facets[:difficulty]['beginner']
    assert facets[:light].key?('medium')
  end
end
