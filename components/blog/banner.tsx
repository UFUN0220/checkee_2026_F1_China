import { clsx } from 'clsx'
import { GritBackground } from '~/components/ui/grit-background'
import { Image, Zoom } from '~/components/ui/image'
import { Link } from '~/components/ui/link'
import { capitalize, kebabCaseToPlainText } from '~/utils/misc'

// 修改函数签名，允许 banner 为 null 或 undefined
export function Banner({ banner, className }: { banner?: string | null; className?: string }) {
  // 添加空值检查
  if (!banner) {
    return null // 直接返回 null，不渲染任何内容
  }

  try {
    const [path, author, id] = banner.split('__')
    const handle = path.split('/').pop() || ''

    return (
      <div className={clsx('relative', className)}>
        <Zoom>
          <Image
            src={banner}
            alt={capitalize(kebabCaseToPlainText(handle)) || 'Article banner photo'}
            width={1600}
            height={900}
            className="h-auto w-full rounded-lg"
          />
        </Zoom>
        <GritBackground className="inset-0 rounded-lg opacity-75" />
        {/* 添加 Credit 组件调用 */}
        <Credit author={author} id={id} className="absolute bottom-2 right-2 text-white" />
      </div>
    )
  } catch (error) {
    console.error('Error processing banner image:', error)
    return null // 如果解析出错也返回 null
  }
}

interface CreditProps {
  author: string
  id: string
  className?: string
}

function Credit({ author, id, className }: CreditProps) {
  if (author && id) {
    return (
      <div className={clsx('italic', className)}>
        Photo by{' '}
        <Link
          className="underline-offset-4 hover:underline"
          href={`https://unsplash.com/@${author}`}
        >
          <span data-umami-event="banner-author">@{author}</span>
        </Link>{' '}
        on{' '}
        <Link
          className="underline-offset-4 hover:underline"
          href={`https://unsplash.com/photos/${id}`}
        >
          <span data-umami-event="banner-unsplash">Unsplash</span>
        </Link>
      </div>
    )
  }
  return null
}
