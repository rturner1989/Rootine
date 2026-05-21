import { useState } from 'react'
import Entries from './journal/Entries'
import Photos from './journal/Photos'
import FileTabs from './ui/FileTabs'

// Two tabs: the entries surface (List / Week / Month off one toggle — the
// old Timeline + Calendar tabs merged in TICKET-064) and Photos. Milestones
// still lands in its own ticket once it has real content — no empty shells.
const TABS = [
  { id: 'entries', label: 'Journal entries' },
  { id: 'photos', label: 'Photos' },
]

// The shared journal surface — entries + Photos tabs. /journal renders it
// across all plants (no plantId); Plant Detail renders the same component
// scoped to one plant (plantId set). Single source of truth for both
// surfaces. Uses FileTabs for the folder chrome.
//
// `fill` = occupy the parent's height and scroll the panel internally
// (the standalone /journal page, where the parent is viewport-bounded).
// Without it the panel sizes to content and the page scrolls — used for
// the Plant Detail embed, whose parent isn't height-bounded.
export default function Journal({ plantId = null, fill = false }) {
  const [tab, setTab] = useState('entries')
  const label = plantId ? 'Plant journal' : 'Journal'

  return (
    <FileTabs
      tabs={TABS}
      activeId={tab}
      onChange={setTab}
      label={label}
      className={fill ? 'flex flex-col flex-1 min-h-0' : ''}
    >
      <FileTabs.Panel className={`!shadow-none !p-0 flex flex-col ${fill ? 'flex-1 min-h-0 overflow-hidden' : ''}`}>
        {tab === 'entries' ? <Entries plantId={plantId} fill={fill} /> : <Photos plantId={plantId} fill={fill} />}
      </FileTabs.Panel>
    </FileTabs>
  )
}
