export const SITE_METADATA = {
  title: `uFun Pre - UFUN (中国大陆)`,
  author: 'You Fang',
  headerTitle: `UFUN：）`,
  description: '由心以暇，放鹿青崖。',
  // 'Heart wanders, hart vanishes.',
  language: 'en-us',
  theme: 'system', // system, dark or light
  siteUrl: 'https://www.yvon.dev',
  siteRepo: 'https://github.com/UFUN0220/yvon.dev',
  siteLogo: `${process.env.BASE_PATH || ''}/static/images/const/logo.jpg`,
  socialBanner: `${process.env.BASE_PATH || ''}/static/images/const/logo.jpg`,
  email: 'youfang0402@163.com',
  github: 'https://github.com/UFUN0220',
  instagram: 'https://www.instagram.com/hta218_',
  linkedin: 'https://www.linkedin.com/in/fangyou11/',
  x: 'UFUN0220',
  locale: 'en-US',
  stickyNav: true,
  analytics: {
    umamiAnalytics: {
      //websiteId: process.env.NEXT_UMAMI_ID,
      websiteId: '',
      shareUrl: 'https://analytics.leohuynh.dev/share/c9ErglxqzY5CQJ8g/leohuynh.dev',
    },
    simpleAnalytics: false,
  },
  newsletter: {
    // supports mailchimp, buttondown, convertkit, klaviyo, revue, emailoctopus, beehive
    // Please add your .env file and modify it according to your selection
    provider: 'buttondown',
  },
  comments: {
    giscusConfigs: {
      repo: process.env.NEXT_PUBLIC_GISCUS_REPO!,
      repositoryId: process.env.NEXT_PUBLIC_GISCUS_REPOSITORY_ID!,
      category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY!,
      categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID!,
      mapping: 'title', // supported options: pathname, url, title
      reactions: '1', // Emoji reactions: 1 = enable / 0 = disable
      metadata: '0',
      theme: 'light',
      darkTheme: 'transparent_dark',
      themeURL: '',
      lang: 'en',
    },
  },
  search: {
    kbarConfigs: {
      // path to load documents to search
      searchDocumentsPath: `${process.env.BASE_PATH || ''}/search.json`,
    },
  },
  support: {
    buyMeACoffee: 'https://www.buymeacoffee.com/leohuynh.dev',
    paypal: 'https://paypal.me/hta218?country.x=VN&locale.x=en_US',
    kofi: 'https://ko-fi.com/hta218',
  },
}
