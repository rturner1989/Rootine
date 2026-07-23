# frozen_string_literal: true

require 'test_helper'

class PerenualClientTest < ActiveSupport::TestCase
  test 'build_species captures the raw pet-toxicity boolean' do
    data = { 'id' => 99, 'common_name' => 'Test Fern', 'poisonous_to_pets' => 1 }

    species = PerenualClient.new.build_species(data)

    assert_equal true, species.poisonous_to_pets
  end

  test 'build_species leaves poisonous_to_pets nil when Perenual omits it' do
    data = { 'id' => 99, 'common_name' => 'Mystery Plant' }

    species = PerenualClient.new.build_species(data)

    assert_nil species.poisonous_to_pets
  end

  test 'toxicity reads non-toxic when Perenual sends 0 (Ruby 0 is truthy)' do
    data = { 'id' => 99, 'common_name' => 'Safe Plant', 'poisonous_to_pets' => 0, 'poisonous_to_humans' => 0 }

    species = PerenualClient.new.build_species(data)

    assert_equal 'Non-toxic', species.toxicity
    assert_not_includes species.care_tips, 'Keep away from pets'
  end

  test 'toxicity reads toxic when Perenual sends 1' do
    data = { 'id' => 99, 'common_name' => 'Spiky', 'poisonous_to_pets' => 1, 'poisonous_to_humans' => 0 }

    species = PerenualClient.new.build_species(data)

    assert_equal 'Toxic to pets', species.toxicity
    assert_includes species.care_tips, 'Keep away from pets'
  end
end
