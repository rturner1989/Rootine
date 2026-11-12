import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DangerZone from '../../../src/components/me/DangerZone'

describe('DangerZone', () => {
  it('warns that changing the password signs out other devices', () => {
    render(<DangerZone onChangePassword={() => {}} onDeleteAccount={() => {}} />)

    expect(screen.getByText(/Changing your password signs out your other devices\./)).toBeInTheDocument()
  })
})
