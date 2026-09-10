import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Card from '../../../src/components/ui/Card'

describe('Card', () => {
  it('renders children inside a bordered container', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies base classes (bg-card, rounded-md, border border-mint)', () => {
    const { container } = render(<Card>Content</Card>)
    const card = container.firstChild
    expect(card).toHaveClass('bg-card')
    expect(card).toHaveClass('rounded-md')
    expect(card).toHaveClass('border')
    expect(card).toHaveClass('border-mint')
  })

  it('does NOT bake in a shadow — elevation is a call-site choice', () => {
    const { container } = render(<Card>Content</Card>)
    const card = container.firstChild as HTMLElement
    expect(card.className).not.toContain('shadow-')
  })

  it('merges a user-provided className', () => {
    const { container } = render(<Card className="shadow-md">Content</Card>)
    const card = container.firstChild
    expect(card).toHaveClass('bg-card')
    expect(card).toHaveClass('shadow-md')
  })

  it('forwards kwargs (data-testid, id, etc.) to the root element', () => {
    render(
      <Card data-testid="my-card" id="login-card">
        Content
      </Card>,
    )
    const card = screen.getByTestId('my-card')
    expect(card).toHaveAttribute('id', 'login-card')
  })
})

describe('Card.Header', () => {
  it('renders children with a bottom border divider by default', () => {
    const { container } = render(<Card.Header>Title</Card.Header>)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('border-b')
    expect(container.firstChild).toHaveClass('border-mint')
  })

  it('drops the divider when divider={false}', () => {
    const { container } = render(<Card.Header divider={false}>Title</Card.Header>)
    expect(container.firstChild).not.toHaveClass('border-b')
    expect(container.firstChild).not.toHaveClass('border-mint')
  })

  it('merges a user-provided className', () => {
    const { container } = render(<Card.Header className="text-center">Title</Card.Header>)
    expect(container.firstChild).toHaveClass('text-center')
  })
})

describe('Card.Body', () => {
  it('renders children as the scrollable region', () => {
    const { container } = render(<Card.Body>Content</Card.Body>)
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('overflow-y-auto')
  })

  it('merges a user-provided className (e.g. space-y-4 for field stacks)', () => {
    const { container } = render(<Card.Body className="space-y-4">Content</Card.Body>)
    expect(container.firstChild).toHaveClass('space-y-4')
  })
})

describe('Card.Footer', () => {
  it('renders children with a top border divider by default', () => {
    const { container } = render(<Card.Footer>Actions</Card.Footer>)
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('border-t')
    expect(container.firstChild).toHaveClass('border-mint')
  })

  it('drops the divider when divider={false}', () => {
    const { container } = render(<Card.Footer divider={false}>Actions</Card.Footer>)
    expect(container.firstChild).not.toHaveClass('border-t')
    expect(container.firstChild).not.toHaveClass('border-mint')
  })
})

describe('Card compound usage', () => {
  it('renders Header + Body + Footer together in order', () => {
    render(
      <Card>
        <Card.Header>Log in</Card.Header>
        <Card.Body>Form fields</Card.Body>
        <Card.Footer>Submit button</Card.Footer>
      </Card>,
    )
    expect(screen.getByText('Log in')).toBeInTheDocument()
    expect(screen.getByText('Form fields')).toBeInTheDocument()
    expect(screen.getByText('Submit button')).toBeInTheDocument()
  })

  it('works with only Body (no header or footer)', () => {
    render(
      <Card>
        <Card.Body>Just content</Card.Body>
      </Card>,
    )
    expect(screen.getByText('Just content')).toBeInTheDocument()
  })
})
