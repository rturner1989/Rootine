# frozen_string_literal: true

require 'test_helper'

class SpeciesCommunityTest < ActiveSupport::TestCase
  # community_stats caches per species id and the test-env cache persists
  # across tests in a process — clear it so one test's aggregates can't leak.
  setup { Rails.cache.clear }

  test 'community_stats is nil below the grower floor' do
    # monstera has a single grower in fixtures — under the floor.
    assert_nil species(:monstera).community_stats
  end

  test 'community_stats reports aggregates once the floor is met' do
    stats = species(:community_fern).community_stats

    assert_not_nil stats
    assert_equal 5, stats[:grower_count]
    assert_equal 10, stats[:median_watering_days]
    assert_equal 'medium', stats[:typical_light]
    assert_equal 80, stats[:kept_on_schedule_pct]
  end

  test 'the grower floor is exactly five' do
    assert_equal 5, Species::COMMUNITY_MIN_GROWERS
  end

  test 'untrackable plants do not inflate kept_on_schedule_pct' do
    # A sixth grower whose plant has no computed schedule (nil
    # calculated_watering_days → :unknown status). Plant's create callbacks
    # normally fill both fields, so force the gap with update_column to model
    # the state the guard defends against. It must not be scored as "on
    # schedule": fixtures give 4/5 tracked ferns on schedule = 80%, and the
    # untrackable one must keep the tracked denominator at 5 — so the number
    # stays 80, not rise.
    space = spaces(:janes_kitchen)
    plant = space.plants.create!(species: species(:community_fern), nickname: 'Untrackable', calculated_watering_days: 14)
    plant.update_column(:calculated_watering_days, nil)

    assert_equal :unknown, plant.reload.water_status
    assert_equal 80, species(:community_fern).community_stats[:kept_on_schedule_pct]
  end
end
