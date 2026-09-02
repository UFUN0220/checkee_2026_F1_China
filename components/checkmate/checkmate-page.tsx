import checkeeSnapshotJson from '~/json/checkmate/checkee-static-snapshot.json'
import hallSnapshotJson from '~/json/checkmate/page2-static-snapshot.json'
import type { CheckmateSnapshot, HallSnapshot } from '~/data/checkmate/types'
import { CheckmateExperience, type CheckmateView } from './checkmate-experience'

const checkeeSnapshot = checkeeSnapshotJson as CheckmateSnapshot
const hallSnapshot = hallSnapshotJson as HallSnapshot

export function CheckmatePage({ view }: { view: CheckmateView }) {
  return <CheckmateExperience checkeeSnapshot={checkeeSnapshot} hallSnapshot={hallSnapshot} view={view} />
}
