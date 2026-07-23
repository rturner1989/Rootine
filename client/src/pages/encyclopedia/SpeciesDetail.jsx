import { useParams, useSearchParams } from 'react-router-dom'
import CommunityStats from '../../components/encyclopedia/CommunityStats'
import SpeciesImage from '../../components/encyclopedia/SpeciesImage'
import SpeciesView from '../../components/plants/SpeciesView'
import Action from '../../components/ui/Action'
import Breadcrumb from '../../components/ui/Breadcrumb'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import { useSpecies } from '../../hooks/useSpecies'

export default function SpeciesDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()

  // Arrived from a Perenual search result (the /lookup route): fetch by
  // perenual_id, passing the search-summary fields as a render fallback.
  const perenualId = searchParams.get('perenual_id')
  const fallback = perenualId
    ? {
        common_name: searchParams.get('common_name') ?? '',
        scientific_name: searchParams.get('scientific_name') ?? '',
        image_url: searchParams.get('image_url') ?? '',
      }
    : null

  const { data: species, isPending, isError } = useSpecies(id, { perenualId, fallback })

  function renderBody() {
    if (isPending) return <Spinner />

    if (isError || !species) {
      // EmptyState carries the page's only heading here — promote it to h1
      // so the not-found route isn't headingless.
      return (
        <EmptyState
          headingLevel="h1"
          icon={<span>🪴</span>}
          title="Species not found"
          description="We couldn't find that plant in the encyclopedia."
          actions={
            <Action variant="secondary" to="/encyclopedia">
              Back to browse
            </Action>
          }
        />
      )
    }

    // PageHeader emits the page h1 (the species name), matching Today/House/
    // Plant. Without it the page's top heading would be SpeciesView's h2 —
    // a skipped level and no document-level title (WCAG 1.3.1 / 2.4.6).
    return (
      <>
        <Breadcrumb items={[{ label: 'Encyclopedia', to: '/encyclopedia' }, { label: species.common_name }]} />
        <PageHeader eyebrow="Encyclopedia" compactMobile>
          {species.common_name}
        </PageHeader>
        <SpeciesView
          species={species}
          media={<SpeciesImage imageUrl={species.image_url} className="w-full max-h-[300px] aspect-[2.4]" />}
        />
        <CommunityStats community={species.community} />
      </>
    )
  }

  return <div className="flex flex-col gap-6 lg:gap-8 px-3 lg:px-6 py-4 lg:py-6">{renderBody()}</div>
}
