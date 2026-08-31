import { SocialAccounts } from '~/components/author/social-accounts'
import { ProfileCard } from '~/components/cards/profile'
import { Container } from '~/components/ui/container'
import { PageHeader } from '~/components/ui/page-header'
import { Twemoji } from '~/components/ui/twemoji'
import { SITE_METADATA } from '~/data/site-metadata'

export function AuthorLayout() {
  return (
    <Container className="pt-4 lg:pt-12">
      <PageHeader
        title="README"
        description="A bit of background on who I am."
        className="border-b border-gray-200 dark:border-gray-700"
      />
      <div className="py-8 md:grid md:grid-cols-3">
        <div className="pr-4">
          <ProfileCard />
        </div>
        <div className="md:col-span-2 md:pl-12 xl:pl-16">
          <div className="prose prose-lg dark:prose-invert">
            <div>
              <h2 className="mt-0">
                Hi there <Twemoji emoji="waving-hand" />
              </h2>

              <p>
                I would greatly appreciate any comments and thoughts on my posts{' '}
                <Twemoji emoji="clinking-beer-mugs" />.
              </p>
            </div>
            <div>
              <h2>Tech stack</h2>
              <p>
                This blog is hosted on{' '}
                <a href="https://vercel.com/" target="_blank">
                  Vercel
                </a>
                , built with{' '}
                <a href="https://nextjs.org/" target="_blank">
                  Next.js
                </a>{' '}
                and{' '}
                <a href="https://tailwindcss.com/" target="_blank">
                  Tailwind CSS
                </a>{' '}
                using <strong>Tailwind Nextjs Starter Blog</strong>.
              </p>
              <p>
                A huge thanks to{' '}
                <a href="https://twitter.com/timlrxx" target="_blank">
                  Timothy Lin
                </a>{' '}
                for the minimal, lightweight, and super easy-to-customize blog starter.
              </p>
              <p>A few major over-engineering-changes from the original repo:</p>
              <ul>
                <li>
                  <Twemoji emoji="atom-symbol" /> Upgrading to <strong>React v18</strong>,{' '}
                  <strong>Next v14</strong>
                  (Using App router)
                </li>
                <li>
                  <Twemoji emoji="party-popper" /> Adopting <strong>Typescript</strong>, committing
                  with{' '}
                  <a href="https://www.conventionalcommits.org/" target="_blank">
                    Conventional Commits
                  </a>
                </li>
                <li>
                  <Twemoji emoji="bar-chart" /> Monitoring site with{' '}
                  <a href="https://umami.is/" target="_blank">
                    Umami
                  </a>{' '}
                  website analytics
                </li>
                <li>
                  <Twemoji emoji="eyes" /> Theming in dark mode with{' '}
                  <a
                    href="https://github.blog/changelog/2021-04-14-dark-and-dimmed-themes-are-now-generally-available/"
                    target="_blank"
                  >
                    Github dark dimmed
                  </a>{' '}
                  colors for better contrast
                </li>
                <li>
                  <Twemoji emoji="man-technologist" /> Making a lot of changes to the UI, new
                  homepage design, adding <code>ProfileCard</code>, <code>CareerTimeline</code>{' '}
                  components and refining the reading experience.
                </li>
              </ul>
              <p>
                See my{' '}
                <a href="https://github.com/hta218/leohuynh.dev" target="_blank">
                  Github repository
                </a>{' '}
                for this blog.
              </p>
            </div>
            <div>
              <h2>Contact</h2>
              <p>
                Reach out to me at{' '}
                <a href={`mailto:${SITE_METADATA.email}`}>{SITE_METADATA.email}</a> or find me on
                social media:
              </p>
              <SocialAccounts />
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}
