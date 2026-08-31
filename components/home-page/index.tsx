import type { Blog } from 'contentlayer/generated'
import {
  Boxes,
  BriefcaseBusiness,
  Code2,
  FileText,
  GitBranch,
  Mail,
  Network,
  NotebookText,
  PencilLine,
  Sparkles,
} from 'lucide-react'
import { Link } from '~/components/ui/link'
import { SITE_METADATA } from '~/data/site-metadata'
import type { CoreContent } from '~/types/data'
import { LocationTimeWeather } from './LocationTimeWeather'

type HomePost = CoreContent<Blog>

const HERO_IMAGES = [
  '/static/images/mainPage/washu_home.jpg',
  '/static/images/mainPage/washu_sky.jpg',
  '/static/images/mainPage/jsu.jpg',
  '/static/images/mainPage/qingdao_home2.jpg',
  '/static/images/mainPage/stl_home.png',
]



function formatDate(date?: string) {
  if (!date) return '2026/7/6'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(date))
}

function GlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-[2rem] border border-white/65 bg-white/42 shadow-[0_18px_60px_rgba(125,82,112,0.14)] ring-1 ring-white/35 backdrop-blur-3xl ${className}`}
    >
      {children}
    </section>
  )
}

function ProfileMiniCard() {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[#ffe5f0] shadow-[0_0_34px_rgba(255,45,85,0.22)]">
          <img
            src="/static/images/const/logo.jpg"
            alt="Fang avatar"
            className="h-9 w-9 rounded-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h1 className="font-mono text-lg font-black tracking-normal text-[#3d3444]">UFUN:)</h1>
          <p className="mt-0.5 text-xs font-bold text-[#a05fb3]">由心以暇 / 放鹿青崖</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 font-bold text-[#7e7283]">
        Fang / MISM @ WashU / Backend Engineer / AI & Data Enthusiast
      </p>
    </GlassCard>
  )
}

function SideInfoCards() {
  return (
    <div className="grid gap-3 lg:w-full">
      <ProfileMiniCard />
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <BriefcaseBusiness className="text-[#ff2d55]" size={22} />
          <p className="mt-3 text-xs font-black text-[#8b7d90]">星座</p>
          <p className="mt-1 text-sm font-black text-[#44384d]">白羊座</p>
        </GlassCard>
        <GlassCard className="p-4">
          <NotebookText className="text-[#5ac8fa]" size={22} />
          <p className="mt-3 text-xs font-black text-[#8b7d90]">故乡</p>
          <p className="mt-1 text-sm font-black text-[#44384d]">中国青岛</p>
        </GlassCard>
      </div>
      <GlassCard className="p-4">
        <p className="text-xs font-black text-[#8b7d90]">现居</p>
        <p className="mt-2 font-mono text-2xl font-black text-[#44384d]">Missouri</p>
        <p className="mt-1 font-mono text-xl font-black text-[#af52de]">St. Louis</p>
      </GlassCard>
    </div>
  )
}

function ImageStack() {
  return (
    <GlassCard className="relative h-36 overflow-hidden p-3 sm:h-40 xl:h-44">
      <div className="relative mx-auto h-full max-w-[24rem]">
        {HERO_IMAGES.map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`absolute h-28 w-24 rounded-2xl border-[3px] border-white object-cover shadow-xl transition duration-500 hover:z-20 hover:-translate-y-2 sm:h-32 sm:w-28 xl:h-36 xl:w-32 ${
              [
                'top-4 left-[4%] -rotate-6',
                'top-1 left-[27%] rotate-3',
                'top-5 left-[50%] -rotate-3',
                'top-2 left-[68%] rotate-6',
              ][index]
            }`}
          />
        ))}
        <div className="absolute top-1/2 left-1/2 z-10 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-white/80 text-[#af52de] shadow-xl">
          <Boxes size={24} />
        </div>
      </div>
    </GlassCard>
  )
}

function GreetingCard() {
  return (
    <GlassCard className="grid min-h-[15rem] place-items-center p-5 text-center xl:min-h-[16rem]">
      <div>
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#ffe5f0] shadow-[0_0_70px_rgba(255,45,85,0.2)] xl:h-24 xl:w-24">
          <img
            src="/static/images/const/logo.jpg"
            alt="Fang"
            className="h-16 w-16 rounded-full object-cover xl:h-20 xl:w-20"
          />
        </div>
        <p className="mt-4 font-mono text-2xl font-black tracking-normal text-[#3d3444] xl:text-3xl">
          由心以暇
        </p>
        <p className="mx-auto mt-2 max-w-sm font-mono text-xl leading-[1.3] font-black tracking-normal text-[#3d3444] xl:text-2xl">
          放鹿<span className="text-[#ff2d55]">青崖</span>
        </p>
        <p className="mt-3 text-xs font-bold text-[#817484]">
          UFUN:) / Fang / Personal Knowledge Base
        </p>
      </div>
    </GlassCard>
  )
}

function CalendarCard() {
  const today = new Date()
  const days = Array.from({ length: 31 }, (_, index) => index + 1)

  return (
    <GlassCard className="p-4 xl:p-5">
      <p className="text-sm font-black text-[#817484]">{formatDate(today.toISOString())} 周一</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-sm font-black text-[#817484] xl:gap-1.5">
        {['一', '二', '三', '四', '五', '六', '日'].map((item) => (
          <span key={item} className={item === '一' ? 'text-[#ff2d55]' : ''}>
            {item}
          </span>
        ))}
        {days.map((day) => (
          <span
            key={day}
            className={`grid h-6 place-items-center rounded-lg xl:h-7 ${
              day === today.getDate() ? 'bg-[#ff2d55] text-white shadow-md' : ''
            }`}
          >
            {day}
          </span>
        ))}
      </div>
    </GlassCard>
  )
}

function LatestArticle({ post }: { post?: HomePost }) {
  return (
    <GlassCard className="p-4 xl:p-5">
      <p className="text-sm font-black text-[#817484]">本科就读</p>
      <Link href={post ? `/blog/${post.slug}` : '/blog'} className="mt-3 flex items-center gap-4">
        <img
          src="/static/images/mainPage/jsu.jpg"
          alt="Jiangsu University"
          className="h-12 w-12 rounded-2xl border-2 border-white object-cover shadow-md"
        />
        <div className="min-w-0">
          <h2 className="line-clamp-1 text-base font-black tracking-normal text-[#44384d]">
            江苏大学
          </h2>
          <p className="mt-1 line-clamp-1 text-xs font-bold text-[#817484]">
            计算机科学与通信工程学院
          </p>
          <p className="mt-2 text-xs font-bold text-[#817484]">Jiangsu University</p>
        </div>
      </Link>
    </GlassCard>
  )
}

function SocialButtons() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link
        href={SITE_METADATA.github}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 py-2.5 text-base font-black text-white shadow-[0_14px_36px_rgba(125,82,112,0.16)] transition duration-300 hover:-translate-y-1"
      >
        <GitBranch size={22} />
        Github
      </Link>
      <Link
        href={SITE_METADATA.linkedin}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/75 bg-white/45 px-5 py-2.5 text-base font-black text-[#44384d] shadow-[0_14px_36px_rgba(125,82,112,0.12)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1"
      >
        <Network size={21} className="text-[#af52de]" />
        LinkedIn
      </Link>
      <Link
        href={`mailto:${SITE_METADATA.email}`}
        aria-label="Email Fang"
        className="grid h-11 w-11 place-items-center rounded-2xl border border-white/75 bg-white/45 p-2.5 text-[#ff2d55] shadow-[0_14px_36px_rgba(125,82,112,0.12)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1"
      >
        <Mail size={22} />
      </Link>
    </div>
  )
}

function RecommendationCard() {
  return (
    <GlassCard className="p-4 xl:p-5">
      <p className="text-sm font-black text-[#8b7d90]">硕士在读</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-10 w-16 place-items-center rounded-sm bg-white shadow-sm">
          <Code2 className="text-[#af52de]" size={24} />
        </div>
        <div>
          <h2 className="text-base font-black text-[#44384d]">WashU</h2>
          <p className="mt-1 text-xs font-bold text-[#817484]">McKelvey School of Engineering</p>
        </div>
      </div>
    </GlassCard>
  )
}

export function Home({ posts }: { posts: HomePost[] }) {
  const latestPost = posts[0]

  return (
    <div
      data-homepage-fullscreen
      className="relative min-h-screen w-full overflow-hidden bg-[#f7edf5] pt-20 text-[#3d3444] lg:h-screen lg:max-h-screen lg:min-h-0 lg:pt-16"
    >
      <style>{`
        body:has([data-homepage-fullscreen]) {
          background-color: #f7edf5;
          background-image: radial-gradient(circle at 16% 84%, rgba(255, 45, 85, 0.3), transparent 34%), radial-gradient(circle at 78% 82%, rgba(255, 204, 0, 0.34), transparent 31%), radial-gradient(circle at 56% 24%, rgba(175, 82, 222, 0.24), transparent 35%), radial-gradient(circle at 26% 18%, rgba(90, 200, 250, 0.22), transparent 32%);
        }
        body:has([data-homepage-fullscreen]) footer {
          display: none !important;
        }
        @media (min-width: 1024px) {
          body:has([data-homepage-fullscreen]) {
            overflow: hidden;
          }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_84%,rgba(255,45,85,0.3),transparent_34%),radial-gradient(circle_at_78%_82%,rgba(255,204,0,0.34),transparent_31%),radial-gradient(circle_at_56%_24%,rgba(175,82,222,0.24),transparent_35%),radial-gradient(circle_at_26%_18%,rgba(90,200,250,0.22),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.34),rgba(255,255,255,0)_45%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[80rem] grid-cols-1 gap-4 px-4 py-5 sm:px-6 lg:h-full lg:min-h-0 lg:grid-cols-[17.5rem_minmax(27rem,1fr)_22rem] lg:grid-rows-[7.25rem_13.75rem_5.75rem_4.75rem] lg:items-start lg:gap-3 lg:px-5 lg:pt-0 lg:pb-0 xl:max-w-[86rem] xl:grid-cols-[18.5rem_minmax(29rem,1fr)_24rem] xl:grid-rows-[7.75rem_14.5rem_6rem_5rem] xl:gap-3.5 xl:px-7 xl:pt-0">
        <div className="lg:row-span-2">
          <SideInfoCards />
        </div>

        <ImageStack />

        <div className="grid gap-4 lg:grid-cols-[8.5rem_1fr] lg:items-start xl:grid-cols-[9rem_1fr]">
          <Link
            href="/blog"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#ff2d55] px-4 text-base font-black text-white shadow-[0_14px_40px_rgba(255,45,85,0.24)] transition duration-300 hover:-translate-y-1 hover:bg-[#e8294d] xl:h-[3.25rem] xl:text-base"
          >
            <PencilLine size={22} />
            写文章
          </Link>
          <LocationTimeWeather />
        </div>

        <GreetingCard />
        <CalendarCard />
        <LatestArticle post={latestPost} />
        <SocialButtons />
        <div className="grid gap-4 lg:col-start-2 lg:grid-cols-[1fr_1.2fr]">
          <RecommendationCard />
          <GlassCard className="p-4 xl:p-5">
            <p className="text-sm font-black text-[#8b7d90]">技术方向</p>
            <p className="mt-2 text-sm leading-6 font-black text-[#44384d] xl:text-base">
              Backend / AI / Database / Cloud / LeetCode
            </p>
          </GlassCard>
        </div>

        <div className="grid gap-4 lg:col-start-3">
          <Link
            id="projects"
            href="/blog"
            className="group inline-flex items-center gap-3 rounded-[2rem] border border-white/70 bg-white/42 p-4 text-sm font-black text-[#44384d] shadow-[0_18px_50px_rgba(125,82,112,0.12)] backdrop-blur-2xl transition hover:-translate-y-1 hover:bg-white/58"
          >
            <FileText className="text-[#af52de]" size={22} />
            Technical Blogs / Projects / LeetCode
            <span className="ml-auto transition group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="pointer-events-none fixed top-1/2 right-6 hidden h-12 w-12 place-items-center rounded-full bg-[#ef8eb3] text-xl font-black text-white shadow-lg lg:grid">
          A
        </div>
        <Sparkles className="pointer-events-none fixed top-[19%] right-[18%] hidden text-white/70 lg:block" />
      </div>
    </div>
  )
}
