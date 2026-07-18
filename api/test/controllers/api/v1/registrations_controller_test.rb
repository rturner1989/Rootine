# frozen_string_literal: true

require 'test_helper'

class Api::V1::RegistrationsControllerTest < ActionDispatch::IntegrationTest
  test 'register with valid params creates user and returns token' do
    post api_v1_registration_path, params: {
      user: { email: 'new@example.com', name: 'New User', password: 'greenthumb99', password_confirmation: 'greenthumb99' }
    }, as: :json

    assert_response :created
    json = response.parsed_body
    assert json['access_token'].present?
    assert json['user']['id'].present?
    assert_equal 'new@example.com', json['user']['email']
    assert_nil json['user']['password_digest']
  end

  test 'register with invalid params returns errors' do
    post api_v1_registration_path, params: {
      user: { email: '', name: '', password: 'short' }
    }, as: :json

    assert_response :unprocessable_entity
    json = response.parsed_body
    assert json['errors'].present?
  end

  test 'register with duplicate email returns error' do
    post api_v1_registration_path, params: {
      user: { email: 'john@doe.com', name: 'New', password: 'greenthumb99', password_confirmation: 'greenthumb99' }
    }, as: :json

    assert_response :unprocessable_entity
  end

  test 'register sets refresh token cookie' do
    post api_v1_registration_path, params: {
      user: { email: 'new@example.com', name: 'New User', password: 'greenthumb99', password_confirmation: 'greenthumb99' }
    }, as: :json

    assert_response :created
    assert cookies[:refresh_token].present?
  end

  test 'register persists onboarding_intent and onboarding_step_reached when supplied' do
    post api_v1_registration_path, params: {
      user: {
        email: 'intent@example.com', name: 'Intent User',
        password: 'greenthumb99', password_confirmation: 'greenthumb99',
        onboarding_intent: 'forgetful', onboarding_step_reached: 2
      }
    }, as: :json

    assert_response :created
    json = response.parsed_body
    assert_equal 'forgetful', json['user']['onboarding_intent']
    assert_equal 2, json['user']['onboarding_step_reached']
  end

  test 'register with invalid onboarding_intent returns 422 with field error' do
    post api_v1_registration_path, params: {
      user: {
        email: 'bad@example.com', name: 'Bad', password: 'greenthumb99', password_confirmation: 'greenthumb99',
        onboarding_intent: 'garbage'
      }
    }, as: :json

    assert_response :unprocessable_entity
    json = response.parsed_body
    assert_includes json['errors']['onboarding_intent'], 'is not included in the list'
  end

  # === throttling ===

  def register(email)
    post api_v1_registration_path, params: {
      user: { email: email, name: 'Signup', password: 'greenthumb99', password_confirmation: 'greenthumb99' }
    }, as: :json
  end

  test 'registration throttles repeated signups from one IP' do
    with_throttling do
      10.times { |attempt| register("signup#{attempt}@example.com") }
      assert_response :created

      register('signup10@example.com')

      assert_response :too_many_requests
      assert_equal 'Too many requests, please try again later.', response.parsed_body['error']
    end
  end
end
