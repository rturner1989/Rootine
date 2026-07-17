# frozen_string_literal: true

require 'test_helper'

class AchievementTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper
  include ActionCable::TestHelper

  setup do
    @user = users(:john)
    @plant = @user.plants.first
  end

  test 'unlock! creates a new achievement' do
    Achievement.where(user: @user).destroy_all

    assert_difference -> { Achievement.count } do
      achievement = Achievement.unlock!(user: @user, kind: 'first_plant')
      assert achievement.persisted?
      assert_equal 'first_plant', achievement.kind
      assert_not_nil achievement.earned_at
    end
  end

  test 'unlock! is idempotent — second call returns the existing record without creating' do
    Achievement.where(user: @user).destroy_all

    first = Achievement.unlock!(user: @user, kind: 'first_plant')
    assert_no_difference -> { Achievement.count } do
      again = Achievement.unlock!(user: @user, kind: 'first_plant')
      assert_equal first.id, again.id
    end
  end

  test 'unlock! records source for per-source achievements' do
    Achievement.where(user: @user).destroy_all

    record = Achievement.unlock!(
      user: @user, kind: 'plant_anniversary', source: @plant,
      metadata: { day_count: 30, plant_nickname: @plant.nickname }
    )
    assert_equal 'Plant', record.source_type
    assert_equal @plant.id, record.source_id
    assert_equal 30, record.metadata['day_count']
  end

  test 'unlock! permits the same kind for different sources' do
    Achievement.where(user: @user).destroy_all
    other_plant = @user.plants.where.not(id: @plant.id).first

    Achievement.unlock!(user: @user, kind: 'plant_anniversary', source: @plant, metadata: { day_count: 30 })
    Achievement.unlock!(user: @user, kind: 'plant_anniversary', source: other_plant, metadata: { day_count: 30 })

    assert_equal 2, Achievement.where(user: @user, kind: 'plant_anniversary').count
  end

  test 'label is static for static-label kinds' do
    record = Achievement.new(kind: 'first_plant')
    assert_equal 'First plant added', record.label
  end

  test 'label is dynamic for kinds with lambda labels' do
    record = Achievement.new(kind: 'plant_anniversary', metadata: { 'day_count' => 100, 'plant_nickname' => 'Wilty' })
    assert_equal '100 days with Wilty', record.label
  end

  test 'emoji returns kind-specific glyph' do
    assert_equal '🌱', Achievement.new(kind: 'first_plant').emoji
    assert_equal '🏆', Achievement.new(kind: 'plant_anniversary').emoji
    assert_equal '🔥', Achievement.new(kind: 'care_streak_7').emoji
  end

  test 'as_json exposes id, kind, label, emoji, earned_at, metadata' do
    record = Achievement.unlock!(user: @user, kind: 'care_streak_7')
    json = record.as_json
    assert_equal record.id, json[:id]
    assert_equal 'care_streak_7', json[:kind]
    assert_equal '7-day care streak', json[:label]
    assert_equal '🔥', json[:emoji]
    assert json[:earned_at].present?
  end

  test 'fires AchievementNotifier when plant_anniversary unlocks' do
    Achievement.where(user: @user).destroy_all
    Noticed::Event.where(type: 'AchievementNotifier').destroy_all

    Achievement.unlock!(
      user: @user, kind: 'plant_anniversary', source: @plant,
      metadata: { day_count: 30, plant_nickname: @plant.nickname }
    )

    perform_enqueued_jobs
    assert Noticed::Event.exists?(type: 'AchievementNotifier', record: @plant)
  end

  test 'fires AchievementNotifier for streak achievements too (unified pipeline)' do
    Achievement.where(user: @user).destroy_all
    Noticed::Event.where(type: 'AchievementNotifier').destroy_all

    Achievement.unlock!(user: @user, kind: 'care_streak_7')
    perform_enqueued_jobs

    assert Noticed::Event.exists?(type: 'AchievementNotifier')
  end

  test 'fires no AchievementNotifier when the user has opted out of achievements' do
    Achievement.where(user: @user).destroy_all
    Noticed::Event.where(type: 'AchievementNotifier').destroy_all
    @user.update!(notify_achievements: false)

    Achievement.unlock!(
      user: @user, kind: 'plant_anniversary', source: @plant,
      metadata: { day_count: 30, plant_nickname: @plant.nickname }
    )

    perform_enqueued_jobs
    assert_not Noticed::Event.exists?(type: 'AchievementNotifier', record: @plant)
  end

  test 'opting out of achievements still earns the record and still toasts' do
    Achievement.where(user: @user).destroy_all
    @user.update!(notify_achievements: false)

    assert_difference -> { Achievement.count } do
      assert_broadcasts(AchievementsChannel.broadcasting_for(@user), 1) do
        Achievement.unlock!(user: @user, kind: 'first_plant')
      end
    end
  end

  test 'broadcasts via AchievementsChannel for toast-surface kinds' do
    Achievement.where(user: @user).destroy_all
    assert_broadcasts(AchievementsChannel.broadcasting_for(@user), 1) do
      Achievement.unlock!(user: @user, kind: 'first_plant')
    end
  end

  test 'skips AchievementsChannel broadcast for splash-surface kinds (login_streak)' do
    Achievement.where(user: @user).destroy_all
    assert_no_broadcasts(AchievementsChannel.broadcasting_for(@user)) do
      Achievement.unlock!(user: @user, kind: 'login_streak_7')
    end
  end

  test 'mark_seen! sets seen_at and is idempotent' do
    achievement = Achievement.create!(user: @user, kind: 'login_streak_7', earned_at: 1.minute.ago)
    achievement.mark_seen!
    first_seen_at = achievement.reload.seen_at
    assert_not_nil first_seen_at

    travel 1.day do
      achievement.mark_seen!
      assert_in_delta first_seen_at.to_f, achievement.reload.seen_at.to_f, 0.001
    end
  end

  test 'unseen_splash scope returns only unseen splash-surface achievements' do
    Achievement.where(user: @user).destroy_all
    splash = Achievement.create!(user: @user, kind: 'login_streak_7', earned_at: 1.minute.ago)
    Achievement.create!(user: @user, kind: 'login_streak_30', earned_at: 1.minute.ago, seen_at: Time.current)
    Achievement.create!(user: @user, kind: 'first_plant', earned_at: 1.minute.ago)

    ids = Achievement.unseen_splash.where(user: @user).pluck(:id)
    assert_equal [splash.id], ids
  end
end
