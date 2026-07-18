# frozen_string_literal: true

module Api
  module V1
    class AuthController < ApplicationController
      private def issue_tokens(user)
        access_token = JwtToken.encode({ user_id: user.id })
        raw_refresh, _refresh_token = RefreshToken.generate(user)
        set_refresh_token_cookie(raw_refresh)

        # stats: true because the client seeds its one profile cache from
        # this payload — a login that returned a statless user would leave
        # the Me page blank until the query staled out and refetched.
        { access_token: access_token, user: user.as_json(stats: true) }
      end
    end
  end
end
