# frozen_string_literal: true

module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate!
      before_action :touch_user_login

      # First authenticated request of the calendar day bumps the user's
      # login streak + checks the :user_logged_in achievement triggers
      # inline. Inline (not perform_later) so any splash-surface unlock
      # commits to the DB before the response returns — the client's
      # GET /achievements/unseen on AppLayout mount needs to see the
      # row immediately, not after a sidekiq round-trip.
      private def touch_user_login
        return unless current_user
        return if current_user.last_login_on == Date.current

        current_user.mark_logged_in_today!
        Achievement.check_triggers(event: :user_logged_in, user: current_user)
      end

      # ?key=a,b comes in as a CSV string; ?key[]=a&key[]=b arrives as an
      # Array. Handle both — split each entry on commas, strip, drop blanks.
      private def parse_csv_param(key)
        raw = params[key]
        return nil if raw.blank?

        Array(raw).flat_map { |entry| entry.to_s.split(',') }.map(&:strip).reject(&:empty?)
      end
    end
  end
end
