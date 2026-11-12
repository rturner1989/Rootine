# frozen_string_literal: true

require 'test_helper'

class Api::V1::Profile::PasswordsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:john)
  end

  test 'update with correct current password' do
    patch api_v1_profile_password_path, headers: auth_headers(@user),
      params: { current_password: 'greenthumb99', user: { password: 'newpassword1', password_confirmation: 'newpassword1' } }, as: :json

    assert_response :ok
    assert @user.reload.authenticate('newpassword1')
  end

  test 'update with wrong current password fails' do
    patch api_v1_profile_password_path, headers: auth_headers(@user),
      params: { current_password: 'wrong', user: { password: 'newpassword1', password_confirmation: 'newpassword1' } }, as: :json

    assert_response :unprocessable_content
    json = response.parsed_body
    assert_equal 'Current password is incorrect', json['error']
  end

  test 'update with mismatched confirmation fails' do
    patch api_v1_profile_password_path, headers: auth_headers(@user),
      params: { current_password: 'greenthumb99', user: { password: 'newpassword1', password_confirmation: 'different' } }, as: :json

    assert_response :unprocessable_content
  end

  test 'update requires authentication' do
    patch api_v1_profile_password_path,
      params: { current_password: 'greenthumb99', user: { password: 'newpassword1', password_confirmation: 'newpassword1' } }, as: :json

    assert_response :unauthorized
  end

  test 'update keeps the current device signed in and revokes every other session' do
    current_raw, current = RefreshToken.generate(@user)
    _other_raw, other = RefreshToken.generate(@user)
    cookies[:refresh_token] = current_raw

    change_password

    assert_response :ok
    assert current.reload.usable?
    assert_not other.reload.usable?
  end

  test 'update without a refresh cookie revokes every session' do
    _raw_a, session_a = RefreshToken.generate(@user)
    _raw_b, session_b = RefreshToken.generate(@user)

    change_password

    assert_response :ok
    assert_not session_a.reload.usable?
    assert_not session_b.reload.usable?
  end

  test "another user's refresh cookie keeps none of this user's sessions" do
    _johns_raw, johns = RefreshToken.generate(@user)
    janes_raw, janes = RefreshToken.generate(users(:jane))
    cookies[:refresh_token] = janes_raw

    change_password

    assert_response :ok
    assert_not johns.reload.usable?
    assert janes.reload.usable?
  end

  test 'a rejected change revokes no sessions' do
    _raw, session = RefreshToken.generate(@user)

    patch api_v1_profile_password_path, headers: auth_headers(@user),
      params: { current_password: 'wrong', user: { password: 'newpassword1', password_confirmation: 'newpassword1' } }, as: :json

    assert_response :unprocessable_content
    assert session.reload.usable?
  end

  test 'update tells the user their other devices were signed out' do
    change_password

    assert_equal 'Password updated — your other devices have been signed out.', response.parsed_body['message']
  end

  private def change_password
    patch api_v1_profile_password_path, headers: auth_headers(@user),
      params: { current_password: 'greenthumb99', user: { password: 'newpassword1', password_confirmation: 'newpassword1' } }, as: :json
  end
end
