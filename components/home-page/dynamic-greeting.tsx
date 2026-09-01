'use client'

import { useEffect, useState } from 'react'

function getGreeting(hour: number) {
  if (hour < 5) return 'Hello, night owl'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DynamicGreeting() {
  const [greeting, setGreeting] = useState('Hello from St. Louis')

  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()))
  }, [])

  return <span aria-live="polite">{greeting}</span>
}
