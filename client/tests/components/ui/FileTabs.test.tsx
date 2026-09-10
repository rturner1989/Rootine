import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import FileTabs from '../../../src/components/ui/FileTabs'

const TABS = [
  { id: 'timeline', label: 'Timeline', count: 12 },
  { id: 'photos', label: 'Photos', count: 4 },
  { id: 'milestones', label: 'Milestones' },
  { id: 'schedule', label: 'Schedule' },
]

function Harness({ initialId = 'timeline' }) {
  const [activeId, setActiveId] = useState(initialId)
  return (
    <FileTabs tabs={TABS} activeId={activeId} onChange={setActiveId} label="Journal sections">
      <FileTabs.Panel>Panel for {activeId}</FileTabs.Panel>
    </FileTabs>
  )
}

describe('FileTabs', () => {
  describe('rendering', () => {
    it('renders all tabs as role=tab', () => {
      render(<Harness />)
      expect(screen.getAllByRole('tab')).toHaveLength(4)
    })

    it('marks the activeId tab as aria-selected', () => {
      render(<Harness initialId="photos" />)
      expect(screen.getByRole('tab', { name: /Photos/ })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: /Timeline/ })).toHaveAttribute('aria-selected', 'false')
    })

    it('exposes counts on tabs that carry them', () => {
      render(<Harness />)
      expect(screen.getByRole('tab', { name: /Timeline/ }).textContent).toMatch(/12/)
      expect(screen.getByRole('tab', { name: /Schedule/ }).textContent).not.toMatch(/\d/)
    })

    it('renders a tabpanel labelled by the strip with the panel content', () => {
      render(<Harness />)
      const panel = screen.getByRole('tabpanel')
      expect(panel).toHaveTextContent('Panel for timeline')
    })
  })

  describe('activation', () => {
    it('clicking a tab fires onChange with that id', () => {
      const onChange = vi.fn()
      render(
        <FileTabs tabs={TABS} activeId="timeline" onChange={onChange}>
          <FileTabs.Panel>panel</FileTabs.Panel>
        </FileTabs>,
      )
      fireEvent.click(screen.getByRole('tab', { name: /Photos/ }))
      expect(onChange).toHaveBeenCalledWith('photos')
    })
  })

  describe('keyboard nav (APG tablist)', () => {
    it('ArrowRight cycles to the next tab', () => {
      render(<Harness />)
      const timeline = screen.getByRole('tab', { name: /Timeline/ })
      timeline.focus()
      fireEvent.keyDown(timeline, { key: 'ArrowRight' })
      expect(screen.getByRole('tab', { name: /Photos/ })).toHaveAttribute('aria-selected', 'true')
    })

    it('ArrowLeft from the first tab wraps to the last', () => {
      render(<Harness />)
      const timeline = screen.getByRole('tab', { name: /Timeline/ })
      timeline.focus()
      fireEvent.keyDown(timeline, { key: 'ArrowLeft' })
      expect(screen.getByRole('tab', { name: /Schedule/ })).toHaveAttribute('aria-selected', 'true')
    })

    it('Home jumps to the first tab', () => {
      render(<Harness initialId="schedule" />)
      const schedule = screen.getByRole('tab', { name: /Schedule/ })
      schedule.focus()
      fireEvent.keyDown(schedule, { key: 'Home' })
      expect(screen.getByRole('tab', { name: /Timeline/ })).toHaveAttribute('aria-selected', 'true')
    })

    it('End jumps to the last tab', () => {
      render(<Harness />)
      const timeline = screen.getByRole('tab', { name: /Timeline/ })
      timeline.focus()
      fireEvent.keyDown(timeline, { key: 'End' })
      expect(screen.getByRole('tab', { name: /Schedule/ })).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('roving tabindex', () => {
    it('only the active tab is in the tab order', () => {
      render(<Harness />)
      expect(screen.getByRole('tab', { name: /Timeline/ })).toHaveAttribute('tabindex', '0')
      expect(screen.getByRole('tab', { name: /Photos/ })).toHaveAttribute('tabindex', '-1')
    })
  })

  describe('panel error', () => {
    it('throws if Panel is used outside <FileTabs>', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => render(<FileTabs.Panel>orphan</FileTabs.Panel>)).toThrow(
        /FileTabs.Panel must be used inside <FileTabs>/,
      )
      errorSpy.mockRestore()
    })
  })
})
