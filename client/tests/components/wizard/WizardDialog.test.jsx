import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WizardDialog from '../../../src/components/wizard/WizardDialog'

function renderWizard(overrides = {}) {
  const props = {
    onComplete: vi.fn().mockResolvedValue({ id: 7 }),
    completion: null,
    showProgress: true,
    step1CanContinue: true,
    onClose: vi.fn(),
    ...overrides,
  }
  render(
    <WizardDialog
      open
      onClose={props.onClose}
      title="Test wizard"
      showProgress={props.showProgress}
      steps={[
        { title: 'Step one', canContinue: props.step1CanContinue, content: () => <p>step one body</p> },
        { title: 'Step two', continueLabel: 'Finish', content: () => <p>step two body</p> },
      ]}
      onComplete={props.onComplete}
      completion={props.completion}
    />,
  )
  return props
}

const continueBtn = () => screen.getByRole('button', { name: /Continue/ })

describe('WizardDialog', () => {
  it('renders the first step with a progress strip', () => {
    renderWizard()
    expect(screen.getByText('Step one')).toBeInTheDocument()
    expect(screen.getByText('step one body')).toBeInTheDocument()
    expect(document.querySelector('[role="presentation"]')).not.toBeNull()
  })

  it('Continue advances to the next step; Back returns', async () => {
    renderWizard()
    fireEvent.click(continueBtn())
    expect(await screen.findByText('step two body')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Back/ }))
    expect(await screen.findByText('step one body')).toBeInTheDocument()
  })

  it('disables Continue when the step gates it', () => {
    renderWizard({ step1CanContinue: false })
    expect(continueBtn()).toBeDisabled()
  })

  it('runs onComplete on the final step and shows the completion screen on success', async () => {
    const onComplete = vi.fn().mockResolvedValue({ id: 7 })
    renderWizard({ onComplete, completion: (result) => <p>done {result.id}</p> })
    fireEvent.click(continueBtn())
    fireEvent.click(screen.getByRole('button', { name: /Finish/ }))
    expect(onComplete).toHaveBeenCalledOnce()
    expect(await screen.findByText('done 7')).toBeInTheDocument()
  })

  it('stays on the final step when onComplete returns null (aborted)', async () => {
    const onComplete = vi.fn().mockResolvedValue(null)
    renderWizard({ onComplete, completion: () => <p>should not show</p> })
    fireEvent.click(continueBtn())
    fireEvent.click(screen.getByRole('button', { name: /Finish/ }))
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
    expect(screen.queryByText('should not show')).toBeNull()
    expect(await screen.findByText('step two body')).toBeInTheDocument()
  })

  it('omits the progress strip when showProgress is false', () => {
    renderWizard({ showProgress: false })
    expect(document.querySelector('[role="presentation"]')).toBeNull()
  })
})
