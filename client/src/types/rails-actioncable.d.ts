declare module '@rails/actioncable' {
  export interface Subscription {
    unsubscribe(): void
  }

  export interface Subscriptions {
    create(
      channel: string | { channel: string; [key: string]: unknown },
      handlers?: {
        connected?(): void
        disconnected?(): void
        received?(data: unknown): void
      },
    ): Subscription
  }

  export interface Consumer {
    subscriptions: Subscriptions
    disconnect(): void
  }

  export function createConsumer(url?: string): Consumer
}
