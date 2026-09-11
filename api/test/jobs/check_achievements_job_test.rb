# frozen_string_literal: true

require 'test_helper'

# rubocop:disable-next Rails/SkipsModelValidations -- update_columns seeds cached aggregate counters under test
class CheckAchievementsJobTest < ActiveJob::TestCase
  setup do
    @user = users(:john)
    @plant = @user.plants.first
    Achievement.where(user: @user).destroy_all
  end

  test 'unlocks first_plant when user has plants and event matches' do
    CheckAchievementsJob.perform_now(
      event: 'plant_created',
      user_id: @user.id,
      source_type: 'Plant',
      source_id: @plant.id
    )
    assert_equal 1, @user.achievements.where(kind: 'first_plant').count
  end

  test 'is a no-op when achievement is already earned' do
    Achievement.create!(user: @user, kind: 'first_plant', earned_at: 1.day.ago)

    assert_no_difference -> { Achievement.count } do
      CheckAchievementsJob.perform_now(
        event: 'plant_created',
        user_id: @user.id,
        source_type: 'Plant',
        source_id: @plant.id
      )
    end
  end

  test 'unlocks streak_7 when cached streak counter clears the threshold' do
    @user.update_columns(current_care_streak_days: 7, longest_care_streak_days: 7, last_care_logged_on: Date.current)

    CheckAchievementsJob.perform_now(event: 'care_logged', user_id: @user.id)
    assert_equal 1, @user.achievements.where(kind: 'care_streak_7').count
  end

  test 'skips streak_30 when streak is below threshold' do
    @user.update_columns(current_care_streak_days: 8, longest_care_streak_days: 8, last_care_logged_on: Date.current)

    CheckAchievementsJob.perform_now(event: 'care_logged', user_id: @user.id)
    assert_equal 1, @user.achievements.where(kind: 'care_streak_7').count
    assert_equal 0, @user.achievements.where(kind: 'care_streak_30').count
  end

  test 'unlocks first_care_log on care_logged event when care_logs_count >= 1' do
    @user.update_columns(care_logs_count: 1)

    CheckAchievementsJob.perform_now(event: 'care_logged', user_id: @user.id)
    assert_equal 1, @user.achievements.where(kind: 'first_care_log').count
  end

  test 'unlocks login_streak_7 on user_logged_in event when streak hits 7' do
    @user.update_columns(current_login_streak_days: 7, longest_login_streak_days: 7, last_login_on: Date.current)

    CheckAchievementsJob.perform_now(event: 'user_logged_in', user_id: @user.id)
    assert_equal 1, @user.achievements.where(kind: 'login_streak_7').count
  end

  test 'unlocks login_streak_30 on user_logged_in event when streak hits 30' do
    @user.update_columns(current_login_streak_days: 30, longest_login_streak_days: 30, last_login_on: Date.current)

    CheckAchievementsJob.perform_now(event: 'user_logged_in', user_id: @user.id)
    assert_equal 1, @user.achievements.where(kind: 'login_streak_7').count
    assert_equal 1, @user.achievements.where(kind: 'login_streak_30').count
  end

  test 'skips login_streak achievements when below threshold' do
    @user.update_columns(current_login_streak_days: 5, longest_login_streak_days: 5, last_login_on: Date.current)

    CheckAchievementsJob.perform_now(event: 'user_logged_in', user_id: @user.id)
    assert_equal 0, @user.achievements.where(kind: 'login_streak_7').count
  end

  test 'silently returns when user has been deleted' do
    assert_nothing_raised do
      CheckAchievementsJob.perform_now(event: 'plant_created', user_id: 999_999)
    end
  end
end
