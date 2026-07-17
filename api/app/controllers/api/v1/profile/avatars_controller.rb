# frozen_string_literal: true

module Api
  module V1
    module Profile
      # The avatar is its own resource rather than a field on the profile:
      # it's the one multipart part of the profile, and clearing it is a
      # delete rather than an attribute you can null out through a form.
      # Mirrors Profile::PasswordsController's nesting.
      class AvatarsController < Api::V1::BaseController
        def update
          if current_user.update(avatar: params.expect(:avatar))
            render json: current_user.as_json(stats: true)
          else
            render json: { errors: current_user.errors.messages }, status: :unprocessable_content
          end
        end

        def destroy
          current_user.avatar.purge
          render json: current_user.as_json(stats: true)
        end
      end
    end
  end
end
