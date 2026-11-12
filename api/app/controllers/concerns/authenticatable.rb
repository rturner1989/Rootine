# frozen_string_literal: true

module Authenticatable
  extend ActiveSupport::Concern

  private def authenticate!
    render json: { error: 'Unauthorized' }, status: :unauthorized unless current_user
  end

  private def current_user
    return @current_user if defined?(@current_user)

    token = request.headers['Authorization']&.split&.last
    if token.present?
      payload = JwtToken.decode(token)
      @current_user = User.find_by(id: payload[:user_id]) if payload
    end
  end

  private def current_refresh_token
    RefreshToken.find_by_raw_token(cookies[:refresh_token])
  end

  private def set_refresh_token_cookie(raw_token)
    cookies[:refresh_token] = {
      value: raw_token,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax,
      expires: 30.days.from_now,
      path: '/api/v1'
    }
  end

  private def clear_refresh_token_cookie
    cookies.delete(:refresh_token, path: '/api/v1')
  end
end
