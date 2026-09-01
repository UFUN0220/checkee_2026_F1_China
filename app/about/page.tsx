import { genPageMetadata } from '~/app/seo'
import { CheckmateExperience } from '~/components/checkmate/checkmate-experience'
import type { CheckmateSnapshot, HallSnapshot } from '~/data/checkmate/types'
import checkeeSnapshotJson from '~/json/checkmate/checkee-static-snapshot.json'
import hallSnapshotJson from '~/json/checkmate/page2-static-snapshot.json'
import { Suspense } from 'react'

export const metadata = genPageMetadata({ title: 'Check' })

const checkeeSnapshot = checkeeSnapshotJson as CheckmateSnapshot
const hallSnapshot = hallSnapshotJson as HallSnapshot

export default function AboutPage() {
  return (
    <div className="site-container">
      <Suspense fallback={null}>
        <CheckmateExperience checkeeSnapshot={checkeeSnapshot} hallSnapshot={hallSnapshot} />
      </Suspense>
    </div>
  )
}
