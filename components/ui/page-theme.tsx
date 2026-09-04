import type { ReactNode } from 'react'

export type PageThemeName = 'reading' | 'hall' | 'view'

export function PageTheme({ theme, children }: { theme: PageThemeName; children: ReactNode }) {
  return (
    <div className="page-theme-shell" data-page-theme={theme}>
      {children}
    </div>
  )
}
