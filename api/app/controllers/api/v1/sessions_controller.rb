# frozen_string_literal: true

module Api
  module V1
    class SessionsController < AuthController
      def create
        user = User.find_by(email: session_params[:email]&.downcase&.strip)

        if user&.authenticate(session_params[:password])
          render json: issue_tokens(user)
        else
          render json: { error: 'Invalid email or password' }, status: :unauthorized
        end
      end

      def destroy
        current_refresh_token&.revoke!
        clear_refresh_token_cookie

        head :no_content
      end

      private def session_params
        params.expect(session: [:email, :password])
      end
    end
  end
end
