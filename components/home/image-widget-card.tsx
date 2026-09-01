import { WidgetShell } from './widget-shell'

const IMAGE_CARDS = {
  left: {
    src: '/static/images/mainPage/washu_sky.jpg',
    alt: 'Default left homepage image',
    widget: 'imageLeft' as const,
    label: 'Homepage image, left',
  },
} as const

export function ImageWidgetCard({ side }: { side: keyof typeof IMAGE_CARDS }) {
  const image = IMAGE_CARDS[side]

  return (
    <WidgetShell widget={image.widget} label={image.label}>
      <div className="home-image-card">
        <img src={image.src} alt={image.alt} draggable={false} />
      </div>
    </WidgetShell>
  )
}
