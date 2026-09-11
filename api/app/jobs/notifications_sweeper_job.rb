# frozen_string_literal: true

# Drives the derived-event notifiers — CareDue::WaterNotifier and
# CareDue::FeedNotifier — plus the daily-sweep achievement triggers
# (plant anniversaries). Self-action notifiers (plant added, photo
# added) live in the Journal region, not the notifications inbox.
#
# Runs daily via sidekiq-cron. Idempotent — a plant that is still due has
# its existing notification refreshed, never a second one added.
class NotificationsSweeperJob < ApplicationJob
  queue_as :default

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
    days_overdue = overdue_days(plant.days_until_water)
    existing = care_due_event(CareDue::WaterNotifier, plant)
    return CareDueNotifier.refresh(existing, days_overdue: days_overdue) if existing

    CareDue::WaterNotifier.with(
      record: plant,
      plant_id: plant.id,
      plant_nickname: plant.nickname,
      days_overdue: days_overdue
    ).deliver(user)
  end

  private def sweep_feed_due(user, plant)
    days_overdue = overdue_days(plant.days_until_feed)
    existing = care_due_event(CareDue::FeedNotifier, plant)
    return CareDueNotifier.refresh(existing, days_overdue: days_overdue) if existing

    CareDue::FeedNotifier.with(
      record: plant,
      plant_id: plant.id,
      plant_nickname: plant.nickname,
      days_overdue: days_overdue
    ).deliver(user)
  end

  private def overdue_days(days_until)
    days_until.negative? ? -days_until : 0
  end

  # Resolution destroys the event, so one surviving here means the plant has
  # been due since the last sweep and already has its row.
  private def care_due_event(notifier_class, plant)
    Noticed::Event.find_by(type: notifier_class.name, record: plant)
  end
end
