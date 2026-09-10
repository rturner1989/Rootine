import Journal from '../components/Journal'
import PageHeader from '../components/ui/PageHeader'

export default function JournalPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-5 lg:gap-7 px-3 lg:px-6 py-4 lg:py-6 overflow-x-hidden">
      <PageHeader className="shrink-0" eyebrow="Your journal" compactMobile>
        Everything that has <em className="text-emerald">happened</em>
      </PageHeader>
      <Journal fill />
    </div>
  )
}
