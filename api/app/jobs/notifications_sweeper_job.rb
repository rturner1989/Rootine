# frozen_string_literal: true

# Drives the derived-event notifiers — CareDue::WaterNotifier and
# CareDue::FeedNotifier — plus the daily-sweep achievement triggers
# (plant anniversaries). Self-action notifiers (plant added, photo
# added) live in the Journal region, not the notifications inbox.
#
# Runs daily via sidekiq-cron. Idempotent — re-running within the dedup
# window produces no duplicate notifications.
class NotificationsSweeperJob < ApplicationJob
  queue_as :default

  CARE_DEDUP_WINDOW = 24.hours

  def perform
    User.joins(:plants).distinct.find_each do |user|
      user.plants.includes(:space, :species).find_each do |plant|
        sweep_care_due(user, plant) if user.notify_care_reminders?
        Achievement.check_triggers(event: :daily_sweep, user: user, source: plant)
      end
    end
  end

  private def sweep_care_due(user, plant)
    sweep_water_due(user, plant) if plant.water_status.in?([:overdue, :due_today])
    sweep_feed_due(user, plant) if plant.feed_status.in?([:overdue, :due_today])
  end

  private def sweep_water_due(user, plant)
    return if recent_event?(CareDue::WaterNotifier, plant, CARE_DEDUP_WINDOW)

    CareDue::WaterNotifier.with(
      record: plant,
      plant_id: plant.id,
      plant_nickname: plant.nickname,
      days_overdue: overdue_days(plant.days_until_water)
    ).deliver(user)
  end

  private def sweep_feed_due(user, plant)
    return if recent_event?(CareDue::FeedNotifier, plant, CARE_DEDUP_WINDOW)

    CareDue::FeedNotifier.with(
      record: plant,
      plant_id: plant.id,
      plant_nickname: plant.nickname,
      days_overdue: overdue_days(plant.days_until_feed)
    ).deliver(user)
  end

  private def overdue_days(days_until)
    days_until.negative? ? -days_until : 0
  end

  private def recent_event?(notifier_class, plant, window)
    Noticed::Event.where(type: notifier_class.name, record: plant).exists?(created_at: window.ago..)
  end
end
