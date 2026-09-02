import type { ReactNode } from 'react'

export function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table>{children}</table>
    </div>
  )
}
