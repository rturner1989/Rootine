# frozen_string_literal: true

module Api
  module V1
    module Profile
      class PasswordsController < Api::V1::BaseController
        def update
          unless current_user.authenticate(params[:current_password])
            return render json: { error: 'Current password is incorrect' }, status: :unprocessable_content
          end

          if current_user.update(password_params)
            current_user.revoke_sessions!(except: current_user.refresh_tokens.find_by_raw_token(cookies[:refresh_token]))
            render json: { message: 'Password updated — your other devices have been signed out.' }
          else
            render json: { errors: current_user.errors.messages }, status: :unprocessable_content
          end
        end

        private def password_params
          params.expect(user: [:password, :password_confirmation])
        end
      end
    end
  end
end
