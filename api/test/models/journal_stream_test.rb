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
    today_label = Date.current.iso8601
    @sir.care_logs.create!(care_type: 'watering', performed_at: Date.current.beginning_of_day + 9.hours)
    @sir.care_logs.create!(care_type: 'watering', performed_at: Date.current.beginning_of_day + 17.hours)

    entries = stream(date_to: today_label).entries
    today_entries = entries.select { |entry| entry[:occurred_at].to_date == Date.current }

    assert today_entries.size >= 2
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
