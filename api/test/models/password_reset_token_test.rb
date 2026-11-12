# frozen_string_literal: true

require 'test_helper'

class PasswordResetTokenTest < ActiveSupport::TestCase
  setup do
    @user = users(:john)
  end

  test 'generate returns a raw token and a persisted record' do
    raw, record = PasswordResetToken.generate(@user)
    assert_instance_of String, raw
    assert record.persisted?
    assert_equal @user, record.user
  end

  test 'raw token is not stored in the database — only its digest' do
    raw, record = PasswordResetToken.generate(@user)
    assert_not_equal raw, record.token_digest
    assert_equal Digest::SHA256.hexdigest(raw), record.token_digest
  end

  test 'generate stamps expires_at 24 hours out by default' do
    freeze_time do
      _raw, record = PasswordResetToken.generate(@user)
      assert_in_delta 24.hours.from_now, record.expires_at, 1.second
    end
  end

  test 'find_by_raw_token locates the record via digest' do
    raw, record = PasswordResetToken.generate(@user)
    found = PasswordResetToken.find_by_raw_token(raw)
    assert_equal record, found
  end

  test 'find_by_raw_token returns nil for a blank token' do
    assert_nil PasswordResetToken.find_by_raw_token(nil)
    assert_nil PasswordResetToken.find_by_raw_token('')
  end

  test 'find_by_raw_token returns nil for an unknown token' do
    assert_nil PasswordResetToken.find_by_raw_token('definitely-not-a-real-token')
  end

  test 'usable? is true for a fresh token' do
    _raw, record = PasswordResetToken.generate(@user)
    assert record.usable?
  end

  test 'usable? is false once used' do
    _raw, record = PasswordResetToken.generate(@user)
    record.update!(used_at: Time.current)
    assert_not record.usable?
  end

  test 'usable? is false once expired' do
    _raw, record = PasswordResetToken.generate(@user, expires_in: 1.second)
    travel 2.seconds do
      assert_not record.usable?
    end
  end
end
