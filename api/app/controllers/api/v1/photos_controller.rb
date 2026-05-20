# frozen_string_literal: true

module Api
  module V1
    # Flat, date-sorted feed of every photo the user owns — the Journal
    # Photos tab's masonry grid (all plants, or one plant via plant_id).
    # Per-plant create/destroy live on the nested Plants::PlantPhotos
    # controller; the read feed logic is shared via PhotoFeed.
    class PhotosController < BaseController
      def index
        feed = PhotoFeed.new(
          current_user,
          plant_ids: parse_csv_param(:plant_ids),
          date_from: params[:date_from],
          date_to: params[:date_to],
          before: params[:before],
          limit: params[:limit]
        )
        render json: { photos: feed.photos, next_cursor: feed.next_cursor }
      end
    end
  end
end
