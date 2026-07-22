# frozen_string_literal: true

require 'test_helper'

class Api::V1::SpeciesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:john)
  end

  test 'index returns matching local species' do
    get api_v1_species_index_path(q: 'monstera'), headers: auth_headers(@user), as: :json

    assert_response :ok
    json = response.parsed_body
    assert(json.any? { |s| s['common_name'] == 'Monstera Deliciosa' })
  end

  test 'index returns popular species when q is blank' do
    get api_v1_species_index_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    json = response.parsed_body
    names = json.pluck('common_name')
    assert_includes names, 'Monstera Deliciosa'
    assert_includes names, 'Snake Plant'
    assert_not_includes names, 'Cactus'
  end

  test 'index returns popular species when q is an empty string' do
    get api_v1_species_index_path(q: ''), headers: auth_headers(@user), as: :json

    assert_response :ok
    names = response.parsed_body.pluck('common_name')
    assert_includes names, 'Monstera Deliciosa'
  end

  test 'index requires authentication' do
    get api_v1_species_index_path(q: 'monstera'), as: :json

    assert_response :unauthorized
  end

  test 'show returns species detail' do
    species = species(:monstera)

    get api_v1_species_path(species), headers: auth_headers(@user), as: :json

    assert_response :ok
    json = response.parsed_body
    assert_equal 'Monstera Deliciosa', json['common_name']
    assert_equal 'dramatic', json['personality']
  end

  test 'show returns not found for invalid id' do
    get api_v1_species_path(id: 999_999), headers: auth_headers(@user), as: :json

    assert_response :not_found
  end

  # === browse + community ===

  test 'bare index still returns the popular payload for the onboarding picker' do
    get api_v1_species_index_path, headers: auth_headers(@user), as: :json

    assert response.parsed_body.is_a?(Array), 'bare index must stay the popular array shape'
  end

  test 'browse index returns ranked species plus facets' do
    get api_v1_species_index_path(browse: 1), headers: auth_headers(@user), as: :json

    body = response.parsed_body
    assert body.key?('species')
    assert body.key?('facets')
    assert_equal 'Community Fern', body['species'].first['common_name']
  end

  test 'browse index applies the pet_safe filter' do
    get api_v1_species_index_path(browse: 1, pet_safe: true), headers: auth_headers(@user), as: :json

    names = response.parsed_body['species'].map { |plant| plant['common_name'] }
    assert_includes names, 'Cactus'
    refute_includes names, 'Monstera Deliciosa'
  end

  test 'show includes the community block' do
    get api_v1_species_path(species(:community_fern)), headers: auth_headers(@user), as: :json

    assert_equal 5, response.parsed_body['community']['grower_count']
  end

  test 'show omits community below the floor' do
    get api_v1_species_path(species(:monstera)), headers: auth_headers(@user), as: :json

    assert_nil response.parsed_body['community']
  end
end
