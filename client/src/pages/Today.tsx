import { useState } from 'react'
import Highlights from '../components/today/Highlights'
import PlantsRow from '../components/today/PlantsRow'
import StartJungleDialog from '../components/today/StartJungleDialog'
import TodayHeader from '../components/today/TodayHeader'
import WeatherWidget from '../components/today/WeatherWidget'
import WeekCard from '../components/today/week/WeekCard'
import Action from '../components/ui/Action'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/errors/ErrorState'
import Spinner from '../components/ui/Spinner'
import { useAddPlant } from '../hooks/useAddPlant'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import { usePlants } from '../hooks/usePlants'

function todayIso() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export default function Today() {
  const { user } = useAuth()
  const { open: openAddPlant } = useAddPlant()
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [jungleWizardOpen, setJungleWizardOpen] = useState(false)
  const isToday = selectedDate === todayIso()

  // Pass undefined for today so we share the cache key with other consumers
  // of useDashboard. Only future-day previews carry the date param.
  const { data, isLoading, error, refetch } = useDashboard(isToday ? undefined : selectedDate)
  const { data: plants = [] } = usePlants()

  const tasks = data?.tasks ?? []
  const tasksByDay = data?.tasks_by_day ?? {}
  const totalPlants = data?.stats?.total_plants ?? 0
  const totalSpaces = data?.stats?.total_spaces ?? 0
  const firstName = user?.name?.split(' ')[0]
  const noPlants = totalPlants === 0
  const noSpaces = totalSpaces === 0

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading your plants"
        className="flex-1 flex items-center justify-center min-h-dvh"
      >
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        scheme="500"
        title={
          <>
            Something <em>wobbled</em> on our end
          </>
        }
        description="We couldn't fetch your plants. Try again, or head back home."
        actions={[
          <Action key="retry" type="button" variant="primary" onClick={() => refetch()}>
            Try again
          </Action>,
        ]}
      />
    )
  }

  function renderBody() {
    if (noSpaces) {
      return (
        <EmptyState
          tone="sunshine"
          icon={<span>🏠</span>}
          title={
            <>
              Start your <em>jungle</em>
            </>
          }
          description="A space, a plant, and you're off. We'll walk you through it."
          actions={
            <Action onClick={() => setJungleWizardOpen(true)} variant="primary">
              Get started
            </Action>
          }
        />
      )
    }

    if (noPlants) {
      return (
        <EmptyState
          tone="mint"
          icon={<span>🌱</span>}
          title={
            <>
              Your jungle <em>starts here</em>
            </>
          }
          description="Add a plant to see it come alive."
          actions={
            <Action onClick={() => openAddPlant()} variant="primary">
              Add a plant
            </Action>
          }
        />
      )
    }

    return (
      <div className="flex flex-col gap-4 lg:gap-5 min-w-0">
        <WeatherWidget variant="strip" />
        <Highlights data={data} />
        <WeekCard
          tasks={tasks}
          plants={plants}
          tasksByDay={tasksByDay}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          isLoading={isLoading}
          isToday={isToday}
        />
        <PlantsRow plants={plants} spacesCount={totalSpaces} />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 gap-4 lg:gap-6 px-3 lg:px-6 py-4 lg:py-6 overflow-x-hidden">
      <TodayHeader firstName={firstName} />
      {renderBody()}
      <StartJungleDialog open={jungleWizardOpen} onClose={() => setJungleWizardOpen(false)} />
    </div>
  )
}
