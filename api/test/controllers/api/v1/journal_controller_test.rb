# frozen_string_literal: true

require 'test_helper'

class Api::V1::JournalControllerTest < ActionDispatch::IntegrationTest
  include ActionDispatch::TestProcess::FixtureFile

  setup do
    @john = users(:john)
    @jane = users(:jane)
    @sir = plants(:sir_plantalot)
    @spike = plants(:spike)
  end

  test 'index requires authentication' do
    get api_v1_journal_path, as: :json
    assert_response :unauthorized
  end

  test 'index returns the entries + next_cursor payload shape' do
    Achievement.unlock!(user: @john, kind: 'first_plant')

    get api_v1_journal_path, headers: auth_headers(@john), as: :json

    assert_response :ok
    body = response.parsed_body
    assert body.key?('entries')
    assert body.key?('next_cursor')
    assert_not_empty body['entries']
  end

  test 'index scopes entries to current_user' do
    Achievement.unlock!(user: @john, kind: 'first_plant')

    get api_v1_journal_path, headers: auth_headers(@jane), as: :json

    assert_response :ok
    assert_empty response.parsed_body['entries']
  end

  test 'index filters by plant_ids' do
    @spike.care_logs.create!(care_type: 'watering', performed_at: 1.day.ago)

    get api_v1_journal_path(plant_ids: @sir.id), headers: auth_headers(@john), as: :json

    assert_response :ok
    plant_ids = response.parsed_body['entries'].map { |entry| entry.dig('plant', 'id') }.compact.uniq
    assert_equal [@sir.id], plant_ids
  end

  test 'index accepts multiple plant ids as a CSV' do
    @spike.care_logs.create!(care_type: 'watering', performed_at: 1.day.ago)

    get api_v1_journal_path(plant_ids: "#{@sir.id},#{@spike.id}"), headers: auth_headers(@john), as: :json

    assert_response :ok
    plant_ids = response.parsed_body['entries'].map { |entry| entry.dig('plant', 'id') }.compact.uniq
    assert_includes plant_ids, @sir.id
    assert_includes plant_ids, @spike.id
  end

  test 'index parses kinds as a CSV param' do
    get api_v1_journal_path(kinds: 'water'), headers: auth_headers(@john), as: :json

    assert_response :ok
    kinds = response.parsed_body['entries'].pluck('kind').uniq
    assert_equal ['water'], kinds
  end

  test 'index applies the limit param and returns a cursor when capped' do
    35.times do |i|
      @sir.care_logs.create!(care_type: 'watering', performed_at: (i + 30).days.ago)
    end

    get api_v1_journal_path(limit: 5), headers: auth_headers(@john), as: :json

    assert_response :ok
    body = response.parsed_body
    assert_equal 5, body['entries'].size
    assert_equal body['entries'].last['occurred_at'], body['next_cursor']
  end

  test 'index honours the before cursor' do
    cursor = 4.days.ago.iso8601

    get api_v1_journal_path(before: cursor), headers: auth_headers(@john), as: :json

    assert_response :ok
    response.parsed_body['entries'].each do |entry|
      assert Time.iso8601(entry['occurred_at']) < Time.iso8601(cursor)
    end
  end
end
