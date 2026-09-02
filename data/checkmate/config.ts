export type CheckmatePageKey = 'white-house' | 'hall-of-fame'

export type CheckmateDataNotice = {
  title: string
  content: string
}

export const CHECKMATE_DATA_NOTICES: Record<CheckmatePageKey, CheckmateDataNotice> = {
  'white-house': {
    title: '白宫严选 · 数据说明',
    content:
      '本页基于公开样本整理，按城市展示 F-1 相关案例的等待时长与月度统计。数据用于观察样本趋势，不代表官方处理时间或个人结果。',
  },
  'hall-of-fame': {
    title: '名人堂 · 数据说明',
    content:
      '本页基于公开案例记录整理，展示样本中的批准数量、等待时长与案例明细。统计仅反映当前样本，不代表完整人群或官方结论。',
  },
}
