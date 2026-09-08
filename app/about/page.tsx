import { redirect } from 'next/navigation'
import { genPageMetadata } from '~/app/seo'
import { ProfileCard } from '~/components/home/profile-card'

export const metadata = genPageMetadata({ title: 'UFUN' })

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  if (params.view === 'peers') redirect('/')

  return (
    <div className="personal-home-page">
      <ProfileCard />
    </div>
  )
}
