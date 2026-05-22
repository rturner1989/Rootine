import { createContext, useContext, useId, useRef } from 'react'
import Action from './Action'

// Active tab connects to its panel via a 2px paper-seam — a paper-bg
// overlay bridging the active tab's bottom border to the panel's top
// edge. Restyle with care: removing the seam breaks the manila-folder
// affordance.

const FileTabsContext = createContext(null)

function useFileTabsContext() {
  const value = useContext(FileTabsContext)
  if (!value) throw new Error('FileTabs.Panel must be used inside <FileTabs>')
  return value
}

export default function FileTabs({ tabs = [], activeId, onChange, label, className = '', children }) {
  const tabRefs = useRef([])
  const panelId = useId()
  const tabIdBase = useId()
  const tabIdFor = (tabKey) => `${tabIdBase}-tab-${tabKey}`

  function focusTab(index) {
    tabRefs.current[index]?.focus()
  }

  function handleKeyDown(event, index) {
    const total = tabs.length
    if (total === 0) return
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % total
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + total) % total
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = total - 1
    if (nextIndex == null) return
    event.preventDefault()
    onChange?.(tabs[nextIndex].id)
    focusTab(nextIndex)
  }

  return (
    <FileTabsContext.Provider value={{ panelId, activeTab: tabs.find((tab) => tab.id === activeId), tabIdFor }}>
      <div className={className}>
        <div role="tablist" aria-label={label} className="flex items-end gap-0.5 relative z-[2]">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeId
            return (
              <Action
                key={tab.id}
                id={tabIdFor(tab.id)}
                ref={(node) => {
                  tabRefs.current[index] = node
                }}
                variant="unstyled"
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onChange?.(tab.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={`relative px-3 py-2 sm:px-5 sm:py-[11px] font-display italic font-normal tracking-tight whitespace-nowrap border border-paper-edge border-b-0 rounded-t-md transition-colors flex-1 sm:flex-initial sm:flex-none text-[12px] sm:text-[15px] ${
                  isActive
                    ? 'bg-paper text-ink shadow-[inset_0_2px_0_rgba(255,255,255,0.4)] after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-px after:h-0.5 after:bg-paper'
                    : 'bg-paper-deep text-ink-soft hover:text-ink shadow-[inset_0_2px_0_rgba(255,255,255,0.4)]'
                }`}
              >
                {tab.label}
                {tab.count != null && (
                  <span
                    className={`inline-block ml-1.5 px-1.5 py-px rounded-full text-[10px] font-extrabold not-italic font-sans ${
                      isActive ? 'bg-mint text-emerald' : 'bg-paper text-ink-softer'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Action>
            )
          })}
        </div>
        {children}
      </div>
    </FileTabsContext.Provider>
  )
}

function Panel({ className = '', children }) {
  const { panelId, activeTab, tabIdFor } = useFileTabsContext()
  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={activeTab ? tabIdFor(activeTab.id) : undefined}
      className={`relative bg-paper border border-paper-edge rounded-tr-md rounded-b-md p-6 shadow-warm-md ${className}`}
    >
      {children}
    </div>
  )
}

FileTabs.Panel = Panel
