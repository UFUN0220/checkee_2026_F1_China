import { ArrowUpRight } from 'lucide-react'
import { Link } from '~/components/ui/link'
import type { HomepagePost } from '~/utils/homepage'
import { WidgetShell } from './widget-shell'

type ArticleWidgetCardProps = {
  widget: 'latestArticle' | 'pinnedArticle'
  label: string
  article?: HomepagePost
}

function formatArticleDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function ArticleWidgetCard({ widget, label, article }: ArticleWidgetCardProps) {
  const href = article ? `/blog/${article.slug}` : '/blog'

  return (
    <WidgetShell widget={widget} label={label}>
      <Link className="home-article-card" href={href} aria-label={`${label}: ${article?.title || 'Article archive'}`}>
        <div className="home-widget-kicker">{label}</div>
        <div className="home-article-content">
          <h2>{article?.title || 'Article archive'}</h2>
          {article?.summary ? <p>{article.summary}</p> : null}
          <div className="home-article-meta">
            {article ? <time dateTime={article.date}>{formatArticleDate(article.date)}</time> : <span>暂无文章</span>}
            <ArrowUpRight className="home-article-arrow" size={16} strokeWidth={1.8} aria-hidden="true" />
          </div>
        </div>
      </Link>
    </WidgetShell>
  )
}
