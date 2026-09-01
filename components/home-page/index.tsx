import type { Blog } from 'contentlayer/generated'
import { ArrowUpRight, GitBranch, Mail, MoveUpRight, Network } from 'lucide-react'
import { Link } from '~/components/ui/link'
import { SITE_METADATA } from '~/data/site-metadata'
import type { CoreContent } from '~/types/data'
import { DynamicGreeting } from './dynamic-greeting'
import { SectionReveal } from './section-reveal'

type HomePost = CoreContent<Blog>

const SELECTED_PROJECTS = [
  {
    title: 'Kaggle · Multimodal Valuation',
    year: '2026',
    category: 'Machine learning / Competition',
    description:
      'A small-data experiment in feature engineering, model stability, and knowing when to prune.',
    image: '/static/images/mainPage/washu_sky.jpg',
    href: '/blog/kaggleLog',
    stack: 'LightGBM · CatBoost · DeBERTa',
  },
  {
    title: 'UFUN Knowledge Base',
    year: 'ongoing',
    category: 'Personal system / Writing',
    description:
      'A calm corner for notes, field logs, technical detours, and things worth remembering.',
    image: '/static/images/mainPage/ujs_lib.jpg',
    href: '/blog',
    stack: 'Next.js · Contentlayer · TypeScript',
  },
  {
    title: 'Backend & AI Notes',
    year: '2025—26',
    category: 'Engineering / Study',
    description:
      'Working notes from APIs, databases, distributed systems, and the long road through AI.',
    image: '/static/images/mainPage/stl_home.png',
    href: '/tags',
    stack: 'Java · Spring · Redis · Python',
  },
  {
    title: 'Jiangsu University Archive',
    year: '2020—24',
    category: 'Archive / Personal history',
    description: 'A small visual record of where the first chapters of this work began.',
    image: '/static/images/mainPage/jsu.jpg',
    href: '/about',
    stack: 'Computer science · Curiosity',
  },
]

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string
  title: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="font-display text-ink dark:text-cream mt-2 text-3xl tracking-[-0.04em] sm:text-4xl">
          {title}
        </h2>
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="text-muted hover:text-accent dark:text-muted-dark dark:hover:text-accent-soft inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
        >
          {linkLabel}
          <ArrowUpRight size={16} strokeWidth={1.8} />
        </Link>
      ) : null}
    </div>
  )
}

function Hero() {
  return (
    <section className="grid gap-12 pt-16 pb-20 sm:pt-24 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-end lg:gap-16 lg:pt-28 lg:pb-28">
      <div>
        <div className="text-muted dark:text-muted-dark flex items-center gap-3 text-sm font-semibold">
          <span className="bg-accent h-2 w-2 rounded-full shadow-[0_0_0_5px_rgb(194_74_45_/_0.12)]" />
          <DynamicGreeting />
        </div>
        <h1 className="font-display text-ink dark:text-cream mt-7 max-w-4xl text-[clamp(3.2rem,8vw,6.7rem)] leading-[0.94] tracking-[-0.075em]">
          I build useful things,
          <span className="text-accent block">and keep notes.</span>
        </h1>
        <p className="text-muted dark:text-muted-dark mt-8 max-w-2xl text-lg leading-8 sm:text-xl sm:leading-9">
          I&apos;m Fang — a backend engineer and AI &amp; data enthusiast based in St. Louis. This
          is my corner of the internet for building, learning, and paying attention.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold">
          <Link href={SITE_METADATA.github} className="link-with-arrow">
            <GitBranch size={17} strokeWidth={1.7} />
            GitHub
            <MoveUpRight size={14} strokeWidth={1.8} />
          </Link>
          <Link href={SITE_METADATA.linkedin} className="link-with-arrow">
            <Network size={17} strokeWidth={1.7} />
            LinkedIn
            <MoveUpRight size={14} strokeWidth={1.8} />
          </Link>
          <Link href={`mailto:${SITE_METADATA.email}`} className="link-with-arrow">
            <Mail size={17} strokeWidth={1.7} />
            Email
            <MoveUpRight size={14} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
      <div className="relative lg:pb-3">
        <div className="border-accent/30 dark:border-accent-soft/35 absolute -top-5 -left-5 h-16 w-16 rounded-full border" />
        <div className="relative overflow-hidden rounded-[1.35rem] bg-[#e8e0d3] dark:bg-[#2a2924]">
          <img
            src="/static/images/mainPage/washu_formal.png"
            alt="A quiet snapshot from Fang's archive"
            className="aspect-[4/3] w-full object-cover object-center mix-blend-multiply transition duration-700 hover:scale-[1.015] dark:mix-blend-luminosity"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1d1b18]/65 to-transparent p-5 pt-16 text-sm font-medium text-white">
            currently between systems &amp; stories
          </div>
        </div>
        <p className="text-muted dark:text-muted-dark mt-3 text-xs">
          St. Louis, Missouri · 38°37′N 90°12′W
        </p>
      </div>
    </section>
  )
}

function NowSection() {
  return (
    <SectionReveal>
      <section className="border-line dark:border-line-dark border-y py-8">
        <div className="grid gap-6 md:grid-cols-[10rem_1fr] md:items-start">
          <p className="eyebrow pt-1">Now / 08.26</p>
          <div className="text-ink-soft dark:text-cream-soft grid gap-5 text-base leading-7 sm:grid-cols-3 sm:gap-8">
            <p>
              <span className="now-label">Building</span> reliable backend services and a more
              useful personal knowledge base.
            </p>
            <p>
              <span className="now-label">Exploring</span> multimodal learning, data systems, and
              the shape of good tools.
            </p>
            <p>
              <span className="now-label">Reading</span> old notebooks, new papers, and whatever
              catches my attention.
            </p>
          </div>
        </div>
      </section>
    </SectionReveal>
  )
}

function DiscoverySection({ post }: { post?: HomePost }) {
  return (
    <SectionReveal>
      <section className="py-20 sm:py-24">
        <div className="bg-surface dark:bg-surface-dark grid gap-8 rounded-[1.35rem] px-6 py-7 sm:grid-cols-[1fr_auto] sm:items-center sm:px-9 sm:py-9">
          <div>
            <p className="eyebrow text-accent">A small detour</p>
            <h2 className="font-display text-ink dark:text-cream mt-3 max-w-2xl text-3xl tracking-[-0.04em] sm:text-4xl">
              Explore something I&apos;ve been thinking about.
            </h2>
            <p className="text-muted dark:text-muted-dark mt-3 max-w-xl text-base leading-7">
              {post?.summary ||
                'A rotating doorway into the notes, experiments, and unfinished thoughts gathered here.'}
            </p>
          </div>
          <Link
            href={post ? `/blog/${post.slug}` : '/blog'}
            className="bg-accent hover:bg-accent-dark focus-visible:outline-accent inline-flex w-fit items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
          >
            Open the notebook
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </SectionReveal>
  )
}

function WritingSection({ posts }: { posts: HomePost[] }) {
  return (
    <SectionReveal>
      <section id="writing" className="pb-20 sm:pb-28">
        <SectionHeading
          eyebrow="Field notes"
          title="Latest writing"
          href="/blog"
          linkLabel="View all writing"
        />
        <div className="divide-line border-line dark:divide-line-dark dark:border-line-dark divide-y border-y">
          {posts.slice(0, 5).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="writing-row group grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_9rem] sm:gap-8 sm:py-6"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-ink dark:text-cream truncate text-lg font-bold tracking-[-0.02em] transition-transform duration-200 group-hover:translate-x-1 sm:text-xl">
                    {post.title}
                  </h3>
                  <ArrowUpRight
                    className="text-accent shrink-0 opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                    size={17}
                  />
                </div>
                <p className="text-muted dark:text-muted-dark mt-1 line-clamp-1 text-sm leading-6">
                  {post.summary || 'A note from the archive.'}
                </p>
              </div>
              <div className="text-muted dark:text-muted-dark flex items-center justify-between gap-3 text-xs font-semibold tracking-[0.12em] uppercase sm:flex-col sm:items-end sm:justify-center sm:gap-1">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span>{post.tags?.filter(Boolean)[0] || 'note'}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SectionReveal>
  )
}

function ProjectsSection() {
  return (
    <SectionReveal>
      <section id="projects" className="pb-20 sm:pb-28">
        <SectionHeading
          eyebrow="Selected work"
          title="Things I've built"
          href={SITE_METADATA.github}
          linkLabel="More on GitHub"
        />
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 sm:gap-y-14">
          {SELECTED_PROJECTS.map((project) => (
            <article key={project.title} className="group">
              <Link
                href={project.href}
                className="bg-surface dark:bg-surface-dark block overflow-hidden rounded-[1.1rem]"
              >
                <img
                  src={project.image}
                  alt=""
                  className="aspect-[16/10] w-full object-cover grayscale-[0.12] transition duration-700 group-hover:scale-[1.015] group-hover:grayscale-0"
                />
              </Link>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{project.category}</p>
                  <h3 className="text-ink dark:text-cream mt-2 text-xl font-bold tracking-[-0.025em]">
                    {project.title}
                  </h3>
                </div>
                <Link
                  href={project.href}
                  aria-label={`Open ${project.title}`}
                  className="border-line text-muted group-hover:border-accent group-hover:text-accent dark:border-line-dark dark:text-muted-dark mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border transition"
                >
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <p className="text-muted dark:text-muted-dark mt-2 max-w-lg text-sm leading-6">
                {project.description}
              </p>
              <p className="text-muted/80 dark:text-muted-dark/80 mt-3 font-mono text-[0.68rem] tracking-[0.12em] uppercase">
                {project.stack} · {project.year}
              </p>
            </article>
          ))}
        </div>
      </section>
    </SectionReveal>
  )
}

export function Home({ posts }: { posts: HomePost[] }) {
  return (
    <div className="homepage-shell">
      <div className="site-container">
        <Hero />
        <NowSection />
        <DiscoverySection post={posts[0]} />
        <WritingSection posts={posts} />
        <ProjectsSection />
      </div>
    </div>
  )
}
