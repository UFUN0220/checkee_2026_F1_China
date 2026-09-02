const { fontFamily } = require('tailwindcss/defaultTheme')
const colors = require('tailwindcss/colors')

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,tsx}',
    './components/**/*.{js,ts,tsx}',
    './layouts/**/*.{js,ts,tsx}',
    './data/**/*.mdx',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        // ✨ 新版 Wiggle: 铃铛左右快速摇晃 (-3度 到 3度)
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        // 点击时的弹性缩放效果 (保留)
        'scale-up': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        // ✨ 新版动画配置: 0.3s 快速循环，实现"震动"感
        wiggle: 'wiggle 0.3s ease-in-out infinite',

        // 其他保留
        'scale-up': 'scale-up 150ms ease-in-out forwards',
      },

      boxShadow: {
        demure: 'rgba(0, 0, 0, 0.3) 0 35px 60px -15px',
        'book-pages': `10px 40px 40px -10px #00000030, inset -2px 0 0 gray,
                        inset -3px 0 0 #dbdbdb, inset -4px 0 0 white, inset -5px 0 0 #dbdbdb,
                        inset -6px 0 0 white, inset -7px 0 0 #dbdbdb, inset -8px 0 0 white,
                        inset -9px 0 0 #dbdbdb`,
        mondegreen: `5px 5px rgba(0, 98, 90, 0.4),
                      10px 10px rgba(0, 98, 90, 0.3),
                      15px 15px rgba(0, 98, 90, 0.2),
                      20px 20px rgba(0, 98, 90, 0.1),
                      25px 25px rgba(0, 98, 90, 0.05)`,
      },
      lineHeight: {
        11: '2.75rem',
        12: '3rem',
        13: '3.25rem',
        14: '3.5rem',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          // 其他常见系统的备用字体
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'var(--font-nunito)',
          ...fontFamily.sans,
        ],
        heishenhua: ['heishenhua', ...fontFamily.sans],
        roadrage: ['roadrage', ...fontFamily.sans],
        serif: ['Noto Serif', 'Noto Serif SC', 'serif'],
        // serif: [
        //   // 优先使用Noto系列的西文衬线体来处理字母和数字
        //   'Noto Serif',
        //   // 然后是其他可靠的西文衬线体作为备选
        //   'Georgia',
        //   'Times New Roman',
        //   // 最后才是中文字体
        //   'Noto Serif SC',
        //   'SimSun', // 宋体，是Noto Serif SC的备用
        //   'serif' // 通用衬线字体族，必须放在最后
        // ],
        greeting: ['var(--font-playpen-sans)'],
        mono: ['var(--font-jetbrains-mono)', ...fontFamily.mono],
      },
      colors: {
        primary: colors.indigo,
        dark: '#121212',
        'dark-text': '#ffffff', // 暗色模式下的文本颜色
        goodreads: '#372213',
        facebook: '#1877f2',
        twitter: '#0f1419',
        linkedin: '#0077B5',
        'solarized-light': '#fdfaf6',
        'github-dark-dimmed': '#22272e',
        'code-block': '#36313d',
      },
      width: {
        4.5: '1.125rem',
        5.5: '1.375rem',
      },
      height: {
        4.5: '1.125rem',
        5.5: '1.375rem',
      },
      spacing: {
        15: '3.75rem',
      },
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            a: {
              color: theme('colors.primary.500'),
              'text-underline-offset': '4px',
              '&:hover': {
                color: `${theme('colors.primary.600')}`,
              },
              code: { color: theme('colors.primary.400') },
            },
            'h1,h2,h3,h4,h5,h6': {
              scrollMarginTop: '6rem',
            },
            'h1,h2': {
              fontWeight: '700',
              letterSpacing: theme('letterSpacing.tight'),
            },
            h3: {
              fontWeight: '600',
            },
            '.remark-code-title': {
              '+ figure': {
                '> div': {
                  borderTop: 0,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                },
                '.copy-code': {
                  display: 'none',
                },
              },
            },
            figure: {
              marginTop: 0,
            },
            pre: {
              margin: 0,
              code: {
                fontWeight: '500',
                span: {
                  color: 'var(--shiki-light, inherit)',
                  fontStyle: 'var(--shiki-light-font-style, inherit)',
                  fontWeight: 'var(--shiki-light-font-weight, inherit)',
                  textDecoration: 'var(--shiki-light-text-decoration, inherit)',
                },
              },
            },
            '[data-line]': {
              marginLeft: '-1.5rem',
              paddingLeft: '1rem',
            },
            '[data-line-numbers]': {
              counterReset: 'line',
              '[data-line]::before': {
                counterIncrement: 'line',
                content: 'counter(line)',
                display: 'inline-block',
                width: '0.75rem',
                marginRight: '2rem',
                textAlign: 'right',
                color: '#657B83',
              },
            },
            '[data-line-numbers-max-digits="2"]': {
              '[data-line]::before': {
                width: '1.25rem',
              },
            },
            '[data-line-numbers-max-digits="3"]': {
              '[data-line]::before': {
                width: '1.75rem',
              },
            },
            '[data-line-numbers-max-digits="4"]': {
              '[data-line]::before': {
                width: '2.25rem',
              },
            },
            '[data-highlighted-line]': {
              backgroundColor: '#fbf0ea',
              borderLeft: '4px solid theme(colors.gray.400)',
              paddingLeft: '.75rem',
            },
            '[data-highlighted-chars]': {
              boxShadow: '0 0 0 4px rgb(82 82 91 / 0.5)',
              borderRadius: '0.25rem',
              backgroundColor: 'theme(colors.zinc.600)',
            },
            '[data-chars-id]': {
              boxShadow: 'none',
              padding: '.25rem',
              borderBottom: '2px solid theme(colors.gray.800)',
            },
            code: {
              color: theme('colors.indigo.500'),
              fontWeight: '500',
            },
            '.image-container': {
              width: 'fit-content',
              marginLeft: 'auto',
              marginRight: 'auto',
              borderRadius: '0.5rem',
              img: {
                marginTop: 0,
                marginBottom: 0,
              },
            },
            '.markdown-alert': {
              'p.markdown-alert-title': {
                fontSize: '1.125rem',
                fontWeight: '700',
                marginBottom: '0',
                marginTop: '0.5rem',
                svg: {
                  width: '20px',
                  height: '20px',
                },
              },
            },
          },
        },
        lg: {
          css: {
            figure: {
              marginTop: 0,
            },
            pre: {
              margin: 0,
              borderRadius: 0,
              code: {
                fontSize: '0.95em',
              },
            },
          },
        },
        invert: {
          css: {
            color: theme('colors.dark-text'), // 暗色模式下的文本颜色
            a: {
              color: theme('colors.primary.400'),
              '&:hover': {
                color: `${theme('colors.primary.400')}`,
              },
              'h1,h2,h3,h4,h5,h6': {
                color: theme('colors.dark-text'), // 暗色模式下的标题颜色
              },
              code: { color: theme('colors.primary.400') },
            },
            pre: {
              code: {
                span: {
                  color: 'var(--shiki-dark, inherit)',
                  fontStyle: 'var(--shiki-dark-font-style, inherit)',
                  fontWeight: 'var(--shiki-dark-font-weight, inherit)',
                  textDecoration: 'var(--shiki-dark-text-decoration, inherit)',
                },
              },
            },
            '[data-highlighted-line]': {
              backgroundColor: '#37415180',
              borderLeft: '4px solid theme(colors.gray.500)',
              paddingLeft: '.75rem',
            },
            code: {
              color: theme('colors.primary.400'),
            },
            'h1,h2,h3,h4,h5,h6': {
              color: theme('colors.gray.100'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    function ({ addBase }) {
      addBase({
        body: {
          fontFamily: 'Noto Serif SC, serif',
        },
      })
    },
  ],
}
