// Desktop geometry baseline locked after Phase 6.
export const desktopWidgets = {
  profile: { width: 420, height: 420, x: -210, y: -190, delay: 0 },
  contact: { width: 320, height: 120, x: -566, y: -214, delay: 80 },
  imageLeft: { width: 144, height: 144, x: -566, y: -382, delay: 40 },
  weather: { width: 290, height: 230, x: 236, y: -170, delay: 240 },
  worldClock: { width: 290, height: 170, x: 236, y: 84, delay: 280 },
  calendar: { width: 320, height: 300, x: -566, y: -70, delay: 160 },
  // Original Urge size/x restored; y stays below World Clock to avoid overlap.
  urge: { width: 192, height: 144, x: 260, y: 278, delay: 320 },
  latestArticle: { width: 280, height: 150, x: -296, y: 260, delay: 400 },
  pinnedArticle: { width: 280, height: 150, x: 16, y: 260, delay: 480 },
} as const

export type DesktopWidgetKey = keyof typeof desktopWidgets
