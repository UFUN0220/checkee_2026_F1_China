'use client'

import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  CHECKMATE_LOCATIONS,
  type CheckmateLocation,
  type CheckmateSnapshot,
  type HallSnapshot,
  type WaitStats,
} from '~/data/checkmate/types'
import styles from './checkmate-experience.module.css'

type View = 'cities' | 'peers'

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

function getView(value: string | null): View {
  return value === 'peers' ? 'peers' : 'cities'
}

function getCity(value: string | null): CheckmateLocation | null {
  return CHECKMATE_LOCATIONS.includes(value as CheckmateLocation)
    ? (value as CheckmateLocation)
    : null
}

export function CheckmateExperience({
  checkeeSnapshot,
  hallSnapshot,
}: {
  checkeeSnapshot: CheckmateSnapshot
  hallSnapshot: HallSnapshot
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeView = getView(searchParams.get('view'))
  const selectedCity = activeView === 'cities' ? getCity(searchParams.get('city')) : null

  const updateSearchParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null) params.delete(key)
      else params.set(key, value)
    })
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <section className={styles.feature} aria-label="Checkmate F-1 公开样本">
      <nav className={styles.tabs} aria-label="Checkmate 页面">
        <button
          type="button"
          className={activeView === 'cities' ? styles.tabActive : styles.tab}
          aria-current={activeView === 'cities' ? 'page' : undefined}
          onClick={() => updateSearchParams({ view: 'cities' })}
        >
          白宫严选
        </button>
        <button
          type="button"
          className={activeView === 'peers' ? styles.tabActive : styles.tab}
          aria-current={activeView === 'peers' ? 'page' : undefined}
          onClick={() => updateSearchParams({ view: 'peers' })}
        >
          名人堂
        </button>
      </nav>
      {activeView === 'cities' ? (
        <WhiteHouseSelection
          snapshot={checkeeSnapshot}
          selectedCity={selectedCity}
          onCityChange={(city) => updateSearchParams({ view: 'cities', city })}
        />
      ) : (
        <HallOfFame snapshot={hallSnapshot} />
      )}
      <p className={styles.disclaimer}>
        数据截至 2026-09-01 · 公开样本统计仅供参考，不代表官方处理时间或个人结果。
      </p>
    </section>
  )
}

function FeatureTitle({ children, meta }: { children: string; meta: string }) {
  return (
    <header className={styles.titleBlock}>
      <h1>{children}</h1>
      <p>{meta}</p>
    </header>
  )
}

function WhiteHouseSelection({
  snapshot,
  selectedCity,
  onCityChange,
}: {
  snapshot: CheckmateSnapshot
  selectedCity: CheckmateLocation | null
  onCityChange: (city: CheckmateLocation | null) => void
}) {
  const [page, setPage] = useState(1)
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
    <div className={styles.view}>
      <FeatureTitle meta={`截至 ${snapshot.manifest.snapshotDate}`}>
        2026年度白宫严选中国F1硕博
      </FeatureTitle>
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
              onClick={() => onCityChange(active ? null : city)}
            >
              <span className={styles.cityName}>{LOCATION_NAMES[city]}</span>
              <Quartiles stats={metrics.waitStats} />
              <span className={styles.cityCount}>{metrics.sampleCount} 个样本</span>
            </button>
          )
        })}
      </div>
      <div className={styles.citiesContent}>
        <Trend trends={snapshot.monthlyF1Trends} />
        <CityDetail
          city={selectedCity}
          cases={visibleCases}
          totalCases={selectedCases.length}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onClose={() => onCityChange(null)}
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

function Trend({ trends }: { trends: CheckmateSnapshot['monthlyF1Trends'] }) {
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
        <h2>月度趋势</h2>
        <span>1–8 月</span>
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
      <div className={styles.trendSummary}>
        <span>Pending {summary.pending}</span>
        <span>Clear {summary.clear}</span>
        <strong>{summary.cases} cases</strong>
        <span>
          Avg {formatDays(summary.waitCount ? summary.weightedWait / summary.waitCount : null)} 天
        </span>
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
      <section className={`${styles.panel} ${styles.cityEmpty}`} aria-live="polite">
        <MapPin size={18} strokeWidth={1.8} aria-hidden="true" />
        <span>选择一个城市查看最新案例</span>
      </section>
    )
  return (
    <section className={styles.panel} aria-labelledby="checkmate-city-title">
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
        {cases.map((item) => (
          <article className={styles.caseRow} key={item.publicId}>
            <div>
              <span className={`${styles.status} ${styles[`status${item.status}`]}`}>
                {item.status === 'pending'
                  ? 'Pending'
                  : item.status === 'clear'
                    ? 'Clear'
                    : 'Reject'}
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
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </section>
  )
}

function HallOfFame({ snapshot }: { snapshot: HallSnapshot }) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const cases = useMemo(
    () => [...snapshot.cases].sort((left, right) => left.startDate.localeCompare(right.startDate)),
    [snapshot.cases]
  )
  const totalPages = Math.max(1, Math.ceil(cases.length / 10))
  const visibleCases = cases.slice((page - 1) * 10, page * 10)
  const toggleExpanded = () => {
    setExpanded((value) => !value)
    setPage(1)
  }
  return (
    <div className={styles.view}>
      <FeatureTitle meta={`${snapshot.metrics.totalCases} 个案例 · 截至 ${snapshot.snapshotDate}`}>
        名人堂
      </FeatureTitle>
      <section className={styles.hallSurface} aria-label="名人堂核心统计">
        <div className={styles.countStats}>
          <div>
            <small>案例</small>
            <strong>{snapshot.metrics.totalCases}</strong>
          </div>
          <div>
            <small>Approve</small>
            <strong>{snapshot.metrics.approvedCases}</strong>
          </div>
        </div>
        <div className={styles.hallQuartiles}>
          <Quartiles stats={snapshot.metrics.waitingStats} />
        </div>
      </section>
      <div className={styles.hallAction}>
        <button
          type="button"
          className={styles.secondaryButton}
          aria-expanded={expanded}
          onClick={toggleExpanded}
        >
          {expanded ? '收起' : '展开案例'}
        </button>
      </div>
      {expanded ? (
        <section className={styles.panel} aria-label="名人堂案例">
          <p className={styles.listNote}>
            全部 {cases.length} 条记录 · 按面签日期升序 · 每页 10 条
          </p>
          <div className={styles.caseList}>
            {visibleCases.map((item) => (
              <article className={styles.caseRow} key={item.id}>
                <div>
                  <span className={`${styles.status} ${styles[`status${item.status}`]}`}>
                    {item.status === 'approved'
                      ? 'Approved'
                      : item.status === 'pending'
                        ? 'Pending'
                        : 'Other'}
                  </span>
                  <p>
                    {formatDate(item.startDate)} →{' '}
                    {item.endDate
                      ? formatDate(item.endDate)
                      : `截至 ${formatDate(item.effectiveEndDate)}`}
                  </p>
                </div>
                <strong className={styles.caseDuration}>
                  {item.waitingDays}
                  <small>天</small>
                </strong>
                <span className={styles.caseCategory}>
                  {[item.degree, item.major, item.mergedInfo].filter(Boolean).join(' · ') || '—'}
                </span>
              </article>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      ) : null}
    </div>
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
