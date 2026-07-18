# frozen_string_literal: true

Rack::Attack.cache.store = Rails.cache

# On in production, off everywhere else. The throttling tests switch it on
# around the block they care about, so the rest of the suite doesn't have to
# count requests to stay under the limit — and the Playwright run signs up
# dozens of users from a single address, which would trip the registration
# limit and fail the run rather than the app.
#
# Set RACK_ATTACK_ENABLED=true to exercise throttling locally.
Rack::Attack.enabled = ActiveModel::Type::Boolean.new.cast(
  ENV.fetch('RACK_ATTACK_ENABLED', Rails.env.production?)
)

# Reading the body consumes it, so it has to be rewound or the controller
# downstream parses an empty string.
read_email = lambda do |req, *path|
  body = req.body.read
  req.body.rewind
  next nil if body.blank?

  parsed = begin
    JSON.parse(body)
  rescue JSON::ParserError
    nil
  end
  parsed&.dig(*path).to_s.downcase.strip.presence
end

# ActionDispatch::RemoteIp resolves the client address ahead of this
# middleware and honours config.action_dispatch.trusted_proxies; req.ip
# only knows Rack's own proxy rules. Behind a load balancer that gap is
# every user sharing the proxy's address, so one attacker trips a throttle
# that locks out everyone.
client_ip = ->(req) { (req.env['action_dispatch.remote_ip'] || req.ip).to_s }

# Login is the online password-guessing surface. Keyed on email so an
# attacker working one account is stopped even when spread across hosts,
# and separately on IP so one host can't spray many accounts.
#
# The email limit stays loose enough to absorb a real person mistyping a
# few times — this exists to make guessing impractical, not to lock people
# out of their own account.
Rack::Attack.throttle('logins/email', limit: 10, period: 15.minutes) do |req|
  next unless req.post? && req.path == '/api/v1/session'

  read_email.call(req, 'session', 'email')
end

# Looser than the per-email limit: offices, universities and mobile
# networks put many legitimate users behind one address.
Rack::Attack.throttle('logins/ip', limit: 30, period: 15.minutes) do |req|
  client_ip.call(req) if req.post? && req.path == '/api/v1/session'
end

Rack::Attack.throttle('registrations/ip', limit: 10, period: 1.hour) do |req|
  client_ip.call(req) if req.post? && req.path == '/api/v1/registration'
end

Rack::Attack.throttle('password_resets/ip', limit: 10, period: 1.hour) do |req|
  client_ip.call(req) if req.post? && req.path == '/api/v1/password_resets'
end

Rack::Attack.throttle('password_resets/email', limit: 3, period: 1.hour) do |req|
  next unless req.post? && req.path == '/api/v1/password_resets'

  read_email.call(req, 'password_reset', 'email')
end

# POST /api/v1/token is deliberately unthrottled. It fires on every app
# boot, so a limit low enough to matter would cut off anyone with a few
# tabs open — and there is nothing to guess: the refresh token is 32 bytes
# of SecureRandom, not a credential a human chose.

Rack::Attack.throttled_responder = lambda do |request|
  retry_after = request.env['rack.attack.match_data']&.dig(:period)

  headers = { 'Content-Type' => 'application/json' }
  headers['Retry-After'] = retry_after.to_s if retry_after

  [429, headers, [{ error: 'Too many requests, please try again later.' }.to_json]]
end
