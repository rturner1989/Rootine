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
        render json: { entries: stream.entries, next_cursor: stream.next_cursor, summary: stream.summary }
      end
    end
  end
end
