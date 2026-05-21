# frozen_string_literal: true

require 'test_helper'

# rubocop:disable Rails/SkipsModelValidations -- update_columns seeds calculated schedule values directly so tests don't have to round-trip through Plant#calculate_schedule
class CareScheduleTest < ActiveSupport::TestCase
  setup do
    @john = users(:john)
    @jane = users(:jane)
    @spike = plants(:spike) # carries no care fixtures — schedule set per test
    @window_from = Date.current - 10
    @window_to = Date.current + 30
  end

  test 'projects recurring future water due-dates at the interval' do
    # Last watered 4 days ago on a 7-day cadence → next due in 3 days.
    set_water_schedule(@spike, last_watered_at: 4.days.ago, every: 7)

    dates = schedule(plant_ids: [@spike.id], kinds: ['water']).entries.pluck(:date)

    expected = [3, 10, 17, 24].map { |offset| (Date.current + offset).iso8601 } # +31 falls past the window
    assert_equal expected, dates
  end

  test 'marks the due-today cell as due_today, then recurs' do
    set_water_schedule(@spike, last_watered_at: 7.days.ago, every: 7)

    entries = schedule(plant_ids: [@spike.id], kinds: ['water']).entries

    assert_equal Date.current.iso8601, entries.first[:date]
    assert_equal 'due_today', entries.first[:state]
    assert(entries.drop(1).all? { |entry| entry[:state] == 'scheduled' })
  end

  test 'an overdue plant surfaces a single overdue marker on today' do
    # Last watered 10 days ago on a 7-day cadence → was due 3 days ago.
    set_water_schedule(@spike, last_watered_at: 10.days.ago, every: 7)

    entries = schedule(plant_ids: [@spike.id], kinds: ['water']).entries

    assert_equal 1, entries.size
    assert_equal 'overdue', entries.first[:state]
    assert_equal Date.current.iso8601, entries.first[:date]
    assert_equal (Date.current - 3).iso8601, entries.first[:overdue_since]
  end

  test 'a plant overdue on both water and feed surfaces both on today' do
    # Water due 8 days ago (15 ago + 7), feed due 1 day ago (15 ago + 14).
    @spike.update_columns(last_watered_at: 15.days.ago, calculated_watering_days: 7, last_fed_at: 15.days.ago,
                         calculated_feeding_days: 14)

    entries = schedule(plant_ids: [@spike.id]).entries

    assert_equal 2, entries.size
    assert(entries.all? { |entry| entry[:state] == 'overdue' && entry[:date] == Date.current.iso8601 })
    assert_equal %w[feed water], entries.pluck(:kind).sort
  end

  test 'entries carry the plant id and nickname for the popover' do
    set_water_schedule(@spike, last_watered_at: 1.day.ago, every: 7)

    entry = schedule(plant_ids: [@spike.id], kinds: ['water']).entries.first

    assert_equal @spike.id, entry[:plant_id]
    assert_equal @spike.nickname, entry[:plant_nickname]
    assert_equal 'water', entry[:kind]
  end

  test 'kinds filter narrows to the requested care kind' do
    set_water_schedule(@spike, last_watered_at: 1.day.ago, every: 7)
    @spike.update_columns(last_fed_at: 1.day.ago, calculated_feeding_days: 14)

    water_only = schedule(plant_ids: [@spike.id], kinds: ['water']).entries

    assert(water_only.all? { |entry| entry[:kind] == 'water' })
    assert_not_empty water_only
  end

  test 'a kinds filter with no care kinds yields nothing' do
    set_water_schedule(@spike, last_watered_at: 1.day.ago, every: 7)

    assert_empty schedule(plant_ids: [@spike.id], kinds: ['photo']).entries
  end

  test 'no kind filter projects both water and feed' do
    set_water_schedule(@spike, last_watered_at: 1.day.ago, every: 7)
    @spike.update_columns(last_fed_at: 1.day.ago, calculated_feeding_days: 14)

    kinds = schedule(plant_ids: [@spike.id]).entries.pluck(:kind).uniq

    assert_includes kinds, 'water'
    assert_includes kinds, 'feed'
  end

  test 'skips plants with no schedule baseline' do
    @spike.update_columns(last_watered_at: nil, calculated_watering_days: nil, last_fed_at: nil, calculated_feeding_days: nil)

    assert_empty schedule(plant_ids: [@spike.id]).entries
  end

  test 'keeps entries within the date window' do
    set_water_schedule(@spike, last_watered_at: 1.day.ago, every: 7)

    entries = schedule(plant_ids: [@spike.id], kinds: ['water'], from: Date.current, to: Date.current + 5).entries

    assert(entries.all? { |entry| Date.parse(entry[:date]).between?(Date.current, Date.current + 5) })
  end

  test 'scopes to the user — another user sees nothing of these plants' do
    set_water_schedule(@spike, last_watered_at: 1.day.ago, every: 7)

    plant_ids = schedule(user: @jane).entries.pluck(:plant_id)

    assert_not_includes plant_ids, @spike.id
  end

  private def schedule(user: @john, from: @window_from, to: @window_to, **)
    CareSchedule.new(user, from: from, to: to, **)
  end

  private def set_water_schedule(plant, last_watered_at:, every:)
    plant.update_columns(last_watered_at: last_watered_at, calculated_watering_days: every, last_fed_at: nil,
                         calculated_feeding_days: nil)
  end
end
# rubocop:enable Rails/SkipsModelValidations
