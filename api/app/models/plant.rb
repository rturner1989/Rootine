# frozen_string_literal: true

# == Schema Information
#
# Table name: plants
#
#  id                       :bigint           not null, primary key
#  acquired_at              :date
#  calculated_feeding_days  :integer
#  calculated_watering_days :integer
#  last_fed_at              :datetime
#  last_watered_at          :datetime
#  nickname                 :string           not null
#  notes                    :text
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  space_id                 :bigint           not null
#  species_id               :bigint
#
# Indexes
#
#  index_plants_on_space_id    (space_id)
#  index_plants_on_species_id  (species_id)
#
# Foreign Keys
#
#  fk_rails_...  (space_id => spaces.id)
#  fk_rails_...  (species_id => species.id)
#
class Plant < ApplicationRecord
  belongs_to :space, counter_cache: true
  belongs_to :species, optional: true
  has_many :care_logs, dependent: :destroy
  has_many :plant_photos, dependent: :destroy
  has_many :achievements, as: :source, dependent: :destroy

  delegate :user, to: :space

  validates :nickname, presence: true

  # last_watered_at is allow_nil because set_initial_watered_at fills it
  # at create time; last_fed_at is allow_nil because some species don't
  # feed. Range bounds still apply when a value IS set.
  validates :last_watered_at,
            comparison: { less_than_or_equal_to: -> { Time.current }, greater_than_or_equal_to: -> { 12.months.ago } },
            allow_nil: true
  validates :last_fed_at,
            comparison: { less_than_or_equal_to: -> { Time.current }, greater_than_or_equal_to: -> { 12.months.ago } },
            allow_nil: true

  scope :in_space, ->(space_id) { where(space_id: space_id) if space_id.present? }

  before_save :calculate_schedule, if: :should_recalculate?
  before_create :set_initial_watered_at
  after_create_commit :increment_user_plants_count
  after_create_commit :check_plant_created_achievements
  after_destroy_commit :decrement_user_plants_count

  # Triggered by Space#after_update when env shifts — the space callback
  # iterates its plants and runs this. Bypasses `should_recalculate?`
  # which only watches Plant's own columns.
  def recalculate_schedule!
    calculate_schedule
    save!
  end

  def water_status
    return :unknown unless last_watered_at && calculated_watering_days

    days_until = days_until_water

    if days_until.negative?
      :overdue
    elsif days_until.zero?
      :due_today
    elsif days_until <= 2
      :due_soon
    else
      :healthy
    end
  end

  def feed_status
    return :unknown unless last_fed_at && calculated_feeding_days

    days_until = days_until_feed

    if days_until.negative?
      :overdue
    elsif days_until.zero?
      :due_today
    elsif days_until <= 3
      :due_soon
    else
      :healthy
    end
  end

  def days_until_water
    return nil unless last_watered_at && calculated_watering_days

    calculated_watering_days - days_since_watered
  end

  def days_until_feed
    return nil unless last_fed_at && calculated_feeding_days

    calculated_feeding_days - days_since_fed
  end

  def next_water_on
    return nil unless last_watered_at && calculated_watering_days

    last_watered_at.to_date + calculated_watering_days.days
  end

  def next_feed_on
    return nil unless last_fed_at && calculated_feeding_days

    last_fed_at.to_date + calculated_feeding_days.days
  end

  # Returns the care tasks (water + feed) due on or before the given
  # date. Each task is a hash the dashboard payload + Today's rituals
  # card can render directly. Drives both the rituals list and the
  # week-view calendar's per-day dots.
  def tasks_on(date)
    tasks = []

    tasks << build_task(kind: 'water', due_on: next_water_on, target_date: date) if next_water_on && next_water_on <= date

    tasks << build_task(kind: 'feed', due_on: next_feed_on, target_date: date) if next_feed_on && next_feed_on <= date

    tasks
  end

  # Care due-dates for `kind` ('water' | 'feed') falling within [from, to],
  # as { date:, state: } hashes — the forward-looking layer of the journal
  # calendar. An upcoming cadence recurs forward by its interval (a forecast
  # that assumes on-time care); an overdue plant yields a single overdue
  # marker on its (past) due date and does NOT recur, since the next date is
  # unknowable until it's logged again.
  def care_due_between(kind, from, to)
    next_on, interval = care_cadence(kind)
    return [] unless next_on && interval&.positive?

    return overdue_due_dates(next_on, from, to) if next_on < Date.current

    upcoming_due_dates(next_on, interval, from, to)
  end

  def as_json(_options = {})
    {
      id: id,
      nickname: nickname,
      notes: notes,
      space_id: space_id,
      space: space.as_json,
      species: species&.as_json,
      calculated_watering_days: calculated_watering_days,
      calculated_feeding_days: calculated_feeding_days,
      water_status: water_status,
      feed_status: feed_status,
      days_until_water: days_until_water,
      days_until_feed: days_until_feed,
      last_watered_at: last_watered_at,
      last_fed_at: last_fed_at,
      acquired_at: acquired_at,
      created_at: created_at
    }
  end

  private def build_task(kind:, due_on:, target_date:)
    today = Date.current
    days_overdue_today = (today - due_on).to_i
    state = days_overdue_today.positive? ? 'overdue' : 'due_today'
    label = if days_overdue_today.positive?
      "#{days_overdue_today} #{'day'.pluralize(days_overdue_today)} overdue"
    elsif due_on == today
      'Due today'
    else
      due_on.strftime('Due %a %-d %b')
    end

    {
      id: "plant-#{id}-#{kind}",
      kind: kind,
      plant_id: id,
      plant_nickname: nickname,
      personality: species&.personality,
      due_on: due_on,
      due_state: state,
      due_label: label,
      target_date: target_date
    }
  end

  private def care_cadence(kind)
    case kind
    when 'water' then [next_water_on, calculated_watering_days]
    when 'feed' then [next_feed_on, calculated_feeding_days]
    end
  end

  private def overdue_due_dates(due_on, from, to)
    # Overdue care is pending *now*, not a past event — surface it on today
    # (the actionable day) so today aggregates everything outstanding, like
    # the Today rituals. `overdue_since` carries the original due date so the
    # calendar can trail red from the missed day up to today. Skip only when
    # today isn't in view (other months).
    return [] unless Date.current.between?(from, to)

    [{ date: Date.current, state: 'overdue', overdue_since: due_on }]
  end

  private def upcoming_due_dates(next_on, interval, from, to)
    today = Date.current
    dates = []
    date = next_on
    while date <= to
      dates << { date: date, state: date == today ? 'due_today' : 'scheduled' } if date >= from
      date += interval.days
    end
    dates
  end

  private def days_since_watered
    ((Time.current - last_watered_at) / 1.day).to_i
  end

  private def days_since_fed
    ((Time.current - last_fed_at) / 1.day).to_i
  end

  private def should_recalculate?
    species.present? && (
      new_record? ||
      species_id_changed? ||
      space_id_changed?
    )
  end

  private def set_initial_watered_at
    self.last_watered_at ||= Time.current
  end

  private def check_plant_created_achievements
    CheckAchievementsJob.perform_later(
      event: 'plant_created',
      user_id: user.id,
      source_type: 'Plant',
      source_id: id
    )
  end

  # User.increment_counter / decrement_counter are atomic SQL operations
  # — same machinery Rails' built-in counter_cache uses. Direct
  # counter_cache: true would have been ideal, but Plant -> Space -> User
  # is a through-association which counter_cache doesn't support.
  # rubocop:disable Rails/SkipsModelValidations -- atomic counter, no validations needed
  private def increment_user_plants_count
    User.increment_counter(:plants_count, user.id)
  end

  private def decrement_user_plants_count
    User.decrement_counter(:plants_count, user.id)
  end
  # rubocop:enable Rails/SkipsModelValidations

  # Reads env from the plant's space — Space#after_update re-saves every
  # plant in the space when its env changes, so each plant runs through
  # this callback again with the fresh values.
  private def calculate_schedule
    return unless space

    modifier = 1.0 +
      Space::LIGHT_MODIFIERS.fetch(space.light_level, 0.0) +
      Space::TEMPERATURE_MODIFIERS.fetch(space.temperature_level, 0.0) +
      Space::HUMIDITY_MODIFIERS.fetch(space.humidity_level, 0.0)

    self.calculated_watering_days = [(species.watering_frequency_days * modifier).round, 1].max

    self.calculated_feeding_days = [(species.feeding_frequency_days * modifier).round, 1].max if species.feeding_frequency_days
  end
end
