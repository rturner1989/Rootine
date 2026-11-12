# frozen_string_literal: true

# == Schema Information
#
# Table name: password_reset_tokens
#
#  id           :bigint           not null, primary key
#  expires_at   :datetime         not null
#  token_digest :string           not null
#  used_at      :datetime
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  user_id      :bigint           not null
#
# Indexes
#
#  index_password_reset_tokens_on_token_digest  (token_digest) UNIQUE
#  index_password_reset_tokens_on_user_id       (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
class PasswordResetToken < ApplicationRecord
  DEFAULT_EXPIRY = 24.hours

  belongs_to :user

  scope :active, -> { where(used_at: nil).where('expires_at > ?', Time.current) }

  def self.generate(user, expires_in: DEFAULT_EXPIRY)
    raw_token = SecureRandom.urlsafe_base64(32)
    record = user.password_reset_tokens.create!(
      token_digest: Digest::SHA256.hexdigest(raw_token),
      expires_at: expires_in.from_now
    )
    [raw_token, record]
  end

  def self.find_by_raw_token(raw_token)
    return nil if raw_token.blank?

    find_by(token_digest: Digest::SHA256.hexdigest(raw_token))
  end

  def usable?
    used_at.nil? && expires_at > Time.current
  end
end
