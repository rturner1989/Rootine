import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LocationButton from '../../../src/components/today/LocationButton'
import { ToastProvider } from '../../../src/context/ToastContext'

function renderButton() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LocationButton />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

function setSecureContext(value: boolean) {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value })
}

describe('LocationButton', () => {
  let getCurrentPosition: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getCurrentPosition = vi.fn()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
  })

  afterEach(() => {
    // LocationButton gates on `'geolocation' in navigator`, so the property
    // must be removed entirely (not just set undefined) between tests.
    // lib.dom's `Navigator.geolocation` isn't optional, so `delete` needs it
    // narrowed to a shape where it is.
    delete (navigator as { geolocation?: Geolocation }).geolocation
  })

  it('on an insecure origin, explains HTTPS is needed and never calls geolocation', async () => {
    setSecureContext(false)
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

    expect(await screen.findByText('Location needs a secure (HTTPS) connection')).toBeInTheDocument()
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('on a secure origin, requests the current position', () => {
    setSecureContext(true)
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

    expect(getCurrentPosition).toHaveBeenCalledOnce()
  })
})
