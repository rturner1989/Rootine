# frozen_string_literal: true

require 'test_helper'

class JournalStreamTest < ActiveSupport::TestCase
  include ActionDispatch::TestProcess::FixtureFile
  include ActiveJob::TestHelper

  setup do
    @john = users(:john)
    @jane = users(:jane)
    @sir = plants(:sir_plantalot)
    @spike = plants(:spike)
  end

  test 'returns entries from every source sorted by occurred_at desc' do
    create_photo(plant: @sir, taken_at: 1.day.ago)
    Achievement.unlock!(user: @john, kind: 'first_plant')
    @sir.update!(acquired_at: 30.days.ago.to_date)

    entries = stream.entries
    kinds = entries.pluck(:kind)

    assert_includes kinds, 'water'
    assert_includes kinds, 'photo'
    assert_includes kinds, 'achievement'
    assert_includes kinds, 'acquisition'

    timestamps = entries.pluck(:occurred_at)
    assert_equal timestamps.sort.reverse, timestamps
  end

  test 'scopes to the user — other users see none of these events' do
    Achievement.unlock!(user: @john, kind: 'first_plant')

    assert_empty stream(user: @jane).entries
  end

  test 'plant_ids filter narrows to those plants and hides user-scope achievements' do
    Achievement.unlock!(user: @john, kind: 'first_plant')
    Achievement.unlock!(
      user: @john,
      kind: 'plant_anniversary',
      source: @sir,
      metadata: { day_count: 30, plant_nickname: @sir.nickname }
    )

    entries = stream(plant_ids: [@sir.id]).entries
    plant_ids = entries.map { |entry| entry.dig(:plant, :id) }.compact.uniq
    achievements = entries.select { |entry| entry[:kind] == 'achievement' }

    assert_equal [@sir.id], plant_ids
    assert_equal 1, achievements.size
    assert_match(/Sir Plantalot/, achievements.first[:label].to_s)
  end

  test 'plant_ids filter accepts multiple plants' do
    @spike.care_logs.create!(care_type: 'watering', performed_at: 1.day.ago)

    entries = stream(plant_ids: [@sir.id, @spike.id]).entries
    plant_ids = entries.map { |entry| entry.dig(:plant, :id) }.compact.uniq

    assert_includes plant_ids, @sir.id
    assert_includes plant_ids, @spike.id
  end

  test 'kinds filter narrows to the requested subset' do
    create_photo(plant: @sir, taken_at: 1.day.ago)

    entries = stream(kinds: ['water']).entries

    assert_not_empty entries
    assert(entries.all? { |entry| entry[:kind] == 'water' })
  end

  test 'date_from caps the range to entries on or after the floor' do
    entries = stream(date_from: 5.days.ago.iso8601).entries

    assert(entries.all? { |entry| entry[:occurred_at] >= 5.days.ago - 1.second })
  end

  test 'date_to is inclusive of entries on the cap date' do
    # Afternoon on a fixed past day. With a start-of-day cap this 2pm
    # entry would be excluded; the end-of-day bump is what includes it.
    anchor = 5.days.ago.beginning_of_day + 14.hours
    @sir.care_logs.create!(care_type: 'watering', performed_at: anchor)

    entries = stream(date_to: anchor.to_date.iso8601).entries
    cap_day_entries = entries.select { |entry| entry[:occurred_at].to_date == anchor.to_date }

    assert cap_day_entries.any?, 'an afternoon entry on the cap date must be included (end-of-day, not midnight)'
  end

  test 'date_from accepts a YYYY-MM-DD date string' do
    floor = 2.days.ago.to_date.iso8601

    entries = stream(date_from: floor).entries

    assert(entries.all? { |entry| entry[:occurred_at] >= 2.days.ago.beginning_of_day })
  end

  test 'before cursor returns entries strictly older than the cursor' do
    cursor_at = 4.days.ago
    entries = stream(before: cursor_at.iso8601).entries

    assert(entries.all? { |entry| entry[:occurred_at] < cursor_at })
  end

  test 'next_cursor is the last entry occurred_at iso8601 when at the limit' do
    35.times do |i|
      @sir.care_logs.create!(care_type: 'watering', performed_at: (i + 30).days.ago)
    end
    paged = JournalStream.new(@john, limit: 5)

    assert_equal 5, paged.entries.size
    assert_equal paged.entries.last[:occurred_at].iso8601(3), paged.next_cursor
  end

  test 'next_cursor is nil when fewer than the limit' do
    assert_nil stream.next_cursor
  end

  test 'limit clamps to MAX_LIMIT' do
    paged = JournalStream.new(@john, limit: 9_999)

    assert_equal JournalStream::MAX_LIMIT, paged.limit
  end

  test 'summary counts entries and distinct plants across the filtered set' do
    create_photo(plant: @sir, taken_at: 1.day.ago)
    create_photo(plant: @sir, taken_at: 2.days.ago)
    create_photo(plant: @spike, taken_at: 3.days.ago)

    summary = stream(kinds: ['photo']).summary

    assert_equal 3, summary[:entry_count]
    assert_equal 2, summary[:plant_count]
  end

  test 'summary respects the date filter' do
    create_photo(plant: @sir, taken_at: 1.day.ago)
    create_photo(plant: @sir, taken_at: 20.days.ago)

    summary = stream(kinds: ['photo'], date_from: 5.days.ago.to_date.iso8601).summary

    assert_equal 1, summary[:entry_count]
    assert_equal 1, summary[:plant_count]
  end

  test 'summary is a full total — the before cursor does not narrow it' do
    create_photo(plant: @sir, taken_at: 1.day.ago)
    create_photo(plant: @sir, taken_at: 10.days.ago)

    summary = stream(kinds: ['photo'], before: 5.days.ago.iso8601).summary

    assert_equal 2, summary[:entry_count]
  end

  test 'summary kind_counts splits water/feed and counts each kind' do
    # @spike has no care fixtures (sir_plantalot does) — keep counts exact.
    @spike.care_logs.create!(care_type: 'watering', performed_at: 1.day.ago)
    @spike.care_logs.create!(care_type: 'watering', performed_at: 2.days.ago)
    @spike.care_logs.create!(care_type: 'feeding', performed_at: 3.days.ago)
    create_photo(plant: @spike, taken_at: 1.day.ago)

    counts = stream(plant_ids: [@spike.id], kinds: %w[water feed photo]).summary[:kind_counts]

    assert_equal 2, counts[:water]
    assert_equal 1, counts[:feed]
    assert_equal 1, counts[:photo]
    assert_equal 0, counts[:achievement]
  end

  test 'summary top_plants ranks plants by entry count, highest first' do
    create_photo(plant: @sir, taken_at: 1.day.ago)
    create_photo(plant: @sir, taken_at: 2.days.ago)
    create_photo(plant: @spike, taken_at: 1.day.ago)

    top = stream(kinds: ['photo']).summary[:top_plants]

    assert_equal([@sir.id, @spike.id], top.pluck(:id))
    assert_equal([2, 1], top.pluck(:count))
    assert_equal @sir.nickname, top.first[:nickname]
  end

  test 'summary streak reflects the user care streak (global, not filter-scoped)' do
    @john.update!(current_care_streak_days: 5, last_care_logged_on: Date.current)

    assert_equal 5, stream.summary.dig(:streak, :days)
  end

  test 'calendar_events returns compact occurred_at + kind pairs from every source' do
    @spike.care_logs.create!(care_type: 'watering', performed_at: 1.day.ago)
    @spike.care_logs.create!(care_type: 'feeding', performed_at: 2.days.ago)
    create_photo(plant: @spike, taken_at: 1.day.ago)
    @spike.update!(acquired_at: 3.days.ago.to_date)
    Achievement.unlock!(user: @john, kind: 'first_plant')

    events = stream.calendar_events

    assert(events.all? { |event| event.key?(:occurred_at) && event.key?(:kind) })
    assert(events.none? { |event| event.key?(:plant) || event.key?(:notes) }, 'payload stays compact')
    kinds = events.pluck(:kind)
    assert_includes kinds, 'water'
    assert_includes kinds, 'feed'
    assert_includes kinds, 'photo'
    assert_includes kinds, 'acquisition'
    assert_includes kinds, 'achievement'
  end

  test 'calendar_events is unpaginated — returns more than the 30-entry page cap' do
    40.times { |i| @spike.care_logs.create!(care_type: 'watering', performed_at: (i + 1).days.ago) }

    assert_operator stream(plant_ids: [@spike.id], kinds: ['water']).calendar_events.size, :>=, 40
  end

  test 'calendar_events honours the plant and kind filters' do
    @spike.care_logs.create!(care_type: 'watering', performed_at: 1.day.ago)
    create_photo(plant: @spike, taken_at: 1.day.ago)

    events = stream(plant_ids: [@spike.id], kinds: ['water']).calendar_events

    assert_not_empty events
    assert(events.all? { |event| event[:kind] == 'water' })
  end

  test 'calendar_events stays within the date window' do
    @spike.care_logs.create!(care_type: 'watering', performed_at: 2.days.ago)
    @spike.care_logs.create!(care_type: 'watering', performed_at: 40.days.ago)

    events = stream(
      plant_ids: [@spike.id],
      kinds: ['water'],
      date_from: 7.days.ago.to_date.iso8601,
      date_to: Date.current.iso8601
    ).calendar_events

    assert_equal 1, events.size
    assert_operator events.first[:occurred_at], :>=, 7.days.ago.beginning_of_day
  end

  test 'entry ids are prefixed with the kind' do
    @sir.update!(acquired_at: 30.days.ago.to_date)
    create_photo(plant: @sir, taken_at: 1.day.ago)
    Achievement.unlock!(user: @john, kind: 'first_plant')

    stream.entries.each do |entry|
      assert_match(/\A#{Regexp.escape(entry[:kind])}-\d+\z/, entry[:id])
    end
  end

  private def stream(user: @john, **)
    JournalStream.new(user, **)
  end

  private def create_photo(plant:, **attrs)
    plant.plant_photos.create!(
      image: fixture_file_upload('test_plant.jpg', 'image/jpeg'),
      **attrs
    )
  end
end
