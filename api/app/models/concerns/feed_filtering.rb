# frozen_string_literal: true

# Shared param parsing for the read-only feed query objects (JournalStream,
# PhotoFeed): CSV/array plant ids, lenient time parsing, inclusive day caps,
# and limit clamping. Plain module — these are POROs, not AR models, so the
# constants live here and resolve through the includer's ancestor chain.
module FeedFiltering
  DEFAULT_LIMIT = 30
  MAX_LIMIT = 100

  private def parse_plant_ids(value)
    ids = Array(value).flat_map { |entry| entry.to_s.split(',') }.map(&:strip).reject(&:empty?).map(&:to_i)
    ids.presence
  end

  # Accepts a full ISO8601 timestamp or a date-only string ("2026-05-01");
  # date-only inputs land at start-of-day in the app timezone.
  private def parse_time(value)
    return nil if value.blank?
    return value if value.respond_to?(:to_time) && !value.is_a?(String)

    Time.zone.parse(value.to_s)
  rescue ArgumentError
    nil
  end

  # date_to is an inclusive day cap: a date-only string ("2026-05-31")
  # parses to midnight, so push it to end-of-day to include that day.
  private def parse_inclusive_date_to(value)
    parsed = parse_time(value)
    return nil unless parsed
    return parsed.end_of_day if parsed == parsed.beginning_of_day

    parsed
  end

  private def clamp_limit(limit)
    parsed = limit.to_i
    return DEFAULT_LIMIT if parsed <= 0

    [parsed, MAX_LIMIT].min
  end
end
