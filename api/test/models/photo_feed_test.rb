# frozen_string_literal: true

require 'test_helper'

class PhotoFeedTest < ActiveSupport::TestCase
  include ActionDispatch::TestProcess::FixtureFile

  setup do
    @john = users(:john)
    @jane = users(:jane)
    @sir = plants(:sir_plantalot)
    @spike = plants(:spike)
  end

  test 'returns the user photos newest first across every plant' do
    create_photo(plant: @sir, taken_at: 5.days.ago)
    create_photo(plant: @spike, taken_at: 1.day.ago)

    plant_ids = PhotoFeed.new(@john).photos.map { |photo| photo.dig(:plant, :id) }

    assert_equal [@spike.id, @sir.id], plant_ids
  end

  test 'scopes to the user' do
    create_photo(plant: @sir, taken_at: 1.day.ago)

    assert_empty PhotoFeed.new(@jane).photos
  end

  test 'plant_ids narrows to one plant' do
    create_photo(plant: @sir, taken_at: 1.day.ago)
    create_photo(plant: @spike, taken_at: 2.days.ago)

    plant_ids = PhotoFeed.new(@john, plant_ids: [@sir.id]).photos.map { |photo| photo.dig(:plant, :id) }.uniq

    assert_equal [@sir.id], plant_ids
  end

  test 'plant_ids accepts a comma-separated string of multiple plants' do
    create_photo(plant: @sir, taken_at: 1.day.ago)
    create_photo(plant: @spike, taken_at: 2.days.ago)

    plant_ids = PhotoFeed.new(@john, plant_ids: "#{@sir.id},#{@spike.id}").photos.map { |photo| photo.dig(:plant, :id) }

    assert_equal [@sir.id, @spike.id], plant_ids
  end

  test 'date_from keeps photos on or after the day' do
    create_photo(plant: @sir, taken_at: 2.days.ago)
    old = create_photo(plant: @sir, taken_at: 10.days.ago)

    ids = PhotoFeed.new(@john, date_from: 5.days.ago.to_date.iso8601).photos.pluck(:id)

    assert_not_includes ids, old.id
  end

  test 'date_to is an inclusive day cap' do
    on_cap = create_photo(plant: @sir, taken_at: 3.days.ago.beginning_of_day + 14.hours)
    after_cap = create_photo(plant: @sir, taken_at: 1.day.ago)

    ids = PhotoFeed.new(@john, date_to: 3.days.ago.to_date.iso8601).photos.pluck(:id)

    assert_includes ids, on_cap.id
    assert_not_includes ids, after_cap.id
  end

  test 'before cursor returns photos strictly older than the cursor' do
    create_photo(plant: @sir, taken_at: 2.days.ago)
    create_photo(plant: @sir, taken_at: 6.days.ago)
    cursor = 4.days.ago

    feed = PhotoFeed.new(@john, before: cursor.iso8601)

    assert(feed.photos.all? { |photo| photo[:taken_at] < cursor })
  end

  test 'next_cursor is last taken_at iso8601 when at the limit, nil under' do
    6.times { |i| create_photo(plant: @sir, taken_at: (i + 1).days.ago) }

    capped = PhotoFeed.new(@john, limit: 4)
    assert_equal 4, capped.photos.size
    assert_equal capped.photos.last[:taken_at].iso8601(3), capped.next_cursor

    assert_nil PhotoFeed.new(@john, limit: 30).next_cursor
  end

  test 'limit clamps to MAX_LIMIT' do
    assert_equal PhotoFeed::MAX_LIMIT, PhotoFeed.new(@john, limit: 9_999).limit
  end

  private def create_photo(plant:, **attrs)
    plant.plant_photos.create!(image: fixture_file_upload('test_plant.jpg', 'image/jpeg'), **attrs)
  end
end
