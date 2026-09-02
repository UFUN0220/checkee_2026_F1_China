'use client'

import React, { useEffect, useState } from 'react'

interface IconProps {
  className?: string
}

interface SvgIconProps extends IconProps {
  src: string
  alt: string
}

export const MailIcon: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    className={`h-8 w-8 text-gray-700 transition-colors group-hover:text-blue-600 dark:text-gray-300 dark:group-hover:text-blue-400 ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
)

export const GithubIcon: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    className={`h-8 w-8 text-gray-700 transition-colors group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100 ${className}`}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026a9.564 9.564 0 012.578-.337c.84.03 1.724.117 2.578.337 1.91-.896 2.75-1.026 2.75-1.026.545 1.378.203 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.841-2.339 4.695-4.566 4.943.359.31.678.921.678 1.852 0 1.338-.012 2.419-.012 2.747 0 .268.18.574.688.481A10.019 10.000 0 0022 12.017C22 6.484 17.523 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
)

export const LinkedinBoxIcon: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    className={`h-8 w-8 text-gray-700 transition-colors group-hover:text-[#0A66C2] dark:text-gray-300 dark:group-hover:text-[#0A66C2] ${className}`}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
)

export const SteamIcon: React.FC<SvgIconProps> = ({ src, alt, className = '' }) => (
  <img src={src} alt={alt} className={`h-6 w-6 ${className}`} draggable={false} />
)

export const HearthstoneIcon: React.FC<SvgIconProps> = ({ src, alt, className = '' }) => (
  <img src={src} alt={alt} className={`h-7 w-7 ${className}`} draggable={false} />
)

function CopyContactButton({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyValue() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const copiedByFallback = document.execCommand('copy')
        textarea.remove()
        if (!copiedByFallback) throw new Error('Clipboard fallback failed')
      }
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="group relative flex items-center justify-center">
      <button
        type="button"
        aria-label={`复制${label}`}
        onClick={copyValue}
        className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-500 dark:hover:bg-white/8"
      >
        {children}
      </button>
      <span
        className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-600"
        role="status"
        aria-live="polite"
      >
        {copied ? '已复制' : value}
      </span>
    </div>
  )
}

interface IconGroupProps {
  className?: string
}

export const IconGroup: React.FC<IconGroupProps> = ({ className = '' }) => {
  const paths = {
    hearthstone: '/static/images/hearthstone.svg',
    steam: '/static/images/steam.svg',
  }

  return (
    <div className={`flex justify-center gap-3 ${className}`}>
      <div className="group relative flex items-center justify-center">
        <a
          href="mailto:ufun2026@gmail.com"
          aria-label="Email"
          className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-500 dark:hover:bg-white/8"
        >
          <MailIcon />
        </a>
        <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-600">
          ufun2026@gmail.com
        </span>
      </div>

      <div className="group relative flex items-center justify-center">
        <a
          href="https://github.com/UFUN0220"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-500 dark:hover:bg-white/8"
        >
          <GithubIcon />
        </a>
        <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-600">
          GitHub
        </span>
      </div>

      <div className="group relative flex items-center justify-center">
        <a
          href="https://www.linkedin.com/in/fangyou11/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-500 dark:hover:bg-white/8"
        >
          <LinkedinBoxIcon />
        </a>
        <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-600">
          LinkedIn
        </span>
      </div>

      <CopyContactButton label="战网 ID" value="文艺青年#51444">
        <HearthstoneIcon src={paths.hearthstone} alt="战网" />
      </CopyContactButton>

      <CopyContactButton label="Steam 好友代码" value="1168891614">
        <SteamIcon src={paths.steam} alt="Steam" />
      </CopyContactButton>
    </div>
  )
}

export default IconGroup
