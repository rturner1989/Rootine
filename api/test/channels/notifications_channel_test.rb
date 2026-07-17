# frozen_string_literal: true

require 'test_helper'

class NotificationsChannelTest < ActionCable::Channel::TestCase
  include ActiveJob::TestHelper

  test 'streams for the connected user only' do
    user = users(:john)
    stub_connection current_user: user

    subscribe
    assert subscription.confirmed?
    assert_has_stream_for user
  end

  test 'broadcasts from notifiers reach the recipient stream' do
    plant = plants(:wilty)
    user = plant.space.user
    other_user = users(:jane)

    stub_connection current_user: user
    subscribe

    user_stream = NotificationsChannel.broadcasting_for(user)
    other_stream = NotificationsChannel.broadcasting_for(other_user)

    assert_broadcasts(user_stream, 1) do
      perform_enqueued_jobs do
        AchievementNotifier.with(
          record: plant,
          achievement_id: 1,
          title: 'Achievement unlocked',
          label: 'First plant',
          emoji: '🏆'
        ).deliver(user)
      end
    end

    assert_no_broadcasts(other_stream)
  end
end
