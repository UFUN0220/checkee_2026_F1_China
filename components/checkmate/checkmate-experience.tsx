'use client'

import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CHECKMATE_LOCATIONS,
  type CheckmateLocation,
  type CheckmateSnapshot,
  type HallSnapshot,
  type WaitStats,
} from '~/data/checkmate/types'
import {
  CHECKMATE_DATA_NOTICES,
  type CheckmateDataNotice,
  type CheckmatePageKey,
} from '~/data/checkmate/config'
import { DataDescription } from './data-description'
import styles from './checkmate-experience.module.css'

export type CheckmateView = 'cities' | 'peers'

const LOCATION_NAMES: Record<CheckmateLocation, string> = {
  beijing: '北京',
  shanghai: '上海',
  guangzhou: '广州',
  shenyang: '沈阳',
  wuhan: '武汉',
}

function formatDays(value: number | null) {
  if (value === null) return '—'
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function formatDate(value: string | null) {
  return value ? value.replace(/^2026-/, '').replace('-', '.') : '—'
}

export function CheckmateExperience({
  checkeeSnapshot,
  hallSnapshot,
  view,
}: {
  checkeeSnapshot: CheckmateSnapshot
  hallSnapshot: HallSnapshot
  view: CheckmateView
}) {
  const pageKey: CheckmatePageKey = view === 'peers' ? 'hall-of-fame' : 'white-house'
  const notice = CHECKMATE_DATA_NOTICES[pageKey]

  return (
    <section className={styles.feature} aria-label="Checkmate F-1 公开样本">
      {view === 'cities' ? (
        <WhiteHouseSelection snapshot={checkeeSnapshot} notice={notice} />
      ) : (
        <HallOfFame snapshot={hallSnapshot} notice={notice} />
      )}
    </section>
  )
}

function FeatureTitle({ children, trailing }: { children: string; trailing?: ReactNode }) {
  return (
    <div className={styles.titleRow}>
      <header className={styles.titleBlock}>
        <h1>{children}</h1>
      </header>
      {trailing}
    </div>
  )
}

function WhiteHouseSelection({
  snapshot,
  notice,
}: {
  snapshot: CheckmateSnapshot
  notice: CheckmateDataNotice
}) {
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
      <FeatureTitle>Checkee F-1 数据统计</FeatureTitle>
      <div className={styles.cityGrid} aria-label="五个城市的等待时长统计">
        {CHECKMATE_LOCATIONS.map((city) => {
          const metrics = snapshot.locations[city]
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
              <Quartiles stats={metrics.waitStats} />
            </button>
          )
        })}
      </div>
      <div className={styles.citiesContent}>
        <Trend
          trends={snapshot.monthlyF1Trends}
          stats={snapshot.national.waitStats}
          notice={notice}
          updatedAt={snapshot.manifest.snapshotDate}
        />
        <CityDetail
          city={selectedCity}
          cases={visibleCases}
          totalCases={selectedCases.length}
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
  notice,
  updatedAt,
}: {
  trends: CheckmateSnapshot['monthlyF1Trends']
  stats: WaitStats
  notice: CheckmateDataNotice
  updatedAt: string
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
      <div className={styles.panelHeading}>
        <h2>2026.1-8月数据(F-1签证Check时长)</h2>
        <DataDescription notice={notice} updatedAt={updatedAt} />
      </div>
      <div className={styles.trendSummary}>
        <strong>{summary.cases} cases</strong>
        <span>Clear {summary.clear}</span>
        <span>Pending {summary.pending}</span>
        <span>
          Avg {formatDays(summary.waitCount ? summary.weightedWait / summary.waitCount : null)} 天
        </span>
        <span className={styles.trendSummaryStats} aria-label="等待时长分位数">
          <span>Q1 {formatDays(stats.q1)} 天</span>
          <span>Median {formatDays(stats.median)} 天</span>
          <span>Q3 {formatDays(stats.q3)} 天</span>
        </span>
      </div>
      <div className={styles.trendTable} role="table" aria-label="2026 年 F-1 月度等待统计">
        <div className={`${styles.trendRow} ${styles.trendHeader}`} role="row">
          <span>月份</span>
          <span>Pending</span>
          <span>Clear</span>
          <span>Total</span>
          <span>平均</span>
        </div>
        {trends.map((trend) => (
          <div className={styles.trendRow} role="row" key={trend.month}>
            <strong>{Number(trend.month.slice(5))} 月</strong>
            <span>{trend.pendingCount}</span>
            <span>{trend.clearCount}</span>
            <span>{trend.totalCount}</span>
            <span>{formatDays(trend.averageWaitingDays)} 天</span>
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
  page,
  totalPages,
  onPageChange,
  onClose,
}: {
  city: CheckmateLocation | null
  cases: CheckmateSnapshot['cases']
  totalCases: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onClose: () => void
}) {
  if (!city)
    return (
      <section
        className={`${styles.panel} ${styles.cityDetail} ${styles.cityEmpty}`}
        aria-live="polite"
      >
        <MapPin size={18} strokeWidth={1.8} aria-hidden="true" />
        <span>选择一个城市查看最新案例</span>
      </section>
    )
  const [recentCases, olderCases] = splitColumns(cases)
  return (
    <section
      className={`${styles.panel} ${styles.cityDetail}`}
      aria-labelledby="checkmate-city-title"
    >
      <div className={styles.panelHeading}>
        <div>
          <h2 id="checkmate-city-title">{LOCATION_NAMES[city]} · 最新案例</h2>
          <span>{totalCases} 条 · Check Date DESC</span>
        </div>
        <button type="button" className={styles.textButton} onClick={onClose}>
          关闭
        </button>
      </div>
      <div className={styles.caseList} aria-label={`${LOCATION_NAMES[city]} 案例列表`}>
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
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </section>
  )
}

function splitColumns<T>(items: T[]): [T[], T[]] {
  const midpoint = Math.ceil(items.length / 2)
  return [items.slice(0, midpoint), items.slice(midpoint)]
}

function CityCaseRow({ item }: { item: CheckmateSnapshot['cases'][number] }) {
  return (
    <article className={styles.caseRow}>
      <div>
        <span className={`${styles.status} ${styles[`status${item.status}`]}`}>
          {item.status === 'pending' ? 'Pending' : item.status === 'clear' ? 'Clear' : 'Reject'}
        </span>
        <p>
          {formatDate(item.checkDate)} →{' '}
          {item.status === 'pending'
            ? `截至 ${formatDate(item.effectiveEndDate)}`
            : formatDate(item.completeDate)}
        </p>
      </div>
      <strong className={styles.caseDuration}>
        {formatDays(item.durationDays)}
        <small>天</small>
      </strong>
      <span className={styles.caseCategory}>{item.majorCategory}</span>
    </article>
  )
}

function HallOfFame({ snapshot, notice }: { snapshot: HallSnapshot; notice: CheckmateDataNotice }) {
  const [page, setPage] = useState(1)
  const cases = useMemo(
    () =>
      [...snapshot.cases].sort(
        (left, right) =>
          right.waitingDays - left.waitingDays || left.startDate.localeCompare(right.startDate)
      ),
    [snapshot.cases]
  )
  const podiumCases = [cases[1], cases[0], cases[2]].filter(Boolean)
  const eliteCases = cases.slice(3, 10)
  const standardCases = cases.slice(10)
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(standardCases.length / pageSize))
  const visibleCases = standardCases.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className={`${styles.view} ${styles.hallView}`}>
      <header className={styles.hallIntro}>
        <div className={styles.hallIntroCopy}>
          <h1>2026年度白宫严选中国硕博</h1>
        </div>
        <DataDescription notice={notice} updatedAt={snapshot.snapshotDate} />
      </header>

      <section className={styles.podiumSection} aria-labelledby="hall-podium-title">
        <h2 id="hall-podium-title" className={styles.visuallyHidden}>
          前三名荣誉展示
        </h2>
        <div className={styles.podiumGrid}>
          {podiumCases.map((item) => {
            const rank = cases.indexOf(item) + 1
            return <PodiumCard item={item} rank={rank} key={item.id} />
          })}
        </div>
      </section>

      <section className={styles.eliteSection} aria-label="等待时长排名">
        <div className={styles.hallSectionDivider} aria-hidden="true" />
        <div className={styles.eliteList}>
          {eliteCases.map((item, index) => (
            <EliteCaseRow item={item} rank={index + 4} key={item.id} />
          ))}
        </div>
      </section>

      <section className={styles.standardSection} aria-label="完整案例列表">
        <div className={styles.standardHeader} aria-hidden="true">
          <span>Rank</span>
          <span>Profile</span>
          <span>Wait</span>
          <span>Status</span>
          <span>Check → Complete</span>
          <span>Note</span>
        </div>
        <div className={styles.standardList}>
          {visibleCases.map((item, index) => (
            <StandardCaseRow
              item={item}
              rank={10 + (page - 1) * pageSize + index + 1}
              key={item.id}
            />
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </section>
    </div>
  )
}

function HallSectionHeading({ title, note, id }: { title: string; note: string; id: string }) {
  return (
    <header className={styles.hallSectionHeading}>
      <h2 id={id}>{title}</h2>
      <span>{note}</span>
    </header>
  )
}

function HallStatus({ status }: { status: HallSnapshot['cases'][number]['status'] }) {
  return (
    <span className={`${styles.status} ${styles[`status${status}`]}`}>
      {status === 'approved' ? 'Approved' : status === 'pending' ? 'Pending' : 'Other'}
    </span>
  )
}

function HallProfile({ item }: { item: HallSnapshot['cases'][number] }) {
  return (
    <span className={styles.hallProfile}>
      {[item.degree, item.major].filter(Boolean).join(' · ') || 'F-1 Case'}
      {item.mergedInfo ? <small>{item.mergedInfo}</small> : null}
    </span>
  )
}

function HallDates({ item }: { item: HallSnapshot['cases'][number] }) {
  return (
    <span className={styles.hallDates}>
      <span>CHECK {formatDate(item.startDate)}</span>
      <span>COMPLETE {item.endDate ? formatDate(item.endDate) : '—'}</span>
    </span>
  )
}

function PodiumCard({ item, rank }: { item: HallSnapshot['cases'][number]; rank: number }) {
  return (
    <article className={`${styles.podiumCard} ${styles[`podiumRank${rank}`]}`}>
      <span className={styles.podiumNumber} aria-hidden="true">
        {String(rank).padStart(2, '0')}
      </span>
      <div className={styles.podiumTopline}>
        <span>{rank === 1 ? 'Laureate' : rank === 2 ? 'Silver Circle' : 'Bronze Circle'}</span>
        <span>NO. {String(rank).padStart(2, '0')}</span>
      </div>
      <div className={styles.podiumContent}>
        <HallProfile item={item} />
        <strong className={styles.podiumDuration}>
          {item.waitingDays}
          <small>DAYS</small>
        </strong>
        <HallDates item={item} />
      </div>
      <HallStatus status={item.status} />
    </article>
  )
}

function EliteCaseRow({ item, rank }: { item: HallSnapshot['cases'][number]; rank: number }) {
  return (
    <article className={styles.eliteRow}>
      <strong className={styles.eliteRank}>{String(rank).padStart(2, '0')}</strong>
      <div className={styles.eliteIdentity}>
        <HallProfile item={item} />
        <HallDates item={item} />
      </div>
      <HallStatus status={item.status} />
      <strong className={styles.eliteDuration}>
        {item.waitingDays}
        <small>DAYS</small>
      </strong>
    </article>
  )
}

function StandardCaseRow({ item, rank }: { item: HallSnapshot['cases'][number]; rank: number }) {
  return (
    <article className={styles.standardRow}>
      <strong className={styles.standardRank}>{String(rank).padStart(2, '0')}</strong>
      <HallProfile item={item} />
      <strong className={styles.standardDuration}>
        {item.waitingDays}
        <small>DAYS</small>
      </strong>
      <HallStatus status={item.status} />
      <span className={styles.standardDates}>
        {formatDate(item.startDate)} <span aria-hidden="true">→</span>{' '}
        {item.endDate ? formatDate(item.endDate) : '—'}
      </span>
      <span className={styles.standardNote}>{item.mergedInfo || '—'}</span>
    </article>
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
