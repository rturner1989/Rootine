# frozen_string_literal: true

module Api
  module V1
    module Onboarding
      class CompletionsController < Api::V1::BaseController
        def create
          current_user.complete_onboarding!
          # Same shape as every other profile payload — the client keeps
          # one cache and expects stats on it wherever it's seeded.
          render json: current_user.as_json(stats: true), status: :created
        end
      end
    end
  end
end
