# frozen_string_literal: true

module Api
  module V1
    class JournalController < BaseController
      def index
        stream = JournalStream.new(
          current_user,
          plant_ids: parse_csv_param(:plant_ids),
          kinds: parse_csv_param(:kinds),
          before: params[:before],
          date_from: params[:date_from],
          date_to: params[:date_to],
          limit: params[:limit]
        )
        render json: { entries: stream.entries, next_cursor: stream.next_cursor }
      end

      # ?key=a,b comes in as a CSV string; ?key[]=a&key[]=b arrives as an
      # Array. Handle both — split each entry on commas, strip, drop blanks.
      private def parse_csv_param(key)
        raw = params[key]
        return nil if raw.blank?

        Array(raw).flat_map { |entry| entry.to_s.split(',') }.map(&:strip).reject(&:empty?)
      end
    end
  end
end
