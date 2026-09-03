'use client'

import { useState } from 'react'
import { SITE_METADATA } from '~/data/site-metadata'

export function ProfileCard() {
  const [clickCount, setClickCount] = useState(0)

  const handleCopyClick = () => {
    if (clickCount === 0) {
      setClickCount(1)
      return
    }

    window.open('https://github.com/UFUN0220/ufunx', '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="home-profile-card home-ufun-profile-card" aria-label="个人资料卡片">
      <div className="home-ufun-heading">
        <h1 className="home-title-plain">放花千树</h1>
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
    </section>
  )
}
