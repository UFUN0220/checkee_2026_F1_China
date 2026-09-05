'use client'

import { useState } from 'react'
import { SITE_METADATA } from '~/data/site-metadata'

const GITHUB_URL = 'https://github.com/UFUN0220/checkee_2026_F1_China'

function GithubIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      focusable="false"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.084-.729.084-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.304.762-1.604-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.922.435.375.81 1.102.81 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

export function ProfileCard() {
  const [isGithub, setIsGithub] = useState(false)
  const [isGithubTransitioning, setIsGithubTransitioning] = useState(false)
  const [showCopyBubble, setShowCopyBubble] = useState(false)
  const [isFeedbackAnimating, setIsFeedbackAnimating] = useState(false)

  const handleCopyClick = () => {
    if (isFeedbackAnimating) return

    if (isGithub) {
      window.open(GITHUB_URL, '_blank', 'noopener,noreferrer')
      return
    }

    setShowCopyBubble(true)
    setIsGithubTransitioning(true)
    setIsFeedbackAnimating(true)
  }

  return (
    <section className="home-profile-card home-ufun-profile-card" aria-label="个人资料卡片">
      <div className="home-ufun-heading">
        <h1 className="home-title-plain">放花千树</h1>
      </div>

      <img className="home-avatar" src={SITE_METADATA.siteLogo} alt="uFun avatar" />

      <div className="home-copy-action">
        {showCopyBubble ? (
          <div
            className="home-copy-bubble"
            role="status"
            aria-live="polite"
            onAnimationEnd={() => {
              setShowCopyBubble(false)
              setIsGithub(true)
              setIsGithubTransitioning(false)
              setIsFeedbackAnimating(false)
            }}
          >
            嗯嗯啊啊
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleCopyClick}
          aria-label={isGithub ? '打开 GitHub 仓库' : '查看 GitHub'}
          data-github={isGithub ? 'true' : undefined}
          data-github-transitioning={isGithubTransitioning ? 'true' : undefined}
        >
          {isGithub ? (
            <span className="home-github-icon" aria-hidden="true">
              <GithubIcon />
            </span>
          ) : null}
          <span className="home-copy-label">{isGithub ? 'GitHub' : '抄似我'}</span>
        </button>
      </div>
      <p className="home-support-copy">
        她最后一次理我是在冬天，美签也是
        {/* 请我吃 葡式蛋挞6只+吮指原味鸡4块 起或 V我50 起* */}
      </p>

    </section>
  )
}
