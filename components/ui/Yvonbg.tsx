import { clsx } from 'clsx'
import Image from 'next/image'

export function Yvonbg({ className }: { className?: string }) {
  return (
    <div>
      <Image
        src="/static/images/colorfulink.jpg"
        alt="Yvon Background"
        width={800}
        height={600}
        className={clsx(
          'w-full',
          className,

          'dark:fill-white/[.01] dark:stroke-white/[.025]',
          'fill-black/[0.02] stroke-black/5'
        )}
      />
    </div>
  )
}
