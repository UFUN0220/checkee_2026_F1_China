import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { genPageMetadata } from '~/app/seo'
import { CheckmatePage } from '~/components/checkmate/checkmate-page'
import { PageTheme } from '~/components/ui/page-theme'

export const metadata = genPageMetadata({ title: '白宫严选' })

export default async function ViewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  if (params.view === 'peers') redirect('/')

  return (
    <PageTheme theme="view">
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
