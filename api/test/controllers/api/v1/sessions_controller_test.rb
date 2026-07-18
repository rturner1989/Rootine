# frozen_string_literal: true

require 'test_helper'

class Api::V1::SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:john)
  end

  test 'login with valid credentials returns token' do
    post api_v1_session_path, params: { session: { email: 'john@doe.com', password: 'greenthumb99' } }, as: :json

    assert_response :ok
    json = response.parsed_body
    assert json['access_token'].present?
    assert_equal @user.id, json['user']['id']
    # The client seeds its one profile cache from this payload, so it must
    # carry stats the way GET /profile does.
    assert json['user'].key?('stats'), 'login payload must include stats'
  end

  test 'login with invalid password returns unauthorized' do
    post api_v1_session_path, params: { session: { email: 'john@doe.com', password: 'wrong' } }, as: :json

    assert_response :unauthorized
    json = response.parsed_body
    assert_equal 'Invalid email or password', json['error']
  end

  test 'login with unknown email returns unauthorized' do
    post api_v1_session_path, params: { session: { email: 'nobody@example.com', password: 'greenthumb99' } }, as: :json

    assert_response :unauthorized
  end

  test 'login sets refresh token cookie' do
    post api_v1_session_path, params: { session: { email: 'john@doe.com', password: 'greenthumb99' } }, as: :json

    assert_response :ok
    assert cookies[:refresh_token].present?
  end

  test 'logout revokes refresh token and clears cookie' do
    post api_v1_session_path, params: { session: { email: 'john@doe.com', password: 'greenthumb99' } }, as: :json
    raw_token = cookies[:refresh_token]

    delete api_v1_session_path, as: :json

    assert_response :no_content
    refresh = RefreshToken.find_by_raw_token(raw_token)
    assert refresh.revoked_at.present?
  end
end
