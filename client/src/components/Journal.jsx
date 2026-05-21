import { useState } from 'react'
import Calendar from './journal/Calendar'
import Photos from './journal/Photos'
import Timeline from './journal/Timeline'
import FileTabs from './ui/FileTabs'

// Timeline + Photos + Calendar. Milestones still lands in its own ticket
// once it has real content — no empty shells (the rule that kept the
// Timeline tab-less when it first shipped, and the Calendar absent until
// it had a month grid to show).
const TABS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'photos', label: 'Photos' },
  { id: 'calendar', label: 'Calendar' },
]

// The shared journal surface — Timeline + Photos tabs. /journal renders
// it across all plants (no plantId); Plant Detail renders the same
// component scoped to one plant (plantId set). Single source of truth
// for both surfaces. Uses FileTabs for the folder chrome.
//
// `fill` = occupy the parent's height and scroll the panel internally
// (the standalone /journal page, where the parent is viewport-bounded).
// Without it the panel sizes to content and the page scrolls — used for
// the Plant Detail embed, whose parent isn't height-bounded.
export default function Journal({ plantId = null, fill = false }) {
  const [tab, setTab] = useState('timeline')
  const label = plantId ? 'Plant journal' : 'Journal'

  function renderTab() {
    if (tab === 'timeline') return <Timeline plantId={plantId} fill={fill} />
    if (tab === 'photos') return <Photos plantId={plantId} fill={fill} />
    return <Calendar plantId={plantId} fill={fill} />
  }

  return (
    <FileTabs
      tabs={TABS}
      activeId={tab}
      onChange={setTab}
      label={label}
      className={fill ? 'flex flex-col flex-1 min-h-0' : ''}
    >
      <FileTabs.Panel className={`!shadow-none !p-0 flex flex-col ${fill ? 'flex-1 min-h-0 overflow-hidden' : ''}`}>
        {renderTab()}
      </FileTabs.Panel>
    </FileTabs>
  )
}
