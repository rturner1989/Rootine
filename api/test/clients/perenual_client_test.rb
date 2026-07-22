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
end
