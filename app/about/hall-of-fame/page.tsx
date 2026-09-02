import { Suspense } from 'react'
import { genPageMetadata } from '~/app/seo'
import { CheckmatePage } from '~/components/checkmate/checkmate-page'
import { PageTheme } from '~/components/ui/page-theme'

export const metadata = genPageMetadata({ title: 'Hall of Fame' })

export default function HallOfFamePage() {
  return (
    <PageTheme theme="check">
      <div className="about-page">
        <div className="site-container">
          <Suspense fallback={null}>
            <CheckmatePage view="peers" />
          </Suspense>
        </div>
      </div>
    </PageTheme>
  )
}
