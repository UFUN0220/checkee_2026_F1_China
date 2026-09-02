'use client'

import { useEffect, useState } from 'react'

const VIEW_DEDUPE_WINDOW_MS = 1_000
const recentViewClaims = new Map<string, ReturnType<typeof setTimeout>>()

function claimView(slug: string) {
  if (recentViewClaims.has(slug)) return false

  const timer = setTimeout(() => recentViewClaims.delete(slug), VIEW_DEDUPE_WINDOW_MS)
  recentViewClaims.set(slug, timer)
  return true
}

export function ViewsCounter({
  slug,
  className,
  trackView = true, // 默认开启计数。如果在博客列表页只展示不计数，可传 false
}: {
  type?: string
  slug: string
  className?: string
  trackView?: boolean
}) {
  const [views, setViews] = useState<number | null>(null)

  useEffect(() => {
    const fetchViews = async () => {
      try {
        // 核心逻辑：
        // trackView = true -> POST 请求 -> Redis incr (+1) 并返回新值
        // trackView = false -> GET 请求 -> Redis get (不增加) 只返回当前值
        const method = trackView ? 'POST' : 'GET'
        if (trackView && !claimView(slug)) return
        
        const res = await fetch(`/api/views/${slug}`, { 
          method,
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (res.ok) {
          const data = await res.json()
          setViews(data.views)
        }
      } catch (error) {
        console.error('Error updating/fetching views:', error)
      }
    }

    fetchViews()
  }, [slug, trackView])

  return (
    <span className={className}>
      {views === null ? '' : `${views.toLocaleString()} views`}
    </span>
  )
}
