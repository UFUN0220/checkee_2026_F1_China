import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hall Admin',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh]">{children}</div>
}
