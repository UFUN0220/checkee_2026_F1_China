import { genPageMetadata } from '~/app/seo'
import UfunReadme from './ufunReadme'
export const metadata = genPageMetadata({ title: 'README' })

export default function AboutPage() {
  // import type { Author } from 'contentlayer/generated'
  // import { allAuthors } from 'contentlayer/generated'
  // import { AuthorLayout } from '~/layouts/author-layout'
  // import { coreContent } from '~/utils/contentlayer'
  // let author = allAuthors.find((p) => p.slug === 'default') as Author
  // let mainContent = coreContent(author)

  // return (
  //   <AuthorLayout content={mainContent}>
  //     {/* TODO: MDX seems to be broken on this page, so I'm back to JSX for now */}
  //     {/* <MDXLayoutRenderer code={author.body.code} /> */}
  //   </AuthorLayout>
  // )

  return (
    <div className="pt-12">
      <UfunReadme />
    </div>
  )
}
