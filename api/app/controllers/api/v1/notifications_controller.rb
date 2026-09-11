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

      # Dismissing destroys the delivery, not the history — the Journal is the
      # permanent archive, the drawer only ever a projection of it.
      def destroy
        current_user.notifications.find(params[:id]).destroy!

        render json: { unread_count: current_user.unread_notifications_count }
      end
    end
  end
end
