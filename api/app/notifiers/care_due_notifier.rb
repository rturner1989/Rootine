# frozen_string_literal: true

# Shared base for water + feed care-due notifiers. Subclasses define
# `title` only — meta, url, delivery, and required params are common.
#
# Two subclasses (CareDue::WaterNotifier + CareDue::FeedNotifier) instead
# of one notifier with a `care_kind` discriminator: cleaner dedup queries
# (where type = 'CareDue::WaterNotifier' instead of loading rows +
# filtering in Ruby) and clearer semantics (water and feed are different
# events).
class CareDueNotifier < ApplicationNotifier
  deliver_by :action_cable do |config|
    config.channel = 'NotificationsChannel'
    config.stream = -> { recipient }
    config.message = -> { as_json }
  end

  required_param :plant_id
  required_param :days_overdue

  # One row per plant. While a plant stays overdue the daily sweep refreshes
  # the notification it already sent instead of stacking another beside it —
  # ignore a plant for a fortnight and the drawer would otherwise hold
  # fourteen rows for it, each frozen at a different day count.
  #
  # Back to unread and re-dated, because it is a live task again today, not
  # a week-old one the user has already dealt with.
  def self.refresh(event, days_overdue:)
    event.update!(params: event.params.merge(days_overdue: days_overdue))
    # rubocop:disable Rails/SkipsModelValidations -- Noticed rows, no validations to run
    event.notifications.update_all(read_at: nil, created_at: Time.current, updated_at: Time.current)
    # rubocop:enable Rails/SkipsModelValidations
  end

  notification_methods do
    def meta
      overdue = params[:days_overdue].to_i
      return 'due today' if overdue.zero?

      "#{overdue} #{'day'.pluralize(overdue)} overdue"
    end

    def url
      "/plants/#{params[:plant_id]}"
    end
  end
end
