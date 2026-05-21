# frozen_string_literal: true

require 'test_helper'

class Api::V1::PhotosControllerTest < ActionDispatch::IntegrationTest
  include ActionDispatch::TestProcess::FixtureFile

  setup do
    @john = users(:john)
    @jane = users(:jane)
    @sir = plants(:sir_plantalot)
    @spike = plants(:spike)
  end

  test 'index requires authentication' do
    get api_v1_photos_path, as: :json
    assert_response :unauthorized
  end

  test 'index returns the photos + next_cursor payload shape' do
    create_photo(plant: @sir, taken_at: 1.day.ago, caption: 'Looking good')

    get api_v1_photos_path, headers: auth_headers(@john), as: :json

    assert_response :ok
    body = response.parsed_body
    assert body.key?('photos')
    assert body.key?('next_cursor')
    photo = body['photos'].first
    assert photo['image_url'].present?
    assert_equal 'Looking good', photo['caption']
    assert_equal @sir.id, photo.dig('plant', 'id')
    assert_equal @sir.nickname, photo.dig('plant', 'nickname')
  end

  test 'index returns newest first across every plant the user owns' do
    create_photo(plant: @sir, taken_at: 5.days.ago)
    create_photo(plant: @spike, taken_at: 1.day.ago)

    get api_v1_photos_path, headers: auth_headers(@john), as: :json

    plant_ids = response.parsed_body['photos'].map { |photo| photo.dig('plant', 'id') }
    assert_equal [@spike.id, @sir.id], plant_ids
  end

  test 'index scopes photos to the current user' do
    create_photo(plant: @sir, taken_at: 1.day.ago)

    get api_v1_photos_path, headers: auth_headers(@jane), as: :json

    assert_response :ok
    assert_empty response.parsed_body['photos']
  end

  test 'index filters by plant_ids' do
    create_photo(plant: @sir, taken_at: 1.day.ago)
    create_photo(plant: @spike, taken_at: 2.days.ago)

    get api_v1_photos_path(plant_ids: @sir.id), headers: auth_headers(@john), as: :json

    plant_ids = response.parsed_body['photos'].map { |photo| photo.dig('plant', 'id') }.uniq
    assert_equal [@sir.id], plant_ids
  end

  test 'index filters by a comma-separated plant_ids list' do
    create_photo(plant: @sir, taken_at: 1.day.ago)
    create_photo(plant: @spike, taken_at: 2.days.ago)

    get api_v1_photos_path(plant_ids: "#{@sir.id},#{@spike.id}"), headers: auth_headers(@john), as: :json

    plant_ids = response.parsed_body['photos'].map { |photo| photo.dig('plant', 'id') }
    assert_equal [@sir.id, @spike.id], plant_ids
  end

  test 'index filters by date range, date_to inclusive of the cap day' do
    create_photo(plant: @sir, taken_at: 1.day.ago)
    on_cap = create_photo(plant: @sir, taken_at: 4.days.ago.beginning_of_day + 9.hours)
    create_photo(plant: @sir, taken_at: 20.days.ago)

    get api_v1_photos_path(date_from: 6.days.ago.to_date.iso8601, date_to: 4.days.ago.to_date.iso8601),
        headers: auth_headers(@john), as: :json

    ids = response.parsed_body['photos'].pluck('id')
    assert_equal [on_cap.id], ids
  end

  test 'index honours the before cursor' do
    create_photo(plant: @sir, taken_at: 2.days.ago)
    create_photo(plant: @sir, taken_at: 6.days.ago)
    cursor = 4.days.ago.iso8601

    get api_v1_photos_path(before: cursor), headers: auth_headers(@john), as: :json

    response.parsed_body['photos'].each do |photo|
      assert Time.iso8601(photo['taken_at']) < Time.iso8601(cursor)
    end
  end

  test 'index applies the limit and returns a cursor when capped' do
    6.times { |i| create_photo(plant: @sir, taken_at: (i + 1).days.ago) }

    get api_v1_photos_path(limit: 4), headers: auth_headers(@john), as: :json

    body = response.parsed_body
    assert_equal 4, body['photos'].size
    assert_equal body['photos'].last['taken_at'], body['next_cursor']
  end

  test 'index next_cursor is nil when fewer than the limit' do
    create_photo(plant: @sir, taken_at: 1.day.ago)

    get api_v1_photos_path, headers: auth_headers(@john), as: :json

    assert_nil response.parsed_body['next_cursor']
  end

  private def create_photo(plant:, **attrs)
    plant.plant_photos.create!(
      image: fixture_file_upload('test_plant.jpg', 'image/jpeg'),
      **attrs
    )
  end
end
