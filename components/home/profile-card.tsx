'use client'

import { useState } from 'react'
import { SITE_METADATA } from '~/data/site-metadata'
import { WidgetShell } from './widget-shell'

export function ProfileCard({ layout = 'desktop' }: { layout?: 'desktop' | 'flow' }) {
  const [clickCount, setClickCount] = useState(0)

  const handleCopyClick = () => {
    if (clickCount === 0) {
      setClickCount(1)
      return
    }

    window.open('https://github.com/UFUN0220/ufunx', '_blank', 'noopener,noreferrer')
  }

  return (
    <WidgetShell widget="profile" label="uFun profile" layout={layout}>
      <div className="home-profile-card home-ufun-profile-card">
        <div className="home-ufun-heading">
          <span className="home-ufun-pre">uFun Pre</span>
          <h1>优雅的烧</h1>
        </div>

        <img className="home-avatar" src={SITE_METADATA.siteLogo} alt="uFun avatar" />

        <div className="home-copy-action">
          {clickCount === 1 ? (
            <div className="home-copy-bubble" role="status">
              嗯嗯啊啊～
            </div>
          ) : null}
          <button type="button" onClick={handleCopyClick}>
            {clickCount === 0 ? '抄似我' : '去GitHub'}
          </button>
        </div>

        <p className="home-support-copy">
          请我吃 葡式蛋挞6只+吮指原味鸡4块 (三角) 起或 V我50 起*
        </p>
      </div>
    </WidgetShell>
  )
}
