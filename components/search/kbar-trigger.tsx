import { useKBar } from 'kbar'
import { Search } from 'lucide-react'

export function KbarSearchTrigger() {
  const { query } = useKBar()

  return (
    <button
      aria-label="Search"
      className="nav-interactive h-11 w-11 justify-center p-0"
      data-umami-event="search-the-site"
      onClick={() => query.toggle()}
    >
      <Search size={20} strokeWidth={1.5} />
    </button>
  )
}
