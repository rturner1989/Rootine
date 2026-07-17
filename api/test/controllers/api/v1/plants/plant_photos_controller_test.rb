# frozen_string_literal: true

require 'test_helper'

class Api::V1::Plants::PlantPhotosControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:john)
    @plant = plants(:sir_plantalot)
  end

  test 'index returns photos in chronological order' do
    @plant.plant_photos.create!(taken_at: 1.week.ago, image: fixture_image)
    @plant.plant_photos.create!(taken_at: 1.day.ago, image: fixture_image)

    get api_v1_plant_plant_photos_path(@plant), headers: auth_headers(@user), as: :json

    assert_response :ok
    photos = response.parsed_body['photos']
    assert_equal 2, photos.length
    first_time = Time.zone.parse(photos[0]['taken_at'])
    second_time = Time.zone.parse(photos[1]['taken_at'])
    assert first_time > second_time
  end

  test 'index scopes to the current user' do
    @plant.plant_photos.create!(taken_at: 1.day.ago, image: fixture_image)

    get api_v1_plant_plant_photos_path(@plant), headers: auth_headers(users(:jane)), as: :json

    assert_response :not_found
  end

  test 'index requires authentication' do
    get api_v1_plant_plant_photos_path(@plant), as: :json

    assert_response :unauthorized
  end

  test 'cannot access other users plant photos' do
    other = users(:jane)

    get api_v1_plant_plant_photos_path(@plant), headers: auth_headers(other), as: :json

    assert_response :not_found
  end

  test 'create uploads photo with image' do
    assert_difference('PlantPhoto.count', 1) do
      post api_v1_plant_plant_photos_path(@plant), headers: auth_headers(@user),
        params: { plant_photo: { image: fixture_image, caption: 'Looking great!' } }
    end

    assert_response :created
    json = response.parsed_body
    assert_equal 'Looking great!', json['caption']
    assert json['image_url'].present?
  end

  test 'create defaults taken_at to now' do
    post api_v1_plant_plant_photos_path(@plant), headers: auth_headers(@user),
      params: { plant_photo: { image: fixture_image } }

    assert_response :created
    json = response.parsed_body
    assert_in_delta Time.current, Time.zone.parse(json['taken_at']), 2.seconds
  end

  test 'create fails without image' do
    post api_v1_plant_plant_photos_path(@plant), headers: auth_headers(@user),
      params: { plant_photo: { caption: 'No image' } }

    assert_response :unprocessable_content
  end

  test 'cannot create on other users plant' do
    other = users(:jane)

    post api_v1_plant_plant_photos_path(@plant), headers: auth_headers(other),
      params: { plant_photo: { image: fixture_image } }

    assert_response :not_found
  end

  test 'destroy removes photo' do
    photo = @plant.plant_photos.create!(image: fixture_image)

    assert_difference('PlantPhoto.count', -1) do
      delete api_v1_plant_plant_photo_path(@plant, photo), headers: auth_headers(@user), as: :json
    end

    assert_response :no_content
  end

  test 'cannot destroy other users photo' do
    photo = @plant.plant_photos.create!(image: fixture_image)
    other = users(:jane)

    delete api_v1_plant_plant_photo_path(@plant, photo), headers: auth_headers(other), as: :json

    assert_response :not_found
  end

  test 'create rejects a file that is not an allowed image, and stores nothing' do
    assert_no_difference -> { PlantPhoto.count } do
      post api_v1_plant_plant_photos_path(@plant), headers: auth_headers(@user),
        params: { plant_photo: { image: fixture_file_upload('tiny.gif', 'image/jpeg') } }
    end

    assert_response :unprocessable_content
    assert_includes response.parsed_body['errors']['image'], 'must be a JPEG, PNG, WebP or HEIC image'
  end

  test 'create rejects an image over the size cap' do
    oversized = Rack::Test::UploadedFile.new(
      StringIO.new(file_fixture('test_plant.jpg').binread + ('x' * PlantPhoto::IMAGE_MAX_BYTES)),
      'image/jpeg',
      original_filename: 'huge.jpg'
    )

    assert_no_difference -> { PlantPhoto.count } do
      post api_v1_plant_plant_photos_path(@plant), headers: auth_headers(@user),
        params: { plant_photo: { image: oversized } }
    end

    assert_response :unprocessable_content
  end

  private def fixture_image
    fixture_file_upload('test_plant.jpg', 'image/jpeg')
  end
end
