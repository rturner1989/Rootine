# frozen_string_literal: true

module Api
  module V1
    class SpeciesController < BaseController
      def index
        render json: index_payload
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

      # Three read modes on one collection: a text search, the filtered browse
      # grid, or the default popular list. Guard clauses keep each mode its own
      # line rather than an if/elsif chain.
      private def index_payload
        return Species.search_with_api(params[:q]) if params[:q].present?
        return grouped_payload if params[:browse].present? && params[:group] == 'spaces'
        return browse_payload if params[:browse].present?

        Species.popular_payload
      end

      private def browse_payload
        {
          species: Species.browse(**browse_filters),
          facets: Species.browse_facets
        }
      end

      private def grouped_payload
        { groups: Species.browse_grouped_by_spaces(current_user.spaces.active, **browse_filters) }
      end

      private def browse_filters
        {
          pet_safe: ActiveModel::Type::Boolean.new.cast(params[:pet_safe]),
          difficulty: params[:difficulty].presence&.split(','),
          light: params[:light].presence&.split(',')
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
