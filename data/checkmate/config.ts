export type CheckmatePageKey = 'white-house' | 'hall-of-fame'

export type CheckmateDataNotice = {
  title: string
  content: string
}

export const CHECKMATE_DATA_NOTICES: Record<CheckmatePageKey, CheckmateDataNotice> = {
  'white-house': {
    title: '白宫严选 · 数据说明',
    content: '统计与名人堂数据异步更新。当前统计数据截至 2026.09.07，名人堂数据截至 2026.09.09。',
  },
  'hall-of-fame': {
    title: '名人堂 · 数据说明',
    content: '统计与名人堂数据异步更新。当前统计数据截至 2026.09.07，名人堂数据截至 2026.09.09。',
  },
}
