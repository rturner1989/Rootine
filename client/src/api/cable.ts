import type { Consumer } from '@rails/actioncable'
import { createConsumer } from '@rails/actioncable'

let consumer: Consumer | undefined

// Lazy-init so test environments that don't open WebSockets stay quiet.
// Path matches the cable mount in api/config/routes.rb — moved to
// /api/v1/cable so the path-scoped refresh-token cookie reaches the
// upgrade request. Protocol resolves from window.location (https → wss).
export function cableConsumer(): Consumer {
  if (!consumer) {
    consumer = createConsumer('/api/v1/cable')
  }
  return consumer
}

export function disconnectCable(): void {
  if (consumer) {
    consumer.disconnect()
    consumer = undefined
  }
}
