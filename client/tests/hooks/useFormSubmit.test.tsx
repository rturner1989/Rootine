import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormEvent, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../src/context/ToastContext'
import { ValidationError } from '../../src/errors/ValidationError'
import { useFormSubmit } from '../../src/hooks/useFormSubmit'

// Wrapper with the real ToastProvider so useToast() inside the hook resolves
// cleanly. Tests that need to verify toast output query the DOM via screen.
function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

// handleSubmit only calls e.preventDefault() — the rest of FormEvent's shape
// (target, currentTarget, bubbles, ...) is irrelevant to what's under test.
function makeEvent(): FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>
}

describe('useFormSubmit', () => {
  describe('submit lifecycle', () => {
    it('calls e.preventDefault() to stop the browser form post', async () => {
      const action = vi.fn().mockResolvedValue(undefined)
      const event = makeEvent()
      const { result } = renderHook(() => useFormSubmit({ action }), { wrapper })

      await act(async () => {
        await result.current.handleSubmit(event)
      })

      expect(event.preventDefault).toHaveBeenCalledOnce()
    })

    it('calls the action with no arguments (consumer closes over form state)', async () => {
      const action = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useFormSubmit({ action }), { wrapper })

      await act(async () => {
        await result.current.handleSubmit(makeEvent())
      })

      expect(action).toHaveBeenCalledOnce()
      expect(action).toHaveBeenCalledWith()
    })

    it('flips submitting to true during the action and back to false after', async () => {
      let resolveAction: ((value?: unknown) => void) | undefined
      const action = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveAction = resolve
          }),
      )
      const { result } = renderHook(() => useFormSubmit({ action }), { wrapper })

      expect(result.current.submitting).toBe(false)

      let submitPromise: Promise<void> | undefined
      act(() => {
        submitPromise = result.current.handleSubmit(makeEvent())
      })

      await waitFor(() => expect(result.current.submitting).toBe(true))

      await act(async () => {
        resolveAction?.()
        await submitPromise
      })

      expect(result.current.submitting).toBe(false)
    })

    it('clears submitting even when the action throws', async () => {
      const action = vi.fn().mockRejectedValue(new Error('nope'))
      const { result } = renderHook(() => useFormSubmit({ action, errorMessage: 'Fail' }), { wrapper })

      await act(async () => {
        await result.current.handleSubmit(makeEvent())
      })

      expect(result.current.submitting).toBe(false)
    })
  })

  describe('onSuccess callback', () => {
    it('fires onSuccess after the action resolves', async () => {
      const action = vi.fn().mockResolvedValue(undefined)
      const onSuccess = vi.fn()
      const { result } = renderHook(() => useFormSubmit({ action, onSuccess }), { wrapper })

      await act(async () => {
        await result.current.handleSubmit(makeEvent())
      })

      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('does not fire onSuccess when the action throws', async () => {
      const action = vi.fn().mockRejectedValue(new Error('nope'))
      const onSuccess = vi.fn()
      const { result } = renderHook(() => useFormSubmit({ action, onSuccess, errorMessage: 'Fail' }), { wrapper })

      await act(async () => {
        await result.current.handleSubmit(makeEvent())
      })

      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('toast integration', () => {
    // For toast tests, render a real form inside ToastProvider so the toast
    // container mounts — then query the DOM for the toast message.
    function TestForm({
      action,
      successMessage,
      errorMessage,
      onSuccess,
    }: {
      action: () => Promise<unknown>
      successMessage?: string
      errorMessage?: string
      onSuccess?: () => void
    }) {
      const { handleSubmit } = useFormSubmit({ action, successMessage, errorMessage, onSuccess })
      return (
        <form onSubmit={handleSubmit}>
          <button type="submit">submit</button>
        </form>
      )
    }

    it('shows a success toast with the provided successMessage on success', async () => {
      const action = vi.fn().mockResolvedValue(undefined)
      render(
        <ToastProvider>
          <TestForm action={action} successMessage="Saved!" />
        </ToastProvider>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'submit' }))
      expect(await screen.findByText('Saved!')).toBeInTheDocument()
    })

    it('does not show a success toast when successMessage is omitted', async () => {
      const action = vi.fn().mockResolvedValue(undefined)
      const onSuccess = vi.fn()
      render(
        <ToastProvider>
          <TestForm action={action} onSuccess={onSuccess} />
        </ToastProvider>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'submit' }))
      await waitFor(() => expect(onSuccess).toHaveBeenCalled())

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows an error toast with the thrown error message when the action fails', async () => {
      const action = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
      render(
        <ToastProvider>
          <TestForm action={action} errorMessage="Login failed" />
        </ToastProvider>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'submit' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
    })

    it('falls back to errorMessage when the thrown error has no message', async () => {
      const action = vi.fn().mockRejectedValue(new Error())
      render(
        <ToastProvider>
          <TestForm action={action} errorMessage="Login failed" />
        </ToastProvider>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'submit' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Login failed')
    })
  })

  describe('ValidationError handling', () => {
    it('routes a ValidationError into fieldErrors instead of the toast', async () => {
      const action = vi.fn().mockRejectedValue(new ValidationError({ email: 'has already been taken' }))
      const { result } = renderHook(() => useFormSubmit({ action, errorMessage: 'Registration failed' }), { wrapper })

      await act(async () => {
        await result.current.handleSubmit(makeEvent())
      })

      expect(result.current.fieldErrors).toEqual({ email: 'has already been taken' })
    })

    it('does NOT fire a toast for ValidationErrors — the inline UI already speaks for them', async () => {
      const action = vi.fn().mockRejectedValue(new ValidationError({ email: 'has already been taken' }))

      function NoToastTestForm() {
        const { handleSubmit } = useFormSubmit({ action, errorMessage: 'Registration failed' })
        return (
          <form onSubmit={handleSubmit}>
            <button type="submit">submit</button>
          </form>
        )
      }

      render(
        <ToastProvider>
          <NoToastTestForm />
        </ToastProvider>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'submit' }))
      await waitFor(() => expect(action).toHaveBeenCalled())

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('clears previous fieldErrors at the start of each submit', async () => {
      let shouldFail = true
      const action = vi.fn(() => {
        if (shouldFail) {
          throw new ValidationError({ email: 'has already been taken' })
        }
        return Promise.resolve()
      })
      const { result } = renderHook(() => useFormSubmit({ action }), { wrapper })

      // First submit — validation failure populates fieldErrors
      await act(async () => {
        await result.current.handleSubmit(makeEvent())
      })
      expect(result.current.fieldErrors).toEqual({ email: 'has already been taken' })

      // Second submit — action succeeds, fieldErrors should have been cleared
      shouldFail = false
      await act(async () => {
        await result.current.handleSubmit(makeEvent())
      })
      expect(result.current.fieldErrors).toEqual({})
    })

    it('exposes a formRef the consumer attaches to the <form> element', () => {
      const action = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useFormSubmit({ action }), { wrapper })
      expect(result.current.formRef).toBeDefined()
      expect(result.current.formRef.current).toBeNull() // not yet attached in a renderHook context
    })

    it('focuses the first aria-invalid input inside formRef after a ValidationError', async () => {
      const action = vi.fn().mockRejectedValue(
        new ValidationError({
          email: 'has already been taken',
          passwordConfirmation: "doesn't match Password",
        }),
      )

      function FocusTestForm() {
        const { handleSubmit, fieldErrors, formRef } = useFormSubmit({ action })
        return (
          <form ref={formRef} onSubmit={handleSubmit}>
            <input aria-label="email" aria-invalid={fieldErrors.email ? 'true' : undefined} />
            <input
              aria-label="passwordConfirmation"
              aria-invalid={fieldErrors.passwordConfirmation ? 'true' : undefined}
            />
            <button type="submit">submit</button>
          </form>
        )
      }

      render(
        <ToastProvider>
          <FocusTestForm />
        </ToastProvider>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'submit' }))

      // The email input is the first aria-invalid child, so focus should land there
      await waitFor(() => {
        expect(screen.getByLabelText('email')).toHaveFocus()
      })
    })
  })
})
