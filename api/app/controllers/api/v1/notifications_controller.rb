# frozen_string_literal: true

module Api
  module V1
    class NotificationsController < BaseController
      PAGE_SIZE = 20

      def index
        notifications = current_user.visible_notifications.includes(:event).newest_first.limit(PAGE_SIZE)

        render json: {
          unread_count: current_user.unread_notifications_count,
          notifications: notifications.map(&:as_json)
        }
      end

      def update
        notification = current_user.notifications.find(params[:id])
        notification.mark_as_read!

        render json: {
          unread_count: current_user.unread_notifications_count,
          notification: notification.as_json
        }
      end
    end
  end
end
