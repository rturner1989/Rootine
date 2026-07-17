# frozen_string_literal: true

require 'test_helper'

class Api::V1::ProfilesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:john)
  end

  test 'show requires authentication' do
    get api_v1_profile_path, as: :json

    assert_response :unauthorized
  end

  test 'show returns current user' do
    get api_v1_profile_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    json = response.parsed_body
    assert_equal @user.email, json['email']
    assert_equal @user.name, json['name']
    assert_nil json['password_digest']
  end

  test 'update profile fields' do
    patch api_v1_profile_path, headers: auth_headers(@user),
      params: { user: { name: 'Updated Name', timezone: 'America/New_York' } }, as: :json

    assert_response :ok
    @user.reload
    assert_equal 'Updated Name', @user.name
    assert_equal 'America/New_York', @user.timezone
  end

  test 'update with invalid email returns error' do
    patch api_v1_profile_path, headers: auth_headers(@user),
      params: { user: { email: 'not-an-email' } }, as: :json

    assert_response :unprocessable_content
  end

  test 'update with duplicate email returns error' do
    patch api_v1_profile_path, headers: auth_headers(@user),
      params: { user: { email: 'jane@doe.com' } }, as: :json

    assert_response :unprocessable_content
  end

  test 'update onboarding_intent and onboarding_step_reached' do
    patch api_v1_profile_path, headers: auth_headers(@user),
      params: { user: { onboarding_intent: 'just_starting', onboarding_step_reached: 4 } }, as: :json

    assert_response :ok
    @user.reload
    assert_equal 'just_starting', @user.onboarding_intent
    assert_equal 4, @user.onboarding_step_reached
  end

  test 'update with invalid onboarding_intent returns 422' do
    patch api_v1_profile_path, headers: auth_headers(@user),
      params: { user: { onboarding_intent: 'garbage' } }, as: :json

    assert_response :unprocessable_content
    json = response.parsed_body
    assert_includes json['errors']['onboarding_intent'], 'is not included in the list'
  end

  test 'show returns notification preferences defaulting to opted in' do
    get api_v1_profile_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    json = response.parsed_body
    assert json['notify_care_reminders']
    assert json['notify_achievements']
  end

  test 'show returns the stats the Me page renders' do
    get api_v1_profile_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    stats = response.parsed_body['stats']
    assert_equal @user.plants_count, stats['plants_count']
    assert_equal @user.care_logs_count, stats['care_logs_count']
    assert_equal @user.vitality_percent, stats['vitality_percent']
    assert_equal @user.effective_current_care_streak_days, stats['care_streak_days']
    assert_equal @user.created_at.to_date.to_s, response.parsed_body['joined_on']
  end

  test 'update notification preferences' do
    patch api_v1_profile_path, headers: auth_headers(@user),
      params: { user: { notify_care_reminders: false, notify_achievements: false } }, as: :json

    assert_response :ok
    @user.reload
    assert_not @user.notify_care_reminders
    assert_not @user.notify_achievements
  end

  test 'destroy requires authentication' do
    assert_no_difference -> { User.count } do
      delete api_v1_profile_path, params: { current_password: 'greenthumb99' }, as: :json
    end

    assert_response :unauthorized
  end

  test 'destroy requires the current password' do
    assert_no_difference -> { User.count } do
      delete api_v1_profile_path, headers: auth_headers(@user),
        params: { current_password: 'wrong-password' }, as: :json
    end

    assert_response :unprocessable_content
    assert_equal 'Current password is incorrect', response.parsed_body['error']
  end

  test 'destroy without a password does not delete the account' do
    assert_no_difference -> { User.count } do
      delete api_v1_profile_path, headers: auth_headers(@user), as: :json
    end

    assert_response :unprocessable_content
  end

  test 'destroy deletes the account and cascades its spaces and plants' do
    space = @user.spaces.first
    assert space, 'fixture user must own a space for the cascade assertion to mean anything'

    assert_difference -> { User.count }, -1 do
      assert_difference -> { Space.count }, -@user.spaces.count do
        delete api_v1_profile_path, headers: auth_headers(@user),
          params: { current_password: 'greenthumb99' }, as: :json
      end
    end

    assert_response :no_content
    assert_not Space.exists?(space.id)
  end

  test 'destroy only deletes the current user' do
    other = users(:jane)

    delete api_v1_profile_path, headers: auth_headers(@user),
      params: { current_password: 'greenthumb99' }, as: :json

    assert_response :no_content
    assert User.exists?(other.id)
  end

  test 'update persists latitude, longitude, and location_label' do
    patch api_v1_profile_path, headers: auth_headers(@user),
      params: { user: { latitude: 53.4808, longitude: -2.2426, location_label: 'Manchester' } }, as: :json

    assert_response :ok
    json = response.parsed_body
    assert_in_delta 53.4808, json['latitude'], 0.0001
    assert_in_delta(-2.2426, json['longitude'], 0.0001)
    assert_equal 'Manchester', json['location_label']
  end
end
