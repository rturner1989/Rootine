# frozen_string_literal: true

module Api
  module V1
    module Journal
      class CalendarController < BaseController
        def show
          plant_ids = parse_csv_param(:plant_ids)
          kinds = parse_csv_param(:kinds)

          stream = JournalStream.new(
            current_user,
            plant_ids: plant_ids,
            kinds: kinds,
            date_from: params[:date_from],
            date_to: params[:date_to]
          )
          schedule = CareSchedule.new(
            current_user,
            plant_ids: plant_ids,
            kinds: kinds,
            from: params[:date_from],
            to: params[:date_to]
          )

          render json: { events: stream.calendar_events, scheduled: schedule.entries }
        end
      end
    end
  end
end
