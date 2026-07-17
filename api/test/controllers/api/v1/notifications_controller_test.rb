# frozen_string_literal: true

require 'test_helper'

class Api::V1::NotificationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:john)
    @other_user = users(:jane)
    @plant = plants(:wilty)
  end

  test 'index requires authentication' do
    get api_v1_notifications_path, as: :json

    assert_response :unauthorized
  end

  test 'index returns the current users notifications + unread_count' do
    deliver_achievement(@user)
    deliver_achievement(@user)

    get api_v1_notifications_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    json = response.parsed_body
    assert_equal 2, json['unread_count']
    assert_equal 2, json['notifications'].size
    assert_equal %w[achievement achievement], json['notifications'].pluck('kind')
  end

  test 'index returns notifications newest first' do
    older = deliver_achievement(@user, title: 'Earned first')
    older.update!(created_at: 2.days.ago)
    deliver_achievement(@user, title: 'Earned second')

    get api_v1_notifications_path, headers: auth_headers(@user), as: :json

    titles = response.parsed_body['notifications'].pluck('title')
    assert_equal 'Earned second', titles.first
  end

  test 'index does not leak notifications to other users' do
    deliver_achievement(@user)

    get api_v1_notifications_path, headers: auth_headers(@other_user), as: :json

    json = response.parsed_body
    assert_equal 0, json['unread_count']
    assert_equal 0, json['notifications'].size
  end

  test 'update marks a single notification as read and decrements unread_count' do
    notification = deliver_achievement(@user)
    deliver_achievement(@user)

    patch api_v1_notification_path(notification), headers: auth_headers(@user), as: :json

    assert_response :ok
    json = response.parsed_body
    assert_equal 1, json['unread_count']
    assert_not_nil json['notification']['read_at']
    assert_not_nil notification.reload.read_at
  end

  test 'update returns 404 when the notification belongs to another user' do
    notification = deliver_achievement(@user)

    patch api_v1_notification_path(notification), headers: auth_headers(@other_user), as: :json

    assert_response :not_found
  end

  test 'index hides a family the user has muted, and restores it when unmuted' do
    deliver_water_due(@user)
    deliver_achievement(@user)

    @user.update!(notify_care_reminders: false)
    get api_v1_notifications_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    kinds = response.parsed_body['notifications'].pluck('kind')
    assert_equal ['achievement'], kinds, 'muted care notification should be filtered out'

    @user.update!(notify_care_reminders: true)
    get api_v1_notifications_path, headers: auth_headers(@user), as: :json

    kinds = response.parsed_body['notifications'].pluck('kind')
    assert_includes kinds, 'care_due_water', 'unmuting restores the notification rather than having deleted it'
  end

  test 'unread_count excludes muted families so the bell agrees with the drawer' do
    deliver_water_due(@user)
    deliver_achievement(@user)

    @user.update!(notify_care_reminders: false)
    get api_v1_notifications_path, headers: auth_headers(@user), as: :json

    json = response.parsed_body
    assert_equal 1, json['unread_count']
    assert_equal json['notifications'].size, json['unread_count']
  end

  private def deliver_water_due(user)
    CareDue::WaterNotifier.with(
      record: @plant,
      plant_id: @plant.id,
      plant_nickname: @plant.nickname,
      days_overdue: 3
    ).deliver(user)
    user.notifications.last
  end

  # An achievement is the second live family alongside care-due, so the
  # cases here that just need "some notification" use it rather than a
  # notifier kept alive only for tests.
  private def deliver_achievement(user, title: 'Achievement unlocked')
    AchievementNotifier.with(
      record: @plant,
      achievement_id: user.achievements.first&.id || 1,
      title: title,
      label: title,
      emoji: '🏆'
    ).deliver(user)
    user.notifications.last
  end
end
