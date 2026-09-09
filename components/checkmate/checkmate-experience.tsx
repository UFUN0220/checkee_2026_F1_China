'use client'

import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CHECKMATE_LOCATIONS,
  type CheckeeDataset,
  type CheckeeRecord,
  type CheckmateLocation,
  type CheckmateSnapshot,
  type WaitStats,
} from '~/data/checkmate/types'
import {
  CHECKMATE_DATA_NOTICES,
  type CheckmateDataNotice,
  type CheckmatePageKey,
} from '~/data/checkmate/config'
import { ContactCaseDialogButton } from './contact-case-dialog'
import { HallWelcomeDialog } from './hall-welcome-dialog'
import { SubmitCaseButton } from './submit-case-dialog'
import styles from './checkmate-experience.module.css'

export type CheckmateView = 'cities' | 'peers'

const LOCATION_NAMES: Record<CheckmateLocation, string> = {
  beijing: '北京',
  shanghai: '上海',
  guangzhou: '广州',
  shenyang: '沈阳',
  wuhan: '武汉',
}

const PODIUM_NICKNAMES = [ 'momo','影', 'Mo'] as const

function formatDays(value: number | null) {
  if (value === null) return '—'
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function ceilWaitStats(stats: WaitStats): WaitStats {
  return {
    q1: stats.q1 === null ? null : Math.ceil(stats.q1),
    median: stats.median === null ? null : Math.ceil(stats.median),
    q3: stats.q3 === null ? null : Math.ceil(stats.q3),
  }
}

function formatDate(value: string | null) {
  return value ? value.replace(/^2026-/, '').replace('-', '.') : '—'
}

function formatHallDegree(value: string) {
  return value.trim().toLowerCase() === 'master' ? 'Ms' : value
}

export function CheckmateExperience({
  checkeeSnapshot,
  checkeeDataset,
  view,
}: {
  checkeeSnapshot: CheckmateSnapshot
  checkeeDataset: CheckeeDataset
  view: CheckmateView
}) {
  const pageKey: CheckmatePageKey = view === 'peers' ? 'hall-of-fame' : 'white-house'
  const notice = CHECKMATE_DATA_NOTICES[pageKey]

  return (
    <section className={styles.feature} aria-label="Checkmate F-1 公开样本">
      {view === 'cities' ? (
        <WhiteHouseSelection snapshot={checkeeSnapshot} />
      ) : (
        <HallOfFame dataset={checkeeDataset} notice={notice} />
      )}
    </section>
  )
}

function FeatureTitle({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className={styles.titleRow}>
      <header className={styles.titleBlock}>
        <h1>{children}</h1>
      </header>
      {trailing}
    </div>
  )
}

function WhiteHouseSelection({ snapshot }: { snapshot: CheckmateSnapshot }) {
  const [page, setPage] = useState(1)
  const [selectedCity, setSelectedCity] = useState<CheckmateLocation | null>(null)
  const selectedCases = useMemo(
    () =>
      selectedCity
        ? [...snapshot.cases]
            .filter((item) => item.location === selectedCity)
            .sort((left, right) => right.checkDate.localeCompare(left.checkDate))
        : [],
    [selectedCity, snapshot.cases]
  )
  const totalPages = Math.max(1, Math.ceil(selectedCases.length / 10))
  const visibleCases = selectedCases.slice((page - 1) * 10, page * 10)
  useEffect(() => setPage(1), [selectedCity])
  return (
    <div className={`${styles.view} ${styles.citiesView}`}>
      <FeatureTitle>
        <span>
          <span className={styles.viewTitleMain}>2026 F-1 数据统计</span>
        </span>
        <span className={styles.viewTitleQualifier}>( Checkee.info )</span>
      </FeatureTitle>
      <div className={styles.cityGrid} aria-label="五个城市的等待时长统计">
        {CHECKMATE_LOCATIONS.map((city) => {
          const metrics = snapshot.locations[city]
          const cardStats = ceilWaitStats(metrics.waitStats)
          const active = city === selectedCity
          return (
            <button
              type="button"
              key={city}
              className={active ? styles.cityCardActive : styles.cityCard}
              aria-pressed={active}
              onClick={() => setSelectedCity(active ? null : city)}
            >
              <span className={styles.cityHeader}>
                <span className={styles.cityName}>{LOCATION_NAMES[city]}</span>
                <span className={styles.cityCount}>{metrics.sampleCount} cases</span>
              </span>
              <Quartiles stats={cardStats} />
            </button>
          )
        })}
      </div>
      <div className={styles.citiesContent}>
        <Trend trends={snapshot.monthlyF1Trends} stats={snapshot.national.waitStats} />
        <CityDetail
          city={selectedCity}
          cases={visibleCases}
          totalCases={selectedCases.length}
          allCasesCount={snapshot.cases.length}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onClose={() => setSelectedCity(null)}
        />
      </div>
    </div>
  )
}

function Quartiles({ stats }: { stats: WaitStats }) {
  return (
    <span className={styles.quartiles}>
      <span>
        <small>Q1</small>
        <b>{formatDays(stats.q1)}</b>
      </span>
      <span className={styles.quartileMedian}>
        <small>Median</small>
        <b>{formatDays(stats.median)}</b>
      </span>
      <span>
        <small>Q3</small>
        <b>{formatDays(stats.q3)}</b>
      </span>
    </span>
  )
}

function Trend({
  trends,
  stats,
}: {
  trends: CheckmateSnapshot['monthlyF1Trends']
  stats: WaitStats
}) {
  const summary = trends.reduce(
    (total, trend) => ({
      pending: total.pending + trend.pendingCount,
      clear: total.clear + trend.clearCount,
      cases: total.cases + trend.totalCount,
      weightedWait: total.weightedWait + (trend.averageWaitingDays ?? 0) * trend.totalCount,
      waitCount: total.waitCount + (trend.averageWaitingDays === null ? 0 : trend.totalCount),
    }),
    { pending: 0, clear: 0, cases: 0, weightedWait: 0, waitCount: 0 }
  )
  return (
    <section className={styles.panel} aria-label="月度趋势">
      <div className={`${styles.panelHeading} ${styles.trendHeading}`}>
        <h2>2026.1-8月数据(F-1签证Check时长)</h2>
      </div>
      <div className={styles.trendSummary}>
        <div className={styles.trendSummaryStatus}>
          <strong>{summary.cases} cases</strong>
          <span>Clear {summary.clear}</span>
          <span>Pending {summary.pending}</span>
        </div>
        <span className={styles.trendSummaryStats} aria-label="等待时长分位数">
          <span>Q1 {formatDays(stats.q1)} 天</span>
          <span>Median {formatDays(stats.median)} 天</span>
          <span>
            Avg {formatDays(summary.waitCount ? summary.weightedWait / summary.waitCount : null)} 天
          </span>
          <span>Q3 {formatDays(stats.q3)} 天</span>
        </span>
      </div>
      <div className={styles.trendTable} role="table" aria-label="2026 年 F-1 月度等待统计">
        <div className={`${styles.trendRow} ${styles.trendHeader}`} role="row">
          <span>月份</span>
          <span>Pending</span>
          <span>Clear</span>
          <span>Total</span>
          <span>中位数</span>
        </div>
        {trends.map((trend) => (
          <div className={styles.trendRow} role="row" key={trend.month}>
            <strong>{Number(trend.month.slice(5))} 月</strong>
            <span>{trend.pendingCount}</span>
            <span>{trend.clearCount}</span>
            <span>{trend.totalCount}</span>
            <span>{formatDays(trend.medianWaitingDays)} 天</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function CityDetail({
  city,
  cases,
  totalCases,
  allCasesCount,
  page,
  totalPages,
  onPageChange,
  onClose,
}: {
  city: CheckmateLocation | null
  cases: CheckmateSnapshot['cases']
  totalCases: number
  allCasesCount: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onClose: () => void
}) {
  const mobileCases = useMemo(
    () =>
      [...cases].sort(
        (left, right) =>
          left.checkDate.localeCompare(right.checkDate) ||
          left.publicId.localeCompare(right.publicId)
      ),
    [cases]
  )

  if (!city)
    return (
      <section
        className={`${styles.panel} ${styles.cityDetail} ${styles.cityEmpty}`}
        aria-live="polite"
      >
        <div className={styles.cityEmptyMessage}>
          <MapPin size={18} strokeWidth={1.8} aria-hidden="true" />
          <div>
            <h2>选择一个城市</h2>
            <p>看看不同地区的签证等待情况。</p>
            <small>当前收录：{allCasesCount} 个案例</small>
          </div>
        </div>
      </section>
    )
  if (!cases.length)
    return (
      <section
        className={`${styles.panel} ${styles.cityDetail} ${styles.cityEmpty}`}
        aria-live="polite"
      >
        <div className={styles.cityEmptyMessage}>
          <MapPin size={18} strokeWidth={1.8} aria-hidden="true" />
          <div>
            <h2>暂时没有符合条件的案例</h2>
            <p>换一个城市，或提交你的经历帮助后来的人。</p>
            <small>当前收录：{allCasesCount} 个案例</small>
          </div>
        </div>
      </section>
    )
  const [recentCases, olderCases] = splitColumns(cases)
  return (
    <section
      className={`${styles.panel} ${styles.cityDetail}`}
      aria-labelledby="checkmate-city-title"
    >
      <div className={`${styles.panelHeading} ${styles.cityDetailHeading}`}>
        <div className={styles.cityDetailTitle}>
          <h2 id="checkmate-city-title">
            {LOCATION_NAMES[city]} · 最新案例 · {totalCases}条
          </h2>
        </div>
        <button type="button" className={styles.textButton} onClick={onClose}>
          关闭
        </button>
      </div>
      <div
        className={`${styles.caseList} ${styles.caseListDesktop}`}
        aria-label={`${LOCATION_NAMES[city]} 案例列表`}
      >
        <div className={styles.caseColumn}>
          {recentCases.map((item) => (
            <CityCaseRow item={item} key={item.publicId} />
          ))}
        </div>
        <div className={styles.caseColumn}>
          {olderCases.map((item) => (
            <CityCaseRow item={item} key={item.publicId} />
          ))}
        </div>
      </div>
      <div
        className={`${styles.caseList} ${styles.caseListMobile}`}
        aria-label={`${LOCATION_NAMES[city]} 移动端案例列表`}
      >
        {mobileCases.map((item) => (
          <CityCaseRow item={item} compact key={item.publicId} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </section>
  )
}

function splitColumns<T>(items: T[]): [T[], T[]] {
  const midpoint = Math.ceil(items.length / 2)
  return [items.slice(0, midpoint), items.slice(midpoint)]
}

function HallSectionDivider({ children }: { children: string }) {
  return (
    <div className={styles.hallSectionDivider}>
      <span className={styles.hallSectionDividerLine} aria-hidden="true" />
      <span className={styles.hallSectionDividerText}>{children}</span>
      <span className={styles.hallSectionDividerLine} aria-hidden="true" />
    </div>
  )
}

function CityCaseRow({
  item,
  compact = false,
}: {
  item: CheckmateSnapshot['cases'][number]
  compact?: boolean
}) {
  const category = item.majorCategory.trim()
  const firstCategoryWord = category.split(/\s+/)[0] ?? ''
  const hasMultipleCategoryWords = firstCategoryWord !== category

  return (
    <article className={`${styles.caseRow} ${compact ? styles.compactCaseRow : ''}`}>
      <div>
        <span className={`${styles.status} ${styles[`status${item.status}`]}`}>
          {item.status === 'pending' ? 'Pending' : item.status === 'clear' ? 'Clear' : 'Reject'}
        </span>
        <p>
          {formatDate(item.checkDate)} →{' '}
          {item.status === 'pending'
            ? formatDate(item.effectiveEndDate)
            : formatDate(item.completeDate)}
        </p>
      </div>
      <strong className={styles.caseDuration}>
        {formatDays(item.durationDays)}
        <small>天</small>
      </strong>
      {hasMultipleCategoryWords ? (
        <span
          className={`${styles.caseCategory} ${styles.caseCategoryTooltipTrigger}`}
          tabIndex={0}
          aria-label={`专业：${category}`}
          title={category}
        >
          {firstCategoryWord}
          <span className={styles.caseCategoryTooltip} aria-hidden="true">
            {category}
          </span>
        </span>
      ) : (
        <span className={styles.caseCategory}>{category}</span>
      )}
    </article>
  )
}

function HallOfFame({ dataset, notice }: { dataset: CheckeeDataset; notice: CheckmateDataNotice }) {
  const [page, setPage] = useState(1)
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null)
  const cases = useMemo(
    () =>
      dataset.records
        .filter((item) => item.visibility === 'published')
        .sort(
          (left, right) =>
            (right.waitingDays ?? -1) - (left.waitingDays ?? -1) ||
            String(left.startDate ?? '').localeCompare(String(right.startDate ?? ''))
        ),
    [dataset.records]
  )
  if (!cases.length)
    return (
      <div className={`${styles.view} ${styles.hallView}`}>
        <HallWelcomeDialog caseCount={0} updatedAt={dataset.snapshotDate} />
        <header className={styles.hallIntro}>
          <div className={styles.hallIntroCopy}>
            <h1>
              2026年度
              <span className={styles.hallMobileTitleBreak} aria-hidden="true">
                <br />
              </span>
              白宫严选中国硕博
            </h1>
          </div>
        </header>
        <section className={styles.hallEmpty} aria-live="polite">
          <p>这里还没有新的记录</p>
          <strong>下一位进入名人堂的人，可能就是你。</strong>
          <SubmitCaseButton />
        </section>
      </div>
    )
  const podiumCases = [cases[1], cases[0], cases[2]].filter(Boolean)
  const midCases = cases.slice(3, 30)
  const restCases = cases.slice(30)
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(restCases.length / pageSize))
  const visibleCases = restCases.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className={`${styles.view} ${styles.hallView}`}>
      <HallWelcomeDialog caseCount={cases.length} updatedAt={dataset.snapshotDate} />
      <header className={styles.hallIntro}>
        <div className={styles.hallIntroCopy}>
          <h1>
            2026年度
            <span className={styles.hallMobileTitleBreak} aria-hidden="true">
              <br />
            </span>
            白宫严选中国硕博
          </h1>
        </div>
      </header>

      <section className={styles.podiumSection} aria-labelledby="hall-podium-title">
        <h2 id="hall-podium-title" className={styles.visuallyHidden}>
          前三名荣誉展示
        </h2>
        <div className={styles.podiumGrid}>
          {podiumCases.map((item) => {
            const rank = cases.indexOf(item) + 1
            return rank === 1 ? (
              <div className={styles.podiumChampion} key={item.id}>
                <PodiumCard
                  item={item}
                  rank={rank}
                  expanded={expandedNoteId === item.id}
                  onToggle={() =>
                    setExpandedNoteId((current) => (current === item.id ? null : item.id))
                  }
                />
                <HallControlNav notice={notice} updatedAt={dataset.snapshotDate} />
              </div>
            ) : (
              <PodiumCard
                item={item}
                rank={rank}
                expanded={expandedNoteId === item.id}
                onToggle={() =>
                  setExpandedNoteId((current) => (current === item.id ? null : item.id))
                }
                key={item.id}
              />
            )
          })}
        </div>
      </section>

      <HallSectionDivider>但愿人长久，千里共Check娟</HallSectionDivider>

      <section className={styles.eliteSection} aria-label="第4至30名">
        <div className={styles.eliteList}>
          {midCases.map((item, index) => (
            <HallRowContent item={item} rank={index + 4} variant="elite" key={item.id} />
          ))}
        </div>
      </section>

      <section className={styles.standardSection} aria-label="第31名及以后">
        <HallSectionDivider>曲径通幽处，Check房花木深</HallSectionDivider>
        <div className={styles.standardList}>
          {visibleCases.map((item, index) => (
            <HallRowContent
              item={item}
              rank={30 + (page - 1) * pageSize + index + 1}
              variant="standard"
              key={item.id}
            />
          ))}
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage)
            setExpandedNoteId(null)
          }}
        />
      </section>
    </div>
  )
}

function HallFields({ item, rank }: { item: CheckeeRecord; rank: number }) {
  return (
    <>
      <span className={styles.podiumLocation}>{item.location || '\u00a0'}</span>
      <span className={styles.podiumRecord}>
        <span>{formatHallDegree(item.degree) || '\u00a0'}</span>
        <span>{item.major || '\u00a0'}</span>
        {item.school ? <span>{item.school}</span> : null}
        <span>{formatDate(item.startDate)}</span>
      </span>
      <span className={styles.podiumNickname}>
        {PODIUM_NICKNAMES[rank - 1] ?? PODIUM_NICKNAMES[0]}
      </span>
    </>
  )
}

function HallControlNav({ notice, updatedAt }: { notice: CheckmateDataNotice; updatedAt: string }) {
  return (
    <nav className={styles.podiumActions} aria-label="名人堂操作">
      <SubmitCaseButton />
      <ContactCaseDialogButton notice={notice} updatedAt={updatedAt} />
    </nav>
  )
}

function HallNote({ note, expanded }: { note: string; expanded: boolean }) {
  return expanded && note ? <p className={styles.standardNote}>{note}</p> : null
}

function HallWait({
  item,
  className,
  showApBadge = true,
}: {
  item: CheckeeRecord
  className: string
  showApBadge?: boolean
}) {
  const outcomeLabel = getOutcomeLabel(item)

  return (
    <strong className={`${className} ${styles.hallWait}`}>
      <span className={styles.hallWaitValue}>
        {item.waitingDays === null ? (
          '—'
        ) : (
          <>
            {item.waitingDays}
            <small>天</small>
          </>
        )}
      </span>
      {showApBadge && outcomeLabel ? <span className={styles.apBadge}>{outcomeLabel}</span> : null}
    </strong>
  )
}

function getOutcomeLabel(item: CheckeeRecord): 'AP' | 'IS' | null {
  const normalizedStatus = item.status.trim().toLowerCase()
  const normalizedEndDate = item.endDate?.trim().toLowerCase()
  const hasEndDate = Boolean(item.endDate?.trim())
  const isRefused = normalizedStatus === 'refused' || normalizedEndDate === 'refused'

  if (isRefused || !hasEndDate) return null
  if (normalizedStatus === 'ap' || normalizedStatus === 'approved') return 'AP'
  if (normalizedStatus === 'issue' || normalizedStatus === 'issued') return 'IS'
  return null
}

function PodiumCard({
  item,
  rank,
  expanded,
  onToggle,
}: {
  item: CheckeeRecord
  rank: number
  expanded: boolean
  onToggle: () => void
}) {
  const note = item.detailNote?.trim() || ''
  const hasNote = Boolean(note)

  return (
    <article
      className={`${styles.podiumCard} ${styles[`podiumRank${rank}`]}`}
      data-note-trigger={hasNote ? 'true' : undefined}
      role={hasNote ? 'button' : undefined}
      tabIndex={hasNote ? 0 : undefined}
      aria-expanded={hasNote ? expanded : undefined}
      onClick={hasNote ? onToggle : undefined}
      onKeyDown={
        hasNote
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onToggle()
              }
            }
          : undefined
      }
    >
      <div className={styles.podiumContent}>
        <HallFields item={item} rank={rank} />
        <HallNote note={note} expanded={expanded} />
      </div>
      <HallWait item={item} className={styles.podiumDuration} />
    </article>
  )
}

function HallRowContent({
  item,
  rank,
  variant,
}: {
  item: CheckeeRecord
  rank: number
  variant: 'elite' | 'standard'
}) {
  const rowClass = variant === 'elite' ? styles.eliteRow : styles.standardRow
  const rankClass = variant === 'elite' ? styles.eliteRank : styles.standardRank
  const waitClass = variant === 'elite' ? styles.eliteDuration : styles.standardDuration
  const normalizedStatus = item.status.trim().toLowerCase()
  const normalizedEndDate = item.endDate?.trim().toLowerCase()
  const hasEndDate = Boolean(item.endDate?.trim())
  const isRefused = normalizedStatus === 'refused' || normalizedEndDate === 'refused'
  const outcomeLabel = getOutcomeLabel(item)
  const stateClass = isRefused ? styles.refusedRow : hasEndDate ? styles.completedRow : ''

  return (
    <article className={`${rowClass} ${stateClass}`}>
      <div className={styles.standardDesktopRow}>
        <strong className={rankClass}>{String(rank).padStart(2, '0')}</strong>
        <div className={styles.standardDesktopFields}>
          <span className={styles.standardName}>{item.nickname?.trim() || '\u00a0'}</span>
          <span className={styles.standardLocationDegree}>
            <span>{item.location || '\u00a0'}</span>
            <span>{formatHallDegree(item.degree) || '\u00a0'}</span>
          </span>
          <span className={styles.standardMajor}>{item.major || '\u00a0'}</span>
          <span className={styles.standardSchool}>{item.school || '\u00a0'}</span>
          <span className={styles.standardDates}>{formatDate(item.startDate)}</span>
          <span className={`${styles.standardEndDate} ${isRefused ? styles.refusedText : ''}`}>
            {hasEndDate ? formatDate(item.endDate) : '\u00a0'}
            {outcomeLabel ? <span className={styles.apInline}>{outcomeLabel}</span> : null}
          </span>
          <HallNotePopover item={item} />
        </div>
        <HallWait item={item} className={waitClass} showApBadge={false} />
      </div>
      <div className={styles.mobileRow}>
        <strong className={rankClass}>{String(rank).padStart(2, '0')}</strong>
        <div
          className={`${styles.standardMobileFields} ${styles.mobileMetadata}`}
          data-variant={variant}
        >
          <span className={styles.mobilePrimary}>
            <span className={styles.mobileNickname}>{item.nickname?.trim() || ''}</span>
            <span className={styles.mobilePrimaryMeta}>
              <span>{item.location || '\u00a0'}</span>
              <span>{formatHallDegree(item.degree) || '\u00a0'}</span>
            </span>
          </span>
          {item.major?.trim() ? <span className={styles.mobileMajor}>{item.major}</span> : null}
          <span className={styles.mobileSecondary} data-has-school={item.school ? 'true' : 'false'}>
            {item.school ? <span className={styles.mobileSchool}>{item.school}</span> : null}
            <span className={styles.mobileDate}>
              {formatDate(item.startDate)}
              {hasEndDate ? (
                <span className={`${styles.mobileEndDate} ${isRefused ? styles.refusedText : ''}`}>
                  {formatDate(item.endDate)}
                  {outcomeLabel ? <span className={styles.apInline}>{outcomeLabel}</span> : null}
                </span>
              ) : null}
            </span>
          </span>
        </div>
        <HallWait item={item} className={waitClass} showApBadge={false} />
      </div>
    </article>
  )
}

function HallNotePopover({ item }: { item: CheckeeRecord }) {
  const compactNote = item.compactNote?.trim() || ''
  const detailNote = item.detailNote?.trim() || ''
  const displayNote = detailNote || compactNote

  if (!displayNote) return <span className={styles.standardNoteEmpty}>—</span>

  return (
    <Popover className={styles.standardNotePopover}>
      {({ open }) => (
        <>
          <PopoverButton type="button" className={styles.standardNoteButton} aria-expanded={open}>
            {open ? '收起' : '查看'}
          </PopoverButton>
          <PopoverPanel transition className={styles.standardNotePanel}>
            <strong>备注</strong>
            <p>{displayNote}</p>
          </PopoverPanel>
        </>
      )}
    </Popover>
  )
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav className={styles.pagination} aria-label="案例分页">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        <ChevronLeft size={16} aria-hidden="true" /> 上一页
      </button>
      <span>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        下一页 <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  )
}
