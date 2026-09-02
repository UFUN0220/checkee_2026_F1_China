'use client'

import { Logo } from '~/components/header/logo'
import { SITE_METADATA } from '~/data/site-metadata'

export function LogoAndRepo() {
  return (
    <div className="flex items-center">
      <Logo className="mr-4" />
      <div className="flex flex-col items-center gap-2 font-sans text-xl font-bold">
        {SITE_METADATA.headerTitle}
      </div>
    </div>
  )
}
