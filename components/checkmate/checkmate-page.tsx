import checkeeSnapshotJson from '~/json/checkmate/checkee-static-snapshot.json'
import checkeeDatasetJson from '~/data/checkmate/ufun_checkee_pure_processed.json'
import type { CheckeeDataset, CheckmateSnapshot } from '~/data/checkmate/types'
import { CheckmateExperience, type CheckmateView } from './checkmate-experience'

const checkeeSnapshot = checkeeSnapshotJson as CheckmateSnapshot
const checkeeDataset = checkeeDatasetJson as CheckeeDataset

export function CheckmatePage({ view }: { view: CheckmateView }) {
  return <CheckmateExperience checkeeSnapshot={checkeeSnapshot} checkeeDataset={checkeeDataset} view={view} />
}
