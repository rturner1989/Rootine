# frozen_string_literal: true

require 'test_helper'

class Api::V1::NotificationsSeenControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:john)
    @other_user = users(:jane)
    @plant = plants(:wilty)
  end

  test 'requires authentication' do
    post api_v1_notifications_seen_path, as: :json

    assert_response :unauthorized
  end

  test 'marks every unseen notification as seen without marking them read' do
    deliver_achievement(@user)
    deliver_achievement(@user)

    post api_v1_notifications_seen_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    assert_equal 2, response.parsed_body['unread_count']
    @user.notifications.each do |notification|
      assert_not_nil notification.seen_at
      assert_nil notification.read_at
    end
  end

  test 'does not touch other users notifications' do
    deliver_achievement(@other_user)

    post api_v1_notifications_seen_path, headers: auth_headers(@user), as: :json

    assert_nil @other_user.notifications.first.seen_at
  end

  private def deliver_achievement(user)
    AchievementNotifier.with(record: @plant, achievement_id: 1, title: 'Achievement unlocked', label: 'First plant',
                             emoji: '🏆').deliver(user)
    user.notifications.last
  end
end
