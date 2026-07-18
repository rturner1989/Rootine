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

  # === throttling ===

  def attempt_login(email:, password: 'wrong')
    post api_v1_session_path, params: { session: { email: email, password: password } }, as: :json
  end

  test 'login still succeeds while throttling is active' do
    # The email throttle reads the request body to find the address, so this
    # guards the whole read-then-rewind path against breaking normal login.
    with_throttling do
      attempt_login(email: 'john@doe.com', password: 'greenthumb99')

      assert_response :ok
      assert response.parsed_body['access_token'].present?
    end
  end

  test 'login throttles after repeated attempts against one email' do
    with_throttling do
      10.times { attempt_login(email: 'john@doe.com') }
      assert_response :unauthorized

      attempt_login(email: 'john@doe.com')

      assert_response :too_many_requests
      assert_equal 'Too many requests, please try again later.', response.parsed_body['error']
      assert_equal 900.to_s, response.headers['Retry-After']
    end
  end

  test 'login throttle keys on the email so one target does not lock out another' do
    with_throttling do
      11.times { attempt_login(email: 'john@doe.com') }
      assert_response :too_many_requests

      attempt_login(email: 'jane@doe.com')

      assert_response :unauthorized
    end
  end

  test 'login throttles on IP once attempts are sprayed across many emails' do
    with_throttling do
      # Under the per-email limit each time, so only the IP throttle can fire.
      30.times { |attempt| attempt_login(email: "target#{attempt}@example.com") }
      assert_response :unauthorized

      attempt_login(email: 'target30@example.com')

      assert_response :too_many_requests
    end
  end

  test 'logout is not throttled by the login limits' do
    with_throttling do
      post api_v1_session_path, params: { session: { email: 'john@doe.com', password: 'greenthumb99' } }, as: :json

      # Push the IP past the login limit, so a throttle that ignored the verb
      # would catch the logout below rather than only the failed logins.
      30.times { |attempt| attempt_login(email: "target#{attempt}@example.com") }
      assert_response :too_many_requests

      delete api_v1_session_path, as: :json

      assert_response :no_content
    end
  end
end
