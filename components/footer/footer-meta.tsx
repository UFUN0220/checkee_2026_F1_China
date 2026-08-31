'use client'

import { GitBranch } from 'lucide-react'
import { Link } from '~/components/ui/link'
import { SITE_METADATA } from '~/data/site-metadata'

export function FooterMeta() {
  const siteRepo = SITE_METADATA.siteRepo.replace('https://github.com/', '')
  const repoName = siteRepo.split('/')[1]

  return (
    <div className="space-y-2 py-1.5 text-gray-800 dark:text-gray-200">
      <div className="flex items-center gap-1 font-medium">
        <GitBranch className="h-5 w-5" />
        <Link href={SITE_METADATA.siteRepo} className="ml-1">
          {repoName}
        </Link>
      </div>
    </div>
  )
}
