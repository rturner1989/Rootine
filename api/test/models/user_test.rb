# frozen_string_literal: true

require 'test_helper'

# rubocop:disable Rails/SkipsModelValidations -- update_columns seeds cached streak counters under test
class UserTest < ActiveSupport::TestCase
  include ActionDispatch::TestProcess::FixtureFile

  test 'valid user' do
    user = User.new(email: 'test@example.com', name: 'Test', password: 'greenthumb99',
                    password_confirmation: 'greenthumb99')
    assert user.valid?
  end

  test 'requires email' do
    user = User.new(name: 'Test', password: 'greenthumb99', password_confirmation: 'greenthumb99')
    assert_not user.valid?
    assert_includes user.errors[:email], "can't be blank"
  end

  test 'requires unique email' do
    User.create!(email: 'test@example.com', name: 'Test', password: 'greenthumb99', password_confirmation: 'greenthumb99')
    user = User.new(email: 'test@example.com', name: 'Test2', password: 'greenthumb99',
                    password_confirmation: 'greenthumb99')
    assert_not user.valid?
    assert_includes user.errors[:email], 'has already been taken'
  end

  test 'requires name' do
    user = User.new(email: 'test@example.com', password: 'greenthumb99', password_confirmation: 'greenthumb99')
    assert_not user.valid?
    assert_includes user.errors[:name], "can't be blank"
  end

  test 'requires password with minimum length' do
    user = User.new(email: 'test@example.com', name: 'Test', password: 'short', password_confirmation: 'short')
    assert_not user.valid?
    assert_includes user.errors[:password], 'is too short (minimum is 8 characters)'
  end

  test 'requires password to contain at least one letter' do
    user = User.new(email: 'test@example.com', name: 'Test', password: '12345678',
                    password_confirmation: '12345678')
    assert_not user.valid?
    assert_includes user.errors[:password], 'must contain at least one letter'
  end

  test 'requires password to contain at least one number' do
    user = User.new(email: 'test@example.com', name: 'Test', password: 'abcdefgh',
                    password_confirmation: 'abcdefgh')
    assert_not user.valid?
    assert_includes user.errors[:password], 'must contain at least one number'
  end

  test 'rejects passwords on the common-passwords blocklist' do
    user = User.new(email: 'test@example.com', name: 'Test', password: 'password123',
                    password_confirmation: 'password123')
    assert_not user.valid?
    assert_includes user.errors[:password], 'is too common — pick something less guessable'
  end

  test 'common-password check is case-insensitive' do
    user = User.new(email: 'test@example.com', name: 'Test', password: 'Password123',
                    password_confirmation: 'Password123')
    assert_not user.valid?
    assert_includes user.errors[:password], 'is too common — pick something less guessable'
  end

  test 'accepts a password that meets all rules' do
    user = User.new(email: 'test@example.com', name: 'Test', password: 'greenthumb99',
                    password_confirmation: 'greenthumb99')
    assert user.valid?
  end

  test 'downcases email before save' do
    user = User.create!(email: 'Test@Example.COM', name: 'Test', password: 'greenthumb99',
                        password_confirmation: 'greenthumb99')
    assert_equal 'test@example.com', user.email
  end

  test 'find_by_normalized_email matches through case and whitespace differences' do
    user = users(:john)
    assert_equal user, User.find_by_normalized_email(user.email.upcase)
    assert_equal user, User.find_by_normalized_email("  #{user.email}  ")
    assert_nil User.find_by_normalized_email('')
    assert_nil User.find_by_normalized_email(nil)
  end

  test 'onboarded? is false for new users' do
    user = users(:john)
    assert_nil user.onboarding_completed_at
    assert_not user.onboarded?
  end

  test 'onboarded? becomes true once onboarding_completed_at is set' do
    user = users(:john)
    user.update!(onboarding_completed_at: Time.current)
    assert user.onboarded?
  end

  test 'complete_onboarding! sets the timestamp and flips onboarded?' do
    user = users(:john)
    assert_not user.onboarded?

    freeze_time do
      user.complete_onboarding!
      assert user.onboarded?
      assert_equal Time.current, user.onboarding_completed_at
    end
  end

  test 'complete_onboarding! is idempotent — does not bump the timestamp' do
    user = users(:john)
    user.complete_onboarding!
    original = user.onboarding_completed_at

    travel 1.day do
      user.complete_onboarding!
      assert_in_delta original.to_f, user.reload.onboarding_completed_at.to_f, 0.001
    end
  end

  test 'as_json exposes onboarded boolean' do
    user = users(:john)
    assert_equal false, user.as_json[:onboarded]

    user.update!(onboarding_completed_at: Time.current)
    assert_equal true, user.as_json[:onboarded]
  end

  test 'onboarding_intent enum stores the symbol key as its string in the DB' do
    user = users(:john)
    User::USER_INTENT_LABELS.each_key do |key|
      user.update!(onboarding_intent: key.to_s)
      assert_equal key.to_s, user.reload.onboarding_intent
    end
  end

  test 'onboarding_intent allows nil (the "hasn\'t picked yet" state)' do
    user = users(:john)
    user.onboarding_intent = nil
    assert user.valid?
  end

  test 'onboarding_intent rejects values outside the enum list' do
    user = users(:john)
    user.onboarding_intent = 'garbage'
    assert_not user.valid?
    assert_includes user.errors[:onboarding_intent], 'is not included in the list'
  end

  test 'onboarding_step_reached defaults to 0' do
    assert_equal 0, User.new.onboarding_step_reached
  end

  test 'onboarding_step_reached rejects negative values' do
    user = users(:john)
    user.onboarding_step_reached = -1
    assert_not user.valid?
    assert_includes user.errors[:onboarding_step_reached], 'must be greater than or equal to 0'
  end

  test 'as_json exposes onboarding_intent and onboarding_step_reached' do
    user = users(:john)
    user.update!(onboarding_intent: 'forgetful', onboarding_step_reached: 3)
    json = user.as_json
    assert_equal 'forgetful', json[:onboarding_intent]
    assert_equal 3, json[:onboarding_step_reached]
  end

  test 'USER_INTENT_LABELS exposes the four canonical options' do
    assert_equal [:forgetful, :just_starting, :sick_plant, :browsing], User::USER_INTENT_LABELS.keys
  end

  test 'current_care_streak_days returns 0 when user has no plants' do
    user = User.create!(email: 'streaker@test.com', name: 'Streaker', password: 'greenthumb99')
    assert_equal 0, user.current_care_streak_days
    assert_equal 0, user.longest_care_streak_days
  end

  # Streak counters are cached columns now (maintained by callbacks).
  # Tests that seed historical care_logs with backdated performed_at
  # values call recompute_aggregates! to walk the raw data and populate
  # the cache. Live writes (a fresh CareLog#create) update the cache
  # incrementally via User#bump_care_streak_for_today!.

  test 'recompute_aggregates! sets current_streak to the consecutive-days count ending today' do
    user = users(:john)
    plant = user.plants.first
    CareLog.where(plant: user.plants).destroy_all
    [Date.current, Date.current - 1, Date.current - 2].each do |date|
      plant.care_logs.create!(care_type: 'watering', performed_at: [date.to_time + 9.hours, 1.minute.ago].min)
    end
    user.recompute_aggregates!
    assert_equal 3, user.current_care_streak_days
  end

  test 'recompute_aggregates! allows yesterday as the most recent date' do
    user = users(:john)
    plant = user.plants.first
    CareLog.where(plant: user.plants).destroy_all
    [Date.current - 1, Date.current - 2].each do |date|
      plant.care_logs.create!(care_type: 'watering', performed_at: [date.to_time + 9.hours, 1.minute.ago].min)
    end
    user.recompute_aggregates!
    assert_equal 2, user.current_care_streak_days
  end

  test 'recompute_aggregates! returns 0 when most recent care log is older than yesterday' do
    user = users(:john)
    plant = user.plants.first
    CareLog.where(plant: user.plants).destroy_all
    plant.care_logs.create!(care_type: 'watering', performed_at: (Date.current - 5).to_time + 9.hours)
    user.recompute_aggregates!
    assert_equal 0, user.current_care_streak_days
  end

  test 'recompute_aggregates! finds the longest historical run' do
    user = users(:john)
    plant = user.plants.first
    CareLog.where(plant: user.plants).destroy_all
    five_day_run = (10..14).map { |offset| Date.current - offset }
    two_day_run = [Date.current - 1, Date.current]
    (five_day_run + two_day_run).each do |date|
      plant.care_logs.create!(care_type: 'watering', performed_at: [date.to_time + 9.hours, 1.minute.ago].min)
    end
    user.recompute_aggregates!
    assert_equal 5, user.longest_care_streak_days
    assert_equal 2, user.current_care_streak_days
  end

  test 'bump_care_streak_for_today! increments when last_care_logged_on was yesterday' do
    user = users(:john)
    user.update_columns(current_care_streak_days: 5, longest_care_streak_days: 5, last_care_logged_on: Date.current - 1)
    user.bump_care_streak_for_today!
    assert_equal 6, user.current_care_streak_days
    assert_equal 6, user.longest_care_streak_days
    assert_equal Date.current, user.last_care_logged_on
  end

  test 'bump_care_streak_for_today! is a no-op when last_care_logged_on is today' do
    user = users(:john)
    user.update_columns(current_care_streak_days: 5, longest_care_streak_days: 5, last_care_logged_on: Date.current)
    user.bump_care_streak_for_today!
    assert_equal 5, user.current_care_streak_days
  end

  test 'bump_care_streak_for_today! resets to 1 when there is a gap' do
    user = users(:john)
    user.update_columns(current_care_streak_days: 5, longest_care_streak_days: 5, last_care_logged_on: Date.current - 3)
    user.bump_care_streak_for_today!
    assert_equal 1, user.current_care_streak_days
    assert_equal 5, user.longest_care_streak_days
  end

  test 'mark_logged_in_today! increments when last_login_on was yesterday' do
    user = users(:john)
    user.update_columns(current_login_streak_days: 3, longest_login_streak_days: 3, last_login_on: Date.current - 1)
    user.mark_logged_in_today!
    assert_equal 4, user.current_login_streak_days
    assert_equal 4, user.longest_login_streak_days
    assert_equal Date.current, user.last_login_on
  end

  test 'mark_logged_in_today! is a no-op when last_login_on is today (multi-login same day)' do
    user = users(:john)
    user.update_columns(current_login_streak_days: 7, longest_login_streak_days: 7, last_login_on: Date.current)
    user.mark_logged_in_today!
    assert_equal 7, user.current_login_streak_days
  end

  test 'mark_logged_in_today! resets to 1 when there is a gap' do
    user = users(:john)
    user.update_columns(current_login_streak_days: 7, longest_login_streak_days: 7, last_login_on: Date.current - 5)
    user.mark_logged_in_today!
    assert_equal 1, user.current_login_streak_days
    assert_equal 7, user.longest_login_streak_days
  end

  test 'effective_current_login_streak_days returns 0 when last_login_on older than yesterday' do
    user = users(:john)
    user.update_columns(current_login_streak_days: 7, last_login_on: Date.current - 3)
    assert_equal 0, user.effective_current_login_streak_days
  end

  test 'effective_current_login_streak_days returns cached value when last_login_on is today or yesterday' do
    user = users(:john)
    user.update_columns(current_login_streak_days: 7, last_login_on: Date.current)
    assert_equal 7, user.effective_current_login_streak_days

    user.update_columns(current_login_streak_days: 7, last_login_on: Date.current - 1)
    assert_equal 7, user.effective_current_login_streak_days
  end

  test 'effective_current_care_streak_days returns 0 when last_care_logged_on older than yesterday' do
    user = users(:john)
    user.update_columns(current_care_streak_days: 5, last_care_logged_on: Date.current - 3)
    assert_equal 0, user.effective_current_care_streak_days
  end

  # The filter matches on the type column by string. A renamed or
  # mistyped notifier would not raise — it would quietly stop muting, and
  # every other test would still pass.
  test 'MUTED_NOTIFICATION_TYPES names classes that actually exist' do
    User::MUTED_NOTIFICATION_TYPES.values.flatten.each do |type|
      assert type.safe_constantize, "#{type} is not a real class — the mute filter would silently stop working"
    end
  end

  test 'every notification preference in MUTED_NOTIFICATION_TYPES is a real column' do
    User::MUTED_NOTIFICATION_TYPES.each_key do |preference|
      assert_includes User.column_names, preference.to_s
    end
  end

  test 'visible_notifications returns everything when nothing is muted' do
    user = users(:john)
    assert user.notify_care_reminders
    assert user.notify_achievements
    assert_equal user.notifications.count, user.visible_notifications.count
  end

  test 'visible_notifications filters rather than deletes, so unmuting restores' do
    user = users(:john)
    deliver_water_due(user)
    before = user.visible_notifications.count

    user.update!(notify_care_reminders: false)
    assert_equal before - 1, user.visible_notifications.count
    assert_equal before, user.notifications.count, 'muting must not destroy the row'

    user.update!(notify_care_reminders: true)
    assert_equal before, user.visible_notifications.count
  end

  test 'visible_notifications hides every family that is muted at once' do
    user = users(:john)
    user.update!(notify_care_reminders: false, notify_achievements: false)
    muted = User::MUTED_NOTIFICATION_TYPES.values.flatten

    assert_equal 0, user.visible_notifications.where(type: muted).count
  end

  private def deliver_water_due(user)
    plant = user.plants.first
    CareDue::WaterNotifier.with(
      record: plant,
      plant_id: plant.id,
      plant_nickname: plant.nickname,
      days_overdue: 3
    ).deliver(user)
  end

  test 'avatar_url is nil until an avatar is attached' do
    user = users(:john)
    assert_nil user.avatar_url

    user.avatar.attach(fixture_file_upload('test_plant.jpg', 'image/jpeg'))
    assert user.valid?
    assert_match %r{/rails/active_storage/}, user.avatar_url
  end

  test 'avatar accepts the image types a browser will render' do
    user = users(:john)
    user.avatar.attach(fixture_file_upload('test_plant.jpg', 'image/jpeg'))

    assert user.valid?, user.errors.full_messages.to_sentence
  end

  # The upload declares image/jpeg and is really a GIF. Active Storage
  # takes content_type from the declaration, so without an explicit
  # identify this passes on the client's word alone.
  test 'avatar is judged on its bytes, not the content type it claims' do
    user = users(:john)
    user.avatar.attach(fixture_file_upload('tiny.gif', 'image/jpeg'))

    assert_not user.valid?
    assert_includes user.errors[:avatar], 'must be a JPEG, PNG, WebP or HEIC image'
  end

  test 'avatar rejects an image over the size cap' do
    user = users(:john)
    oversized = StringIO.new(file_fixture('test_plant.jpg').binread + ('x' * User::AVATAR_MAX_BYTES))
    user.avatar.attach(io: oversized, filename: 'huge.jpg', content_type: 'image/jpeg')

    assert_not user.valid?
    assert_includes user.errors[:avatar], "must be smaller than #{User::AVATAR_MAX_BYTES / 1.megabyte}MB"
  end

  test 'as_json exposes avatar_url so the sidebar can render it' do
    user = users(:john)
    assert_includes user.as_json.keys, :avatar_url
  end

  test 'as_json omits stats by default so callers do not pay for a plants scan' do
    assert_not_includes users(:john).as_json.keys, :stats
  end

  test 'as_json includes stats when asked' do
    user = users(:john)
    assert_equal user.stats, user.as_json(stats: true)[:stats]
  end
end
# rubocop:enable Rails/SkipsModelValidations
