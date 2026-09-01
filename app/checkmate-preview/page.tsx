import { Suspense } from 'react'
import { CheckmateExperience } from '~/components/checkmate/checkmate-experience'
import type { CheckmateSnapshot, HallSnapshot } from '~/data/checkmate/types'
import checkeeSnapshotJson from '~/json/checkmate/checkee-static-snapshot.json'
import hallSnapshotJson from '~/json/checkmate/page2-static-snapshot.json'
import { genPageMetadata } from '../seo'

export const metadata = genPageMetadata({
  title: 'Checkmate Preview',
  description: 'Checkmate F-1 public-sample integration preview.',
  robots: { index: false, follow: false },
})

const checkeeSnapshot = checkeeSnapshotJson as CheckmateSnapshot
const hallSnapshot = hallSnapshotJson as HallSnapshot

export default function CheckmatePreviewPage() {
  return (
    <div className="site-container">
      <Suspense fallback={null}>
        <CheckmateExperience checkeeSnapshot={checkeeSnapshot} hallSnapshot={hallSnapshot} />
      </Suspense>
    </div>
  )
}
