# frozen_string_literal: true

require 'test_helper'

# rubocop:disable Rails/SkipsModelValidations -- update_columns seeds calculated schedule values directly so tests don't have to round-trip through Plant#calculate_schedule
class Api::V1::Journal::CalendarControllerTest < ActionDispatch::IntegrationTest
  include ActionDispatch::TestProcess::FixtureFile

  setup do
    @john = users(:john)
    @jane = users(:jane)
    @sir = plants(:sir_plantalot)
    @spike = plants(:spike)
  end

  test 'show requires authentication' do
    get api_v1_journal_calendar_path, as: :json
    assert_response :unauthorized
  end

  test 'show returns the compact events payload' do
    @sir.care_logs.create!(care_type: 'watering', performed_at: 1.day.ago)

    get api_v1_journal_calendar_path, headers: auth_headers(@john), as: :json

    assert_response :ok
    body = response.parsed_body
    assert body.key?('events')
    assert body.key?('scheduled')
    assert(body['events'].all? { |event| event.key?('occurred_at') && event.key?('kind') })
  end

  test 'show includes upcoming scheduled care' do
    @spike.update_columns(last_watered_at: 1.day.ago, calculated_watering_days: 7, last_fed_at: nil,
                         calculated_feeding_days: nil)

    get api_v1_journal_calendar_path(
      plant_ids: @spike.id, kinds: 'water', date_from: Date.current.iso8601, date_to: (Date.current + 14).iso8601
    ), headers: auth_headers(@john), as: :json

    assert_response :ok
    scheduled = response.parsed_body['scheduled']
    assert_not_empty scheduled
    assert(scheduled.all? { |entry| entry['kind'] == 'water' && entry.key?('date') && entry.key?('state') })
  end

  test 'show scopes events to current_user' do
    @sir.care_logs.create!(care_type: 'watering', performed_at: 1.day.ago)

    get api_v1_journal_calendar_path, headers: auth_headers(@jane), as: :json

    assert_response :ok
    assert_empty response.parsed_body['events']
  end

  test 'show narrows to the date window' do
    # @spike carries no care fixtures, so the count stays exact.
    @spike.care_logs.create!(care_type: 'watering', performed_at: 2.days.ago)
    @spike.care_logs.create!(care_type: 'watering', performed_at: 40.days.ago)

    get api_v1_journal_calendar_path(
      plant_ids: @spike.id, kinds: 'water', date_from: 7.days.ago.to_date.iso8601, date_to: Date.current.iso8601
    ), headers: auth_headers(@john), as: :json

    assert_response :ok
    assert_equal 1, response.parsed_body['events'].size
  end

  test 'show ships a window-scoped summary for the stats rail' do
    @spike.care_logs.create!(care_type: 'watering', performed_at: 2.days.ago)
    @spike.care_logs.create!(care_type: 'watering', performed_at: 40.days.ago)

    get api_v1_journal_calendar_path(
      plant_ids: @spike.id, kinds: 'water', date_from: 7.days.ago.to_date.iso8601, date_to: Date.current.iso8601
    ), headers: auth_headers(@john), as: :json

    assert_response :ok
    summary = response.parsed_body['summary']
    assert_equal 1, summary['entry_count']
    assert_equal 1, summary['kind_counts']['water']
    assert summary.key?('top_plants')
    assert summary.key?('streak')
  end
end
# rubocop:enable Rails/SkipsModelValidations
