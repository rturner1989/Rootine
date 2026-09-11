# frozen_string_literal: true

require 'test_helper'

# rubocop:disable Rails/SkipsModelValidations -- update_columns seeds cached aggregate counters under test
class CareLogTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @plant = plants(:sir_plantalot)
  end

  test 'valid care log' do
    log = @plant.care_logs.new(care_type: 'watering', performed_at: Time.current)
    assert log.valid?
  end

  test 'requires care_type' do
    log = @plant.care_logs.new(performed_at: Time.current)
    assert_not log.valid?
    assert_includes log.errors[:care_type], "can't be blank"
  end

  test 'care_type must be watering or feeding' do
    log = @plant.care_logs.new(care_type: 'singing', performed_at: Time.current)
    assert_not log.valid?
    assert_includes log.errors[:care_type], 'is not included in the list'
  end

  test 'defaults performed_at to now when not specified' do
    log = @plant.care_logs.create!(care_type: 'watering')

    assert_in_delta Time.current, log.performed_at, 2.seconds
  end

  test 'watering log updates plant last_watered_at' do
    time = Time.current
    @plant.care_logs.create!(care_type: 'watering', performed_at: time)

    assert_in_delta time, @plant.reload.last_watered_at, 2.seconds
  end

  test 'feeding log updates plant last_fed_at' do
    time = Time.current
    @plant.care_logs.create!(care_type: 'feeding', performed_at: time)

    assert_in_delta time, @plant.reload.last_fed_at, 2.seconds
  end

  test 'chronological scope orders by performed_at descending' do
    logs = @plant.care_logs.chronological
    assert logs.first.performed_at > logs.last.performed_at
  end

  test 'create unlocks streak_7 achievement when streak hits 7 days' do
    user = @plant.space.user
    Achievement.where(user: user).destroy_all
    CareLog.where(plant: user.plants).destroy_all
    user.update_columns(current_care_streak_days: 0, longest_care_streak_days: 0, last_care_logged_on: nil)

    perform_enqueued_jobs do
      (1..6).each do |offset|
        @plant.care_logs.create!(care_type: 'watering', performed_at: (Date.current - offset).to_time + 9.hours)
      end
    end
    # Streak update logic from CareLog uses Date.current, not performed_at,
    # so the dated rows above don't actually grow the cached streak counter.
    # Drive it directly to the threshold-1 state for the assertion.
    user.update_columns(current_care_streak_days: 6, last_care_logged_on: Date.current - 1)
    assert_equal 0, user.achievements.where(kind: 'care_streak_7').count

    perform_enqueued_jobs do
      @plant.care_logs.create!(care_type: 'watering', performed_at: Time.current)
    end
    assert_equal 1, user.achievements.where(kind: 'care_streak_7').count
  end

  test 'create does not duplicate streak_7 on subsequent same-day logs' do
    user = @plant.space.user
    Achievement.where(user: user).destroy_all
    CareLog.where(plant: user.plants).destroy_all
    user.update_columns(current_care_streak_days: 6, longest_care_streak_days: 6, last_care_logged_on: Date.current - 1)

    perform_enqueued_jobs do
      @plant.care_logs.create!(care_type: 'watering', performed_at: Time.current)
      @plant.care_logs.create!(care_type: 'feeding', performed_at: Time.current)
    end

    assert_equal 1, user.achievements.where(kind: 'care_streak_7').count
  end

  test 'watering clears the plant\'s water-due notification' do
    user = @plant.space.user
    @plant.update!(last_watered_at: 60.days.ago, calculated_watering_days: 7)
    NotificationsSweeperJob.perform_now
    water_due = user.notifications.find_by!(type: 'CareDue::WaterNotifier::Notification')

    @plant.care_logs.create!(care_type: CareLog::WATERING)

    assert_not Noticed::Notification.exists?(water_due.id)
  end

  test 'watering leaves the feed-due notification alone' do
    user = @plant.space.user
    @plant.update!(last_fed_at: 200.days.ago, calculated_feeding_days: 30)
    NotificationsSweeperJob.perform_now
    feed_due = user.notifications.find_by!(type: 'CareDue::FeedNotifier::Notification')

    @plant.care_logs.create!(care_type: CareLog::WATERING)

    assert Noticed::Notification.exists?(feed_due.id)
  end

  test 'backdated watering that leaves the plant overdue keeps the notification' do
    user = @plant.space.user
    @plant.update!(last_watered_at: 60.days.ago, calculated_watering_days: 7)
    NotificationsSweeperJob.perform_now
    water_due = user.notifications.find_by!(type: 'CareDue::WaterNotifier::Notification')

    @plant.care_logs.create!(care_type: CareLog::WATERING, performed_at: 30.days.ago)

    assert Noticed::Notification.exists?(water_due.id)
  end

  test 'watering one plant leaves another plant\'s water-due notification alone' do
    user = @plant.space.user
    other = plants(:wilty)
    other.update!(last_watered_at: 60.days.ago, calculated_watering_days: 7)
    NotificationsSweeperJob.perform_now
    other_due = user.notifications.joins(:event)
                    .find_by!(noticed_events: { type: 'CareDue::WaterNotifier', record_id: other.id })

    @plant.care_logs.create!(care_type: CareLog::WATERING)

    assert Noticed::Notification.exists?(other_due.id)
  end
end
# rubocop:enable Rails/SkipsModelValidations
