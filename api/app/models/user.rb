# frozen_string_literal: true

# == Schema Information
#
# Table name: users
#
#  id                        :bigint           not null, primary key
#  care_logs_count           :integer          default(0), not null
#  current_care_streak_days  :integer          default(0), not null
#  current_login_streak_days :integer          default(0), not null
#  email                     :string           not null
#  last_care_logged_on       :date
#  last_login_on             :date
#  latitude                  :decimal(9, 6)
#  location_label            :string
#  longest_care_streak_days  :integer          default(0), not null
#  longest_login_streak_days :integer          default(0), not null
#  longitude                 :decimal(9, 6)
#  name                      :string           not null
#  notify_achievements       :boolean          default(TRUE), not null
#  notify_care_reminders     :boolean          default(TRUE), not null
#  onboarding_completed_at   :datetime
#  onboarding_intent         :string
#  onboarding_step_reached   :integer          default(0), not null
#  password_digest           :string           not null
#  plants_count              :integer          default(0), not null
#  timezone                  :string           default("UTC")
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#
# Indexes
#
#  index_users_on_email  (email) UNIQUE
#
class User < ApplicationRecord
  has_secure_password

  # Onboarding intent — drives the R9 wizard branch (mockup 19) and downstream
  # behaviour (Today landing variant, notifications defaults, species filter,
  # streak prominence). Symbol keys are the canonical DB values; the strings
  # are user-facing labels rendered by the wizard's intent picker.
  USER_INTENT_LABELS = {
    forgetful: 'I keep forgetting',
    just_starting: "I'm just starting",
    sick_plant: 'My plant is sick',
    browsing: 'Just browsing'
  }.freeze

  # Common passwords that satisfy the length + letter + digit rules but are
  # still trivially guessable. Stored in a Set for O(1) lookup and compared
  # case-insensitively (downcased input against downcased entries). Not
  # exhaustive — just the handful that would otherwise slip past our other
  # rules. Extend as we see abuse.
  COMMON_PASSWORDS = Set[
    'password1', 'password12', 'password123', 'password1234',
    'qwerty123', 'qwerty1234', 'qwertyuiop',
    'welcome1', 'welcome123', 'letmein1', 'letmein123',
    'admin123', 'administrator1',
    'iloveyou1', 'iloveyou123',
    'monkey123', 'dragon123', 'master123', 'shadow123',
    'superman1', 'batman123', 'football1', 'baseball1',
    'princess1', 'sunshine1', 'trustno1',
    'zaq12wsx', '1qaz2wsx', 'qazwsx123', 'asdf1234',
    'p@ssword1', 'passw0rd1', 'passw0rd123',
    'changeme1'
  ].freeze
  private_constant :COMMON_PASSWORDS

  has_many :spaces, dependent: :destroy
  has_many :plants, through: :spaces
  has_many :care_logs, through: :plants
  has_many :plant_photos, through: :plants
  has_many :refresh_tokens, dependent: :destroy
  has_many :password_reset_tokens, dependent: :destroy
  has_many :notifications, as: :recipient, class_name: 'Noticed::Notification', dependent: :destroy
  has_many :achievements, dependent: :destroy

  has_one_attached :avatar

  # An avatar is served back to every viewer of the account, so the
  # allow-list is types a browser will render as an image — an SVG could
  # carry script, so it stays out.
  AVATAR_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].freeze
  AVATAR_MAX_BYTES = 5.megabytes

  # validate: { allow_nil: true } turns an invalid assignment into a 422 validation
  # error instead of the default ArgumentError that would surface as a 500. allow_nil
  # because nil is the meaningful "user hasn't picked yet" state — only out-of-list
  # strings (e.g. "garbage") should fail validation.
  enum :onboarding_intent, USER_INTENT_LABELS.keys.index_with(&:to_s), validate: { allow_nil: true }

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true
  validates :onboarding_step_reached, numericality: { greater_than_or_equal_to: 0, only_integer: true }
  validates :password, length: { minimum: 8 }, if: -> { new_record? || !password.nil? }
  validate :password_composition, if: -> { password.present? }
  validate :password_not_common, if: -> { password.present? }
  # Only when an avatar is actually being attached — keyed on
  # attachment_changes rather than attached?, so saving a name doesn't
  # drag the existing blob in to re-check bytes that haven't moved.
  validate :avatar_is_a_reasonable_image, if: -> { attachment_changes['avatar'].present? }

  before_save :downcase_email

  # Mirror of the downcase_email callback's normalization so lookups hit
  # rows that were saved through the normal path. Callers pass whatever
  # the user typed; we handle the stripping/case-folding.
  def self.find_by_normalized_email(email)
    find_by(email: email.to_s.downcase.strip)
  end

  def onboarded?
    onboarding_completed_at.present?
  end

  def complete_onboarding!
    return if onboarded?

    update!(onboarding_completed_at: Time.current)
  end

  # `unknown` is omitted — skipping it from the average lets a freshly-
  # added plant (no feed signal yet) not drag the score to half-dead.
  VITALITY_STATUS_SCORE = {
    healthy: 100,
    due_soon: 75,
    due_today: 50,
    overdue: 25
  }.freeze

  # Cached aggregate columns maintained by callbacks (Plant + CareLog +
  # auth touch). Reads are O(1). If the cache ever drifts (manual SQL
  # inserts, fixture loads, etc.), call recompute_aggregates! to rebuild
  # from raw data. Login streak has no raw source — it's tracked solely
  # through the touch path, so recompute leaves it alone.
  def recompute_aggregates!
    # rubocop:disable Rails/SkipsModelValidations -- cached aggregate columns
    update_columns(
      plants_count: plants.count,
      care_logs_count: care_logs.count,
      current_care_streak_days: recompute_current_care_streak,
      longest_care_streak_days: recompute_longest_care_streak,
      last_care_logged_on: distinct_care_log_dates.last
    )
    # rubocop:enable Rails/SkipsModelValidations
  end

  # Bumps care streak based on `last_care_logged_on` vs today.
  # Called from CareLog#after_create_commit. O(1) — never scans care_logs.
  def bump_care_streak_for_today!
    new_streak = compute_bumped_streak(current_care_streak_days, last_care_logged_on)
    # rubocop:disable Rails/SkipsModelValidations -- cached aggregate columns
    update_columns(
      current_care_streak_days: new_streak,
      longest_care_streak_days: [longest_care_streak_days, new_streak].max,
      last_care_logged_on: Date.current
    )
    # rubocop:enable Rails/SkipsModelValidations
  end

  # Bumps login streak based on `last_login_on` vs today. Called from
  # BaseController#touch_user_login on the first authenticated request
  # of each calendar day (refresh-token-driven sessions count too —
  # any user-driven authenticated request triggers it).
  def mark_logged_in_today!
    return if last_login_on == Date.current

    new_streak = compute_bumped_streak(current_login_streak_days, last_login_on)
    # rubocop:disable Rails/SkipsModelValidations -- cached aggregate columns
    update_columns(
      current_login_streak_days: new_streak,
      longest_login_streak_days: [longest_login_streak_days, new_streak].max,
      last_login_on: Date.current
    )
    # rubocop:enable Rails/SkipsModelValidations
  end

  # Lazy-decay accessor: returns 0 if the cached streak has staled past
  # the gap threshold (last activity was older than yesterday). Use this
  # for display + dashboard payloads. Achievement conditions can read
  # the raw column since they're checked at bump time when cache is
  # fresh.
  def effective_current_care_streak_days
    return 0 unless last_care_logged_on
    return 0 if last_care_logged_on < Date.current - 1

    current_care_streak_days
  end

  def effective_current_login_streak_days
    return 0 unless last_login_on
    return 0 if last_login_on < Date.current - 1

    current_login_streak_days
  end

  # Coordinates the weather backend should query for this user. Falls
  # back to Greenwich (51.4779, -0.0015) when the user hasn't set a
  # location — gives weather widgets something to render rather than a
  # null state. Onboarding can collect a real location later.
  GREENWICH_FALLBACK = { latitude: 51.4779, longitude: -0.0015, label: 'Greenwich (default)' }.freeze

  def weather_location
    if latitude.present? && longitude.present?
      { latitude: latitude.to_f, longitude: longitude.to_f, label: location_label.presence || 'Your location' }
    else
      GREENWICH_FALLBACK
    end
  end

  # Notification types each preference silences. Keyed by the column so
  # adding a preference is one entry, not a new branch.
  MUTED_NOTIFICATION_TYPES = {
    notify_care_reminders: ['CareDue::WaterNotifier::Notification', 'CareDue::FeedNotifier::Notification'],
    notify_achievements: ['AchievementNotifier::Notification']
  }.freeze

  # Muting hides a family's existing notifications as well as stopping new
  # ones — a switch that leaves the drawer unchanged reads as broken. It
  # filters rather than deletes, so switching back restores them.
  #
  # Every notification read path goes through here: the drawer, the bell
  # count and the seen-sweep must agree, or the badge counts rows the
  # drawer won't show.
  def visible_notifications
    muted_types = MUTED_NOTIFICATION_TYPES.flat_map { |preference, types| public_send(preference) ? [] : types }
    return notifications if muted_types.empty?

    notifications.where.not(type: muted_types)
  end

  def unread_notifications_count
    visible_notifications.unread.count
  end

  def vitality_percent
    return 0 if plants.none?

    scored = plants.includes(:species).flat_map do |plant|
      [VITALITY_STATUS_SCORE[plant.water_status], VITALITY_STATUS_SCORE[plant.feed_status]]
    end.compact
    return 0 if scored.empty?

    (scored.sum.to_f / scored.size).round
  end

  # Care tasks (water + feed) due on or before the given date across
  # every plant the user owns. Drives the Today rituals card; pass
  # Date.current for "today's rituals" or any date the calendar
  # selects.
  def tasks_on(date)
    plants.includes(:space, :species).flat_map { |plant| plant.tasks_on(date) }
  end

  # Proxy rather than redirect, same as PlantPhoto#image_url — the
  # redirect controller's 302 points at a host-dependent disk URL the
  # browser can't reach from behind the dev/prod reverse proxy.
  def avatar_url
    return nil unless avatar.attached?

    Rails.application.routes.url_helpers.rails_storage_proxy_url(avatar, only_path: true)
  end

  # `stats:` is opt-in because #stats walks the user's plants. Callers
  # that only need the record (onboarding completion, auth payloads)
  # shouldn't pay for a scan they never read.
  def as_json(options = {})
    payload = {
      id: id,
      email: email,
      name: name,
      timezone: timezone,
      onboarded: onboarded?,
      onboarding_intent: onboarding_intent,
      onboarding_step_reached: onboarding_step_reached,
      avatar_url: avatar_url,
      latitude: latitude&.to_f,
      longitude: longitude&.to_f,
      location_label: location_label,
      notify_care_reminders: notify_care_reminders,
      notify_achievements: notify_achievements,
      joined_on: created_at.to_date
    }
    payload[:stats] = stats if options[:stats]
    payload
  end

  def stats
    {
      care_streak_days: effective_current_care_streak_days,
      login_streak_days: effective_current_login_streak_days,
      plants_count: plants_count,
      care_logs_count: care_logs_count,
      vitality_percent: vitality_percent
    }
  end

  private def downcase_email
    self.email = email.downcase.strip
  end

  # Password must contain at least one letter and at least one digit.
  # Two separate errors so the user sees which piece is missing, not a
  # vague "too weak". Symbols route to the locale file for wording.
  private def password_composition
    errors.add(:password, :missing_letter) unless password.match?(/[A-Za-z]/)
    errors.add(:password, :missing_digit) unless password.match?(/\d/)
  end

  private def password_not_common
    errors.add(:password, :too_common) if COMMON_PASSWORDS.include?(password.downcase)
  end

  # Active Storage takes content_type from whatever the upload declares
  # and only sniffs the bytes later, on analyze — so identify up front
  # rather than validate the client's word.
  #
  # Defence in depth, not a guarantee: Marcel falls back to the declared
  # type for bytes it can't fingerprint (plain text has no magic number),
  # so this catches a wrong file far more reliably than a hostile one.
  # What actually stops a disguised upload executing is Active Storage
  # serving blobs with nosniff.
  private def avatar_is_a_reasonable_image
    avatar.blob.identify unless avatar.blob.identified?

    errors.add(:avatar, 'must be a JPEG, PNG, WebP or HEIC image') unless avatar.blob.content_type.in?(AVATAR_CONTENT_TYPES)

    return unless avatar.blob.byte_size > AVATAR_MAX_BYTES

    errors.add(:avatar, "must be smaller than #{AVATAR_MAX_BYTES / 1.megabyte}MB")
  end

  # Sorted (asc) array of distinct dates this user has care-logged on.
  # Used by recompute_aggregates! to rebuild cached columns from raw data.
  private def distinct_care_log_dates
    care_logs
      .where.not(performed_at: nil)
      .pluck(Arel.sql('DISTINCT DATE(performed_at)'))
      .sort
  end

  # Shared bump logic for any streak (care or login). Returns the new
  # streak value based on the last-activity date relative to today.
  private def compute_bumped_streak(current, last_date)
    today = Date.current
    return current if last_date == today # same-day, no change
    return current + 1 if last_date == today - 1 # consecutive day, +1

    1 # gap → reset
  end

  private def recompute_current_care_streak
    dates = distinct_care_log_dates
    return 0 if dates.empty?

    today = Date.current
    expected = if dates.last == today
      today
    elsif dates.last == today - 1
      today - 1
    end
    return 0 unless expected

    streak = 0
    dates.reverse_each do |date|
      break unless date == expected

      streak += 1
      expected -= 1
    end
    streak
  end

  private def recompute_longest_care_streak
    dates = distinct_care_log_dates
    return 0 if dates.empty?

    longest = 1
    current = 1
    dates.each_cons(2) do |earlier, later|
      if later == earlier + 1
        current += 1
        longest = current if current > longest
      else
        current = 1
      end
    end
    longest
  end
end
