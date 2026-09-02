import { genPageMetadata } from '~/app/seo'
import { redirect } from 'next/navigation'
import { CheckmatePage } from '~/components/checkmate/checkmate-page'
import { PageTheme } from '~/components/ui/page-theme'
import { Suspense } from 'react'

export const metadata = genPageMetadata({ title: 'Check' })

export default async function AboutPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams
  if (params.view === 'peers') redirect('/about/hall-of-fame')

  return (
    <PageTheme theme="check">
      <div className="about-page">
        <div className="site-container">
          <Suspense fallback={null}>
            <CheckmatePage view="cities" />
          </Suspense>
        </div>
      </div>
    </PageTheme>
  )
}
