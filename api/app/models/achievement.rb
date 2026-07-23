# frozen_string_literal: true

# Earn-once unlock — PlayStation-trophy / Steam-achievement style.
# Distinct from notifications (transient) and goals (in-progress).
#
# The catalogue of every achievement kind lives in AchievementCatalogue.
# Adding a new achievement = ONE entry in that module. Plant.rb,
# CareLog.rb, and the sweeper just call Achievement.check_triggers
# with an event name; the dispatcher matches kinds to the event and
# unlocks whatever conditions are met.
#
# Forward-compatible with Phase 2/3 expansion (login_reward,
# streak_reward, battle-pass quest unlocks — see
# project_login_rewards_idea.md / project_battle_pass_avatars_idea.md
# memos).
# == Schema Information
#
# Table name: achievements
#
#  id          :bigint           not null, primary key
#  earned_at   :datetime         not null
#  kind        :string           not null
#  metadata    :jsonb            not null
#  seen_at     :datetime
#  source_type :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  source_id   :bigint
#  user_id     :bigint           not null
#
# Indexes
#
#  index_achievements_on_earned_at                  (earned_at)
#  index_achievements_on_source_type_and_source_id  (source_type,source_id)
#  index_achievements_on_user_id                    (user_id)
#  index_achievements_on_user_id_and_seen_at        (user_id,seen_at)
#  index_achievements_on_user_kind_source           (user_id,kind,source_type,source_id) UNIQUE NULLS NOT DISTINCT
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
class Achievement < ApplicationRecord
  # --- Associations ---
  belongs_to :user
  belongs_to :source, polymorphic: true, optional: true

  # --- Scopes ---
  scope :recent, -> { order(earned_at: :desc, id: :desc) }
  scope :unseen_splash, -> {
    where(seen_at: nil, kind: AchievementCatalogue.with_surface(:splash).keys)
  }

  # --- Validations ---
  validates :kind, presence: true, inclusion: { in: AchievementCatalogue.kinds }
  validates :earned_at, presence: true
  # Uniqueness is enforced at the DB level via the
  # index_achievements_on_user_kind_source UNIQUE NULLS NOT DISTINCT
  # constraint. unlock! handles the race by rescuing RecordNotUnique
  # and re-fetching the existing row.

  # --- Callbacks ---
  after_create_commit :notify_user
  after_create_commit :broadcast_unlock

  # --- Class methods ---
  # Idempotent unlock — repeat calls for the same (user, kind, source)
  # are no-ops. Returns the Achievement (newly-created or existing).
  # The DB-level unique constraint catches the race when two callsites
  # try to unlock the same kind concurrently.
  def self.unlock!(user:, kind:, source: nil, metadata: {})
    source_type = source ? source.class.base_class.name : nil
    attrs = { user: user, kind: kind.to_s, source_type: source_type, source_id: source&.id }
    record = find_or_initialize_by(attrs)
    return record if record.persisted?

    record.earned_at = Time.current
    record.metadata = metadata.deep_stringify_keys
    record.save!
    record
  rescue ActiveRecord::RecordNotUnique
    find_by(attrs)
  end

  # Single dispatcher — callsites pass an event name + user (+ optional
  # source) and the dispatcher fires every catalogue kind whose
  # trigger_event matches AND whose condition returns true.
  def self.check_triggers(event:, user:, source: nil)
    AchievementCatalogue.with_event(event).each do |kind, definition|
      next unless definition[:condition].call(user, source)

      kind_source = definition[:source_for]&.call(source)
      metadata = definition[:metadata_for]&.call(user, source) || {}
      unlock!(user: user, kind: kind, source: kind_source, metadata: metadata)
    end
  end

  # --- Instance methods ---
  def surface
    (AchievementCatalogue.find(kind)&.dig(:surface) || :toast).to_sym
  end

  def mark_seen!
    return if seen_at.present?

    # rubocop:disable Rails/SkipsModelValidations -- only seen_at changes; uniqueness validator on user+kind+source would fire needlessly
    update_columns(seen_at: Time.current)
    # rubocop:enable Rails/SkipsModelValidations
  end

  def label
    raw = AchievementCatalogue.find(kind)&.dig(:label)
    raw.respond_to?(:call) ? raw.call(metadata) : raw.to_s
  end

  def emoji
    AchievementCatalogue.find(kind)&.dig(:emoji) || '★'
  end

  def as_json(_options = {})
    {
      id: id,
      kind: kind,
      label: label,
      emoji: emoji,
      earned_at: earned_at,
      seen_at: seen_at,
      metadata: metadata
    }
  end

  # --- Private ---
  # Broadcasts the unlock to the user's AchievementsChannel stream for
  # toast-surface kinds. Splash-surface kinds (login_streak_*) skip the
  # broadcast — the cable subscription isn't ready yet at login time, so
  # the client picks them up via the unseen-splash queue on mount.
  private def broadcast_unlock
    return unless surface == :toast

    AchievementsChannel.broadcast_to(user, as_json)
  end

  # Single Notifier for every achievement kind — reads label/emoji from
  # the Achievement record itself. Catalogue entries set
  # `notifier: :achievement` to opt into a Notification record (durable,
  # bell badge, drawer); nil keeps it cable-broadcast-only.
  # The user preference gates the inbox only — `broadcast_unlock` still
  # fires, so opting out silences the bell without taking away the
  # in-app toast that confirms the unlock as it happens.
  private def notify_user
    return unless AchievementCatalogue.find(kind)&.dig(:notifier) == :achievement
    return unless user.notify_achievements?

    AchievementNotifier.with(
      record: source,
      achievement_id: id,
      title: 'Achievement unlocked',
      label: label,
      emoji: emoji,
      url: notification_url
    ).deliver(user)
  end

  private def notification_url
    return nil unless source.is_a?(Plant)

    "/plants/#{source.id}"
  end
end
