# frozen_string_literal: true

require 'test_helper'

# rubocop:disable-next Rails/SkipsModelValidations -- update_columns seeds calculated schedule values directly so tests don't have to round-trip through Plant#calculate_schedule
class Api::V1::DashboardControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:john)
  end

  test 'requires authentication' do
    get api_v1_dashboard_path, as: :json

    assert_response :unauthorized
  end

  test 'returns stats for current user' do
    get api_v1_dashboard_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    json = response.parsed_body
    assert_equal 3, json['stats']['total_plants']
    assert_equal 2, json['stats']['total_spaces']
  end

  test 'returns streak with current + longest fields' do
    get api_v1_dashboard_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    json = response.parsed_body
    assert_kind_of Integer, json['streak']['current']
    assert_kind_of Integer, json['streak']['longest']
  end

  test 'returns overdue plants in plants_needing_water' do
    get api_v1_dashboard_path, headers: auth_headers(@user), as: :json

    json = response.parsed_body
    nicknames = json['plants_needing_water'].pluck('nickname')
    assert_includes nicknames, 'Wilty'
  end

  test 'excludes healthy plants from plants_needing_water' do
    get api_v1_dashboard_path, headers: auth_headers(@user), as: :json

    json = response.parsed_body
    nicknames = json['plants_needing_water'].pluck('nickname')
    assert_not_includes nicknames, 'Sir Plantalot'
  end

  test 'returns overdue feeding plants' do
    get api_v1_dashboard_path, headers: auth_headers(@user), as: :json

    json = response.parsed_body
    nicknames = json['plants_needing_feeding'].pluck('nickname')
    assert_includes nicknames, 'Wilty'
  end

  test 'scopes to current user only' do
    other = users(:jane)

    get api_v1_dashboard_path, headers: auth_headers(other), as: :json

    json = response.parsed_body
    assert_equal 0, json['stats']['total_plants']
    assert_equal 1, json['stats']['total_spaces']
  end

  test 'tasks payload returns rituals due today by default' do
    plant = @user.plants.first
    plant.update!(last_watered_at: 10.days.ago)
    plant.update_columns(calculated_watering_days: 7)

    get api_v1_dashboard_path, headers: auth_headers(@user), as: :json

    assert_response :ok
    tasks = response.parsed_body['tasks']
    water_task = tasks.find { |task| task['kind'] == 'water' && task['plant_id'] == plant.id }
    assert_not_nil water_task
    assert_equal 'overdue', water_task['due_state']
  end

  test 'tasks payload honours date param to preview future days' do
    plant = @user.plants.first
    plant.update!(last_watered_at: 1.day.ago)
    plant.update_columns(calculated_watering_days: 5)

    get api_v1_dashboard_path(date: (Date.current + 6.days).to_s), headers: auth_headers(@user), as: :json

    tasks = response.parsed_body['tasks']
    water_task = tasks.find { |task| task['kind'] == 'water' && task['plant_id'] == plant.id }
    assert_not_nil water_task
  end

  test 'tasks_by_day exposes counts for the next 7 days' do
    get api_v1_dashboard_path, headers: auth_headers(@user), as: :json

    by_day = response.parsed_body['tasks_by_day']
    assert_equal 7, by_day.size
    today_key = Date.current.to_s
    assert_kind_of Integer, by_day[today_key]['water']
    assert_kind_of Integer, by_day[today_key]['feed']
  end
end
