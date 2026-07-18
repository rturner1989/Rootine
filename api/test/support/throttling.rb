# frozen_string_literal: true

# Rack::Attack is disabled by default under test (see its initializer), so
# the throttle tests turn it on around the block they care about and clear
# the counter store either side — leaking counts between tests makes them
# order-dependent.
module Throttling
  def with_throttling
    Rack::Attack.cache.store.clear
    Rack::Attack.enabled = true
    yield
  ensure
    Rack::Attack.enabled = false
    Rack::Attack.cache.store.clear
  end
end
