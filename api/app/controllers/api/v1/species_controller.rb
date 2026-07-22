# frozen_string_literal: true

module Api
  module V1
    class SpeciesController < BaseController
      def index
        if params[:q].present?
          render json: Species.search_with_api(params[:q])
        elsif params[:browse].present?
          render json: browse_payload
        else
          render json: Species.popular_payload
        end
      end

      def show
        species = if params[:perenual_id]
          Species.find_or_fetch_from_api(params[:perenual_id], fallback: search_summary)
        else
          Species.find_by(id: params[:id])&.refresh_if_stale!
        end

        return render json: { error: 'Not found' }, status: :not_found unless species

        render json: species.as_json(community: true)
      end

      private def browse_payload
        {
          species: Species.browse(**browse_filters),
          facets: Species.browse_facets
        }
      end

      private def browse_filters
        {
          pet_safe: ActiveModel::Type::Boolean.new.cast(params[:pet_safe]),
          difficulty: params[:difficulty].presence,
          light: params[:light].presence
        }
      end

      private def search_summary
        {
          common_name: params[:common_name],
          scientific_name: params[:scientific_name],
          image_url: params[:image_url]
        }
      end
    end
  end
end
