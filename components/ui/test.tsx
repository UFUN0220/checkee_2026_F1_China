import { clsx } from 'clsx'
import Test from '~/icons/test1.svg'

export function TestBackground({ className }: { className?: string }) {
  return (
    <div
      className={clsx([
        'fixed left-0 right-0 top-0 overflow-hidden [mask-image:linear-gradient(white,transparent)]',
        'h-screen w-screen', // 确保组件高度和宽度为视口大小，实现响应式
        className,
      ])}
    >
      <Test
        className={clsx([
          'h-full w-full',
          'absolute inset-x-0 inset-y-0',
          'dark:fill-white/[.01] dark:stroke-white/[.025]',
          'fill-black/[0.02] stroke-black/5',
        ])}
      />
    </div>
  )
}
