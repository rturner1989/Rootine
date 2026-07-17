# frozen_string_literal: true

module Api
  module V1
    class ProfilesController < BaseController
      def show
        render json: current_user.as_json(stats: true)
      end

      def update
        if current_user.update(profile_params)
          render json: current_user.as_json(stats: true)
        else
          render json: { errors: current_user.errors.messages }, status: :unprocessable_content
        end
      end

      # Password re-auth mirrors Profile::PasswordsController — deleting
      # the account is the one irreversible action here, so a leaked
      # access token alone must not be enough to trigger it.
      def destroy
        unless current_user.authenticate(params[:current_password])
          return render json: { error: 'Current password is incorrect' }, status: :unprocessable_content
        end

        current_user.destroy!
        head :no_content
      end

      private def profile_params
        params.expect(
          user: [:name, :email, :timezone, :onboarding_intent, :onboarding_step_reached,
                 :latitude, :longitude, :location_label,
                 :notify_care_reminders, :notify_achievements]
        )
      end
    end
  end
end
