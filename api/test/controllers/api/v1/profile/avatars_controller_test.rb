# frozen_string_literal: true

require 'test_helper'

class Api::V1::Profile::AvatarsControllerTest < ActionDispatch::IntegrationTest
  include ActionDispatch::TestProcess::FixtureFile

  setup do
    @user = users(:john)
  end

  test 'update requires authentication' do
    patch api_v1_profile_avatar_path, params: { avatar: fixture_file_upload('test_plant.jpg', 'image/jpeg') }

    assert_response :unauthorized
    assert_not @user.reload.avatar.attached?
  end

  test 'update attaches the avatar and returns the profile carrying its url' do
    patch api_v1_profile_avatar_path, headers: auth_headers(@user),
      params: { avatar: fixture_file_upload('test_plant.jpg', 'image/jpeg') }

    assert_response :ok
    assert @user.reload.avatar.attached?
    assert_match %r{/rails/active_storage/}, response.parsed_body['avatar_url']
  end

  test 'update replaces an existing avatar rather than stacking one' do
    @user.avatar.attach(fixture_file_upload('test_plant.jpg', 'image/jpeg'))
    original_blob_id = @user.avatar.blob.id

    patch api_v1_profile_avatar_path, headers: auth_headers(@user),
      params: { avatar: fixture_file_upload('test_plant.jpg', 'image/jpeg') }

    assert_response :ok
    assert_not_equal original_blob_id, @user.reload.avatar.blob.id
  end

  test 'update rejects a file that is not an allowed image and leaves the record clean' do
    patch api_v1_profile_avatar_path, headers: auth_headers(@user),
      params: { avatar: fixture_file_upload('tiny.gif', 'image/jpeg') }

    assert_response :unprocessable_content
    assert_includes response.parsed_body['errors']['avatar'], 'must be a JPEG, PNG, WebP or HEIC image'
    assert_not @user.reload.avatar.attached?, 'a refused upload must not survive on the record'
  end

  test 'a rejected upload does not clobber the avatar already there' do
    @user.avatar.attach(fixture_file_upload('test_plant.jpg', 'image/jpeg'))
    original_blob_id = @user.avatar.blob.id

    patch api_v1_profile_avatar_path, headers: auth_headers(@user),
      params: { avatar: fixture_file_upload('tiny.gif', 'image/jpeg') }

    assert_response :unprocessable_content
    assert_equal original_blob_id, @user.reload.avatar.blob.id
  end

  test 'destroy clears the avatar' do
    @user.avatar.attach(fixture_file_upload('test_plant.jpg', 'image/jpeg'))

    delete api_v1_profile_avatar_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    assert_not @user.reload.avatar.attached?
    assert_nil response.parsed_body['avatar_url']
  end

  test 'destroy is harmless when there is no avatar' do
    delete api_v1_profile_avatar_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    assert_nil response.parsed_body['avatar_url']
  end
end
