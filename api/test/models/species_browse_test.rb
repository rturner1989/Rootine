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
end
