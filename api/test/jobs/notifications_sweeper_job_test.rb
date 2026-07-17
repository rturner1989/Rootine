# frozen_string_literal: true

require 'test_helper'

class NotificationsSweeperJobTest < ActiveJob::TestCase
  test 'fires CareDue::WaterNotifier for plants with water overdue' do
    plant = plants(:wilty)
    plant.update!(last_watered_at: 60.days.ago, calculated_watering_days: 7)
    user = plant.space.user

    NotificationsSweeperJob.perform_now

    water_due = user.notifications.find_by(type: 'CareDue::WaterNotifier::Notification')
    assert_not_nil water_due
    assert_equal 'care_due_water', water_due.kind
  end

  test 'fires CareDue::FeedNotifier separately when feeding is overdue' do
    plant = plants(:wilty)
    plant.update!(last_fed_at: 200.days.ago, calculated_feeding_days: 30)
    user = plant.space.user

    NotificationsSweeperJob.perform_now

    feed_due = user.notifications.find_by(type: 'CareDue::FeedNotifier::Notification')
    assert_not_nil feed_due
    assert_equal 'care_due_feed', feed_due.kind
  end

  test 'does not refire CareDue::Water within the 24h dedup window' do
    plant = plants(:wilty)
    plant.update!(last_watered_at: 60.days.ago, calculated_watering_days: 7)
    user = plant.space.user

    NotificationsSweeperJob.perform_now
    initial = user.notifications.count

    NotificationsSweeperJob.perform_now
    assert_equal initial, user.notifications.count
  end

  test 'fires no care-due notification when the user has opted out of care reminders' do
    plant = plants(:wilty)
    plant.update!(last_watered_at: 60.days.ago, calculated_watering_days: 7,
                  last_fed_at: 200.days.ago, calculated_feeding_days: 30)
    user = plant.space.user
    user.update!(notify_care_reminders: false)

    NotificationsSweeperJob.perform_now

    assert_nil user.notifications.find_by(type: 'CareDue::WaterNotifier::Notification')
    assert_nil user.notifications.find_by(type: 'CareDue::FeedNotifier::Notification')
  end

  test 'opting out of care reminders still lets achievements through' do
    plant = plants(:wilty)
    user = plant.space.user
    user.update!(notify_care_reminders: false)

    travel_to plant.created_at + 30.days do
      assert_difference -> { milestones_for(user, plant).count }, 1 do
        NotificationsSweeperJob.perform_now
      end
    end
  end

  test 'skips dormant users with no plants' do
    dormant_users = User.where.missing(:plants)
    assert dormant_users.exists?, 'expected at least one user with no plants in fixtures'
    initial = Noticed::Notification.where(recipient: dormant_users).count

    NotificationsSweeperJob.perform_now

    assert_equal initial, Noticed::Notification.where(recipient: dormant_users).count
  end

  test 'fires AchievementNotifier when a plant hits a 30-day anniversary today' do
    plant = plants(:wilty)
    user = plant.space.user

    travel_to plant.created_at + 30.days do
      assert_difference -> { milestones_for(user, plant).count }, 1 do
        NotificationsSweeperJob.perform_now
      end
    end
  end

  test 'milestone is idempotent — re-running the same day does not duplicate' do
    plant = plants(:wilty)
    user = plant.space.user

    travel_to plant.created_at + 30.days do
      NotificationsSweeperJob.perform_now
      initial = milestones_for(user, plant).count

      NotificationsSweeperJob.perform_now
      assert_equal initial, milestones_for(user, plant).count
    end
  end

  test 'does not fire any milestone for a plant whose age does not match a milestone day' do
    plant = plants(:wilty)
    user = plant.space.user

    travel_to plant.created_at + 17.days do
      NotificationsSweeperJob.perform_now
    end

    assert_equal 0, milestones_for(user, plant).count
  end

  private def milestones_for(user, plant)
    user.notifications
        .where(type: 'AchievementNotifier::Notification')
        .joins(:event)
        .where(noticed_events: { record_type: 'Plant', record_id: plant.id })
  end
end
