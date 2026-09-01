'use client'

// 1. 引入新的图标：Rocket(火箭), Flame(火焰)
import { Bell, Flame, Heart, Rocket, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export function UrgeUpdate({ variant = 'default' }: { variant?: 'default' | 'home' }) {
  const [count, setCount] = useState(0)
  const [userClickCount, setUserClickCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const hasUrged = localStorage.getItem('hasUrged')
    // 如果以前点过，这里为了演示多状态，我们还是让它从 0 或者 1 开始
    // 如果你想保留用户的精确点击数，需要存 localStorage 具体数字，这里简化处理设为 1
    if (hasUrged) {
      setUserClickCount(0)
    }

    async function fetchCount() {
      try {
        const res = await fetch('/api/urge')
        if (!res.ok) return
        const data = await res.json()
        setCount(data.count || 0)
      } catch (error) {
        console.error('获取催更数据失败', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCount()
  }, [])

  const handleUrge = async () => {
    if (isLoading) return

    setIsAnimating(true)
    setCount((prev) => prev + 1)
    setUserClickCount((prev) => prev + 1)

    if (userClickCount === 0) {
      localStorage.setItem('hasUrged', 'true')
    }

    setTimeout(() => setIsAnimating(false), 300)

    try {
      await fetch('/api/urge', { method: 'POST' })
    } catch (error) {
      console.error('催更失败', error)
    }
  }

  // 2. 定义不同阶段的状态配置
  const getButtonState = () => {
    switch (userClickCount) {
      case 0:
        return {
          text: '催更',
          // 红色：紧急
          colorClass:
            'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40',
          icon: <Bell className="h-8 w-8 group-hover:animate-wiggle" />,
          ping: true,
        }
      case 1:
        return {
          text: '在写了(づ｡◕‿‿◕｡)づ',
          // 绿色：安抚
          colorClass: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
          icon: <Sparkles className="h-8 w-8" />,
          ping: false,
        }
      case 2:
        return {
          text: '好啦别点了૮꒰ ˶• ༝ •˶꒱ა',
          // 紫色：神秘/科技感
          colorClass: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
          icon: <Rocket className="h-8 w-8 group-hover:animate-pulse" />,
          ping: false,
        }
      case 3:
        return {
          text: '点也没用૮₍˃⤙˂₎ა',
          // 橙色：警告/焦虑
          colorClass: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
          icon: <Flame className="h-8 w-8 animate-bounce" />, // 火焰跳动
          ping: false,
        }
      default:
        return {
          text: '那你点吧^⦁⩊⦁^ ੭',
          // 粉色：摆烂/爱心
          colorClass:
            'bg-pink-100 text-pink-500 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:hover:bg-pink-900/50',
          icon: <Heart className="h-8 w-8 animate-pulse fill-current" />,
          ping: false,
        }
    }
  }

  const currentState = getButtonState()

  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[1.25rem] border p-4 shadow transition-all hover:shadow-md dark:border-gray-600 ${variant === 'home' ? 'home-urge-content' : ''}`}
    >
      {/* <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        催更
      </h3> */}

      <button
        onClick={handleUrge}
        className={`group relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-full transition-all duration-500 ${currentState.colorClass} ${isAnimating ? 'scale-90' : 'hover:scale-110'} ${variant === 'home' ? 'home-urge-button' : ''}`}
      >
        {currentState.icon}

        {currentState.ping && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-20 duration-1000"></span>
        )}
      </button>

      <div className="home-urge-copy mt-3 flex flex-col items-center">
        {/* 这里加了一个 key，当 text 变化时会触发微小的淡入动画 */}
        <span
          key={currentState.text}
          className="animate-scale-up text-sm font-bold text-gray-800 transition-colors duration-300 dark:text-gray-200"
        >
          {currentState.text}
        </span>
        <span className="home-urge-count mt-2 text-xs text-gray-400 dark:text-gray-500">
          {isLoading ? '加载中...' : `已有 ${count} 次催更`}
        </span>
      </div>
    </div>
  )
}
