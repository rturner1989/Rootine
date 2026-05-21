# frozen_string_literal: true

# Collects each plant's upcoming + overdue care (water/feed) across a date
# window — the forward-looking layer of the Journal Calendar, beside the
# logged events JournalStream returns. Read-only: the per-plant cadence
# (when's it next due, how does it recur, is it overdue) lives on Plant
# (#care_due_between); this object just filters the plants, walks the kinds,
# and stitches the results into the calendar payload.
class CareSchedule
  CARE_KINDS = %w[water feed].freeze

  def initialize(user, from:, to:, plant_ids: nil, kinds: nil)
    @user = user
    @plant_ids = Array(plant_ids).map(&:to_i).reject(&:zero?).presence
    # nil = no kind filter (both); [] = filtered to non-care kinds (none);
    # %w[water] = that subset.
    @kinds = kinds.nil? ? nil : Array(kinds).map(&:to_s) & CARE_KINDS
    @from = to_date(from)
    @to = to_date(to)
  end

  def entries
    return [] unless @from && @to && active_kinds.any?

    plants.flat_map do |plant|
      active_kinds.flat_map do |kind|
        plant.care_due_between(kind, @from, @to).map { |due| entry(plant, kind, due) }
      end
    end
  end

  private def plants
    scope = @user.plants
    scope = scope.where(id: @plant_ids) if @plant_ids
    scope
  end

  private def active_kinds
    @kinds.nil? ? CARE_KINDS : @kinds
  end

  private def entry(plant, kind, due)
    {
      date: due[:date].iso8601,
      kind: kind,
      state: due[:state],
      overdue_since: due[:overdue_since]&.iso8601,
      plant_id: plant.id,
      plant_nickname: plant.nickname
    }
  end

  private def to_date(value)
    return value if value.is_a?(Date)
    return nil if value.blank?

    Date.parse(value.to_s)
  rescue ArgumentError
    nil
  end
end
