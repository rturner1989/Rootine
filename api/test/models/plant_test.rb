# frozen_string_literal: true

require 'test_helper'

# rubocop:disable Rails/SkipsModelValidations -- update_columns seeds calculated schedule values directly so tests don't have to round-trip through Plant#calculate_schedule
class PlantTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @space = spaces(:living_room)
    @species = species(:monstera)
  end

  test 'valid plant' do
    plant = @space.plants.new(nickname: 'Test Plant', species: @species)
    assert plant.valid?
  end

  test 'requires nickname' do
    plant = @space.plants.new(nickname: '', species: @species)
    assert_not plant.valid?
    assert_includes plant.errors[:nickname], "can't be blank"
  end

  test 'rejects future-dated last_watered_at' do
    plant = @space.plants.new(nickname: 'Time Traveller', species: @species, last_watered_at: 1.day.from_now)
    assert_not plant.valid?
    assert plant.errors[:last_watered_at].any?
  end

  test 'rejects last_watered_at older than 12 months' do
    plant = @space.plants.new(nickname: 'Ancient', species: @species, last_watered_at: 13.months.ago)
    assert_not plant.valid?
    assert plant.errors[:last_watered_at].any?
  end

  test 'rejects future-dated last_fed_at' do
    plant = @space.plants.new(nickname: 'Future Feed', species: @species, last_fed_at: 1.day.from_now)
    assert_not plant.valid?
    assert plant.errors[:last_fed_at].any?
  end

  test 'rejects last_fed_at older than 12 months' do
    plant = @space.plants.new(nickname: 'Stale Feed', species: @species, last_fed_at: 13.months.ago)
    assert_not plant.valid?
    assert plant.errors[:last_fed_at].any?
  end

  test 'accepts nil last_fed_at (non-feeding species)' do
    plant = @space.plants.new(nickname: 'Cactus Like', species: @species, last_fed_at: nil)
    assert plant.valid?
  end

  test 'calculates schedule on create when species is set' do
    plant = @space.plants.create!(nickname: 'New Plant', species: @species)

    assert plant.calculated_watering_days.present?
    assert plant.calculated_feeding_days.present?
  end

  test 'schedule uses species base frequency for average conditions' do
    @space.update!(light_level: 'medium', temperature_level: 'average', humidity_level: 'average')
    plant = @space.plants.create!(nickname: 'Average Plant', species: @species)

    assert_equal @species.watering_frequency_days, plant.calculated_watering_days
    assert_equal @species.feeding_frequency_days, plant.calculated_feeding_days
  end

  test 'bright and warm space reduces watering interval' do
    @space.update!(light_level: 'bright', temperature_level: 'warm', humidity_level: 'average')
    plant = @space.plants.create!(nickname: 'Sunny Plant', species: @species)

    assert plant.calculated_watering_days < @species.watering_frequency_days
  end

  test 'low light and cool space increases watering interval' do
    @space.update!(light_level: 'low', temperature_level: 'cool', humidity_level: 'average')
    plant = @space.plants.create!(nickname: 'Shady Plant', species: @species)

    assert plant.calculated_watering_days > @species.watering_frequency_days
  end

  test 'recalculates schedule when its space env changes' do
    @space.update!(light_level: 'medium', temperature_level: 'average', humidity_level: 'average')
    plant = @space.plants.create!(nickname: 'Test Plant', species: @species)
    original_days = plant.calculated_watering_days

    @space.update!(light_level: 'bright', temperature_level: 'warm')

    assert_not_equal original_days, plant.reload.calculated_watering_days
  end

  test 'recalculates schedule when plant moves to a different space' do
    @space.update!(light_level: 'medium', temperature_level: 'average', humidity_level: 'average')
    other_space = current_user.spaces.create!(
      name: 'Sunroom',
      category: 'indoor',
      light_level: 'bright',
      temperature_level: 'warm',
      humidity_level: 'dry'
    )

    plant = @space.plants.create!(nickname: 'Mover', species: @species)
    original_days = plant.calculated_watering_days

    plant.update!(space: other_space)

    assert_not_equal original_days, plant.calculated_watering_days
  end

  test 'does not recalculate when unrelated fields change' do
    plant = @space.plants.create!(nickname: 'Test Plant', species: @species)
    original_days = plant.calculated_watering_days

    plant.update!(nickname: 'Renamed Plant')

    assert_equal original_days, plant.calculated_watering_days
  end

  test 'water_status returns overdue when past due' do
    plant = plants(:wilty)
    assert_equal :overdue, plant.water_status
  end

  test 'water_status returns healthy when recently watered' do
    plant = plants(:sir_plantalot)
    assert_equal :healthy, plant.water_status
  end

  test 'water_status returns due_soon within 2 days' do
    plant = @space.plants.create!(
      nickname: 'Soon Plant',
      species: @species,
      calculated_watering_days: 7,
      last_watered_at: 6.days.ago
    )

    assert_equal :due_soon, plant.water_status
  end

  test 'water_status returns unknown without watering data' do
    plant = @space.plants.new(nickname: 'New Plant')
    assert_equal :unknown, plant.water_status
  end

  test 'feed_status returns overdue when past due' do
    plant = plants(:wilty)
    assert_equal :overdue, plant.feed_status
  end

  test 'days_until_water calculates correctly' do
    plant = plants(:sir_plantalot)
    assert_equal 4, plant.days_until_water
  end

  test 'species is optional' do
    plant = @space.plants.new(nickname: 'Mystery Plant')
    assert plant.valid?
  end

  test 'never calculates less than 1 day' do
    fast_species = Species.create!(common_name: 'Fast Fern', watering_frequency_days: 2, personality: 'needy')
    @space.update!(light_level: 'bright', temperature_level: 'warm', humidity_level: 'dry')
    plant = @space.plants.create!(nickname: 'Fast Plant', species: fast_species)

    assert plant.calculated_watering_days >= 1
  end

  test 'create unlocks first_plant achievement (idempotent across plants)' do
    user = User.create!(email: 'first-plant@test.com', name: 'FP', password: 'greenthumb99')
    space = user.spaces.create!(name: 'Office', light_level: 'medium', temperature_level: 'average', humidity_level: 'average')

    perform_enqueued_jobs do
      space.plants.create!(nickname: 'Number 1', species: @species)
    end
    assert_equal 1, user.achievements.where(kind: 'first_plant').count

    perform_enqueued_jobs do
      space.plants.create!(nickname: 'Number 2', species: @species)
    end
    assert_equal 1, user.achievements.where(kind: 'first_plant').count
  end

  test 'tasks_on returns water + feed tasks due on or before the date' do
    plant = @space.plants.create!(nickname: 'Wilty', species: @species, last_watered_at: 10.days.ago, last_fed_at: 60.days.ago)
    plant.update_columns(calculated_watering_days: 7, calculated_feeding_days: 30)

    tasks = plant.tasks_on(Date.current)
    kinds = tasks.pluck(:kind)
    assert_includes kinds, 'water'
    assert_includes kinds, 'feed'
  end

  test 'tasks_on returns empty array when nothing due yet' do
    plant = @space.plants.create!(nickname: 'Fresh', species: @species, last_watered_at: 1.hour.ago, last_fed_at: 1.hour.ago)
    plant.update_columns(calculated_watering_days: 7, calculated_feeding_days: 30)

    assert_empty plant.tasks_on(Date.current)
  end

  test 'tasks_on labels overdue with day count' do
    plant = @space.plants.create!(nickname: 'Late', species: @species, last_watered_at: 10.days.ago)
    plant.update_columns(calculated_watering_days: 7, calculated_feeding_days: nil, last_fed_at: nil)

    water_task = plant.tasks_on(Date.current).find { |task| task[:kind] == 'water' }
    assert_equal 'overdue', water_task[:due_state]
    assert_match(/days overdue/, water_task[:due_label])
  end

  test 'tasks_on labels due_today when due_on equals target date' do
    plant = @space.plants.create!(nickname: 'Right Time', species: @species, last_watered_at: 7.days.ago)
    plant.update_columns(calculated_watering_days: 7, calculated_feeding_days: nil, last_fed_at: nil)

    water_task = plant.tasks_on(Date.current).find { |task| task[:kind] == 'water' }
    assert_equal 'due_today', water_task[:due_state]
    assert_equal 'Due today', water_task[:due_label]
  end

  test 'destroying a plant cascades to its per-plant achievements' do
    plant = @space.plants.create!(nickname: 'Cascading Charlie', species: @species)
    Achievement.unlock!(user: current_user, kind: 'plant_anniversary', source: plant, metadata: { day_count: 30 })

    assert_difference -> { Achievement.where(source_type: 'Plant', source_id: plant.id).count }, -1 do
      plant.destroy!
    end
  end

  test 'destroying a plant leaves user-milestone achievements intact' do
    plant = @space.plants.create!(nickname: 'Solo', species: @species)
    # plant_created event triggers first_plant unlock; the source on the
    # Achievement row stays nil because first_plant declares no source_for.
    user_milestone_count = Achievement.where(user: current_user, source_type: nil).count

    plant.destroy!

    assert_equal user_milestone_count, Achievement.where(user: current_user, source_type: nil).count
  end

  test 'care_due_between projects a recurring upcoming cadence' do
    plant = scheduled_plant(last_watered_at: 4.days.ago, every: 7) # next due in 3 days

    due = plant.care_due_between('water', Date.current, Date.current + 30)

    assert_equal [3, 10, 17, 24].map { |offset| Date.current + offset }, due.pluck(:date)
    assert(due.all? { |entry| entry[:state] == 'scheduled' })
  end

  test 'care_due_between marks the due-today date and recurs from it' do
    plant = scheduled_plant(last_watered_at: 7.days.ago, every: 7)

    due = plant.care_due_between('water', Date.current, Date.current + 14)

    assert_equal Date.current, due.first[:date]
    assert_equal 'due_today', due.first[:state]
  end

  test 'care_due_between surfaces overdue on today, carrying the missed due date for the trail' do
    plant = scheduled_plant(last_watered_at: 10.days.ago, every: 7) # was due 3 days ago

    due = plant.care_due_between('water', Date.current - 10, Date.current + 10)

    assert_equal [{ date: Date.current, state: 'overdue', overdue_since: Date.current - 3 }], due
  end

  test 'care_due_between still surfaces overdue on today when the due date is weeks off-screen' do
    plant = scheduled_plant(last_watered_at: 40.days.ago, every: 7) # due 33 days ago

    due = plant.care_due_between('water', Date.current, Date.current + 14)

    assert_equal [{ date: Date.current, state: 'overdue', overdue_since: Date.current - 33 }], due
  end

  test 'care_due_between hides overdue when neither its due date nor today is in view' do
    plant = scheduled_plant(last_watered_at: 40.days.ago, every: 7)

    assert_empty plant.care_due_between('water', Date.current + 30, Date.current + 60)
  end

  test 'care_due_between returns nothing without a schedule baseline' do
    plant = @space.plants.create!(nickname: 'Fresh', species: @species)
    plant.update_columns(last_watered_at: nil, calculated_watering_days: nil)

    assert_empty plant.care_due_between('water', Date.current, Date.current + 30)
  end

  private def scheduled_plant(last_watered_at:, every:)
    plant = @space.plants.create!(nickname: 'Cadence', species: @species)
    plant.update_columns(last_watered_at: last_watered_at, calculated_watering_days: every)
    plant
  end

  private def current_user
    @space.user
  end
end
# rubocop:enable Rails/SkipsModelValidations
