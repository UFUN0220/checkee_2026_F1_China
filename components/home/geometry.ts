// Desktop geometry baseline locked after Phase 6.
const UTILITY_CLUSTER_GAP = 24
const WEATHER_CLOCK_WIDTH = 280
const WEATHER_CLOCK_HEIGHT = 230
const WEATHER_CLOCK_Y = 44

export const desktopWidgets = {
  profile: { width: 420, height: 420, x: -210, y: -190, delay: 0 },
  contact: { width: 320, height: 120, x: -566, y: -214, delay: 80 },
  imageLeft: { width: 144, height: 144, x: -566, y: -382, delay: 40 },
  weather: { width: 264, height: 210, x: 236, y: -170, delay: 240 },
  worldClock: {
    width: WEATHER_CLOCK_WIDTH,
    height: WEATHER_CLOCK_HEIGHT,
    x: 300,
    y: WEATHER_CLOCK_Y,
    delay: 280,
  },
  calendar: { width: 320, height: 300, x: -566, y: -70, delay: 160 },
  // Keep Urge below the utility stack and clear of the pinned article edge.
  urge: {
    width: 192,
    height: 144,
    x: 300,
    y: WEATHER_CLOCK_Y + WEATHER_CLOCK_HEIGHT + UTILITY_CLUSTER_GAP,
    delay: 320,
  },
  latestArticle: { width: 280, height: 150, x: -296, y: 260, delay: 400 },
  pinnedArticle: { width: 280, height: 150, x: 16, y: 260, delay: 480 },
} as const

export type DesktopWidgetKey = keyof typeof desktopWidgets
