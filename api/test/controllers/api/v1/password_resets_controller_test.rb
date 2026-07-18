# frozen_string_literal: true

require 'test_helper'

class Api::V1::PasswordResetsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:john)
    ActionMailer::Base.deliveries.clear
  end

  # === create ===

  test 'create accepts a known email, creates a token, enqueues the mailer' do
    assert_enqueued_emails 1 do
      assert_difference -> { @user.password_reset_tokens.count }, 1 do
        post api_v1_password_resets_path,
          params: { password_reset: { email: @user.email } },
          as: :json
      end
    end
    assert_response :accepted
  end

  test 'create with an unknown email returns the same response and sends no mail' do
    assert_no_enqueued_emails do
      assert_no_difference -> { PasswordResetToken.count } do
        post api_v1_password_resets_path,
          params: { password_reset: { email: 'nobody@example.com' } },
          as: :json
      end
    end
    assert_response :accepted
    json = response.parsed_body
    assert_match(/if an account exists/i, json['message'])
  end

  test 'create matches emails case-insensitively' do
    assert_enqueued_emails 1 do
      post api_v1_password_resets_path,
        params: { password_reset: { email: @user.email.upcase } },
        as: :json
    end
  end

  test 'create does not require authentication' do
    post api_v1_password_resets_path,
      params: { password_reset: { email: @user.email } },
      as: :json
    assert_response :accepted
  end

  # === update ===

  test 'update with a valid token resets the password and consumes the token' do
    raw, record = PasswordResetToken.generate(@user)

    patch api_v1_password_reset_path(raw),
      params: { password_reset: { password: 'fresh-pass-88', password_confirmation: 'fresh-pass-88' } },
      as: :json

    assert_response :ok
    assert @user.reload.authenticate('fresh-pass-88')
    assert_not_nil record.reload.used_at
  end

  test 'update is idempotent rejection — reusing a token returns 410' do
    raw, record = PasswordResetToken.generate(@user)
    record.consume!

    patch api_v1_password_reset_path(raw),
      params: { password_reset: { password: 'fresh-pass-88', password_confirmation: 'fresh-pass-88' } },
      as: :json

    assert_response :gone
  end

  test 'update with an expired token returns 410' do
    raw, _record = PasswordResetToken.generate(@user, expires_in: 1.second)

    travel 2.seconds do
      patch api_v1_password_reset_path(raw),
        params: { password_reset: { password: 'fresh-pass-88', password_confirmation: 'fresh-pass-88' } },
        as: :json
    end

    assert_response :gone
  end

  test 'update with an unknown token returns 410' do
    patch api_v1_password_reset_path('not-a-real-token'),
      params: { password_reset: { password: 'fresh-pass-88', password_confirmation: 'fresh-pass-88' } },
      as: :json

    assert_response :gone
  end

  test 'update with mismatched confirmation returns 422 and leaves the token unused' do
    raw, record = PasswordResetToken.generate(@user)

    patch api_v1_password_reset_path(raw),
      params: { password_reset: { password: 'fresh-pass-88', password_confirmation: 'typo-88' } },
      as: :json

    assert_response :unprocessable_entity
    assert_nil record.reload.used_at
  end

  test 'update with a too-short password returns 422 and leaves the token unused' do
    raw, record = PasswordResetToken.generate(@user)

    patch api_v1_password_reset_path(raw),
      params: { password_reset: { password: 'short1', password_confirmation: 'short1' } },
      as: :json

    assert_response :unprocessable_entity
    assert_nil record.reload.used_at
  end

  # === throttling (Rack::Attack) ===

  test 'create throttles to 10 POSTs per hour per IP and responds 429 with a JSON body' do
    with_throttling do
      10.times do
        post api_v1_password_resets_path,
          params: { password_reset: { email: "nobody+#{SecureRandom.hex(4)}@example.com" } },
          as: :json
        assert_response :accepted
      end

      post api_v1_password_resets_path,
        params: { password_reset: { email: "nobody+#{SecureRandom.hex(4)}@example.com" } },
        as: :json

      assert_response :too_many_requests
      assert_equal 'Too many requests, please try again later.', response.parsed_body['error']
    end
  end

  test 'create throttles to 3 POSTs per hour per email regardless of source IP' do
    with_throttling do
      email = 'repeat@example.com'
      3.times do |i|
        post api_v1_password_resets_path,
          params: { password_reset: { email: email } },
          headers: { 'REMOTE_ADDR' => "10.0.0.#{i + 1}" },
          as: :json
        assert_response :accepted
      end

      post api_v1_password_resets_path,
        params: { password_reset: { email: email } },
        headers: { 'REMOTE_ADDR' => '10.0.0.99' },
        as: :json

      assert_response :too_many_requests
    end
  end
end
