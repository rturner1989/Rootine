import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Spinner from '../../../src/components/ui/Spinner'

describe('Spinner', () => {
  describe('accessibility', () => {
    it('exposes role="status" so assistive tech announces the loading region', () => {
      render(<Spinner />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has an aria-label of "Loading" so the role is announced meaningfully', () => {
      render(<Spinner />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading')
    })
  })

  describe('size', () => {
    it('defaults to md (32px circle, 3px border) for page/route fallbacks', () => {
      render(<Spinner />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('w-8')
      expect(spinner).toHaveClass('h-8')
      expect(spinner).toHaveClass('border-[3px]')
    })

    it('renders sm (16px circle, 2px border) for inline use inside buttons/inputs', () => {
      render(<Spinner size="sm" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('w-4')
      expect(spinner).toHaveClass('h-4')
      expect(spinner).toHaveClass('border-2')
    })
  })

  describe('appearance', () => {
    it('uses the leaf token for the spinning ring (transparent top arc creates the spin)', () => {
      render(<Spinner />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('border-leaf')
      expect(spinner).toHaveClass('border-t-transparent')
      expect(spinner).toHaveClass('rounded-full')
      expect(spinner).toHaveClass('animate-spin')
    })
  })

  describe('className', () => {
    it('merges a user-provided className alongside the size/colour classes', () => {
      render(<Spinner className="opacity-50" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('opacity-50')
      expect(spinner).toHaveClass('animate-spin')
    })
  })
})
