import { IconGroup } from '~/app/about/icon_fun'
import { WidgetShell } from './widget-shell'

export function ContactCluster({ layout = 'desktop' }: { layout?: 'desktop' | 'flow' }) {
  return (
    <WidgetShell widget="contact" label="Contact and identity" layout={layout}>
      <div className="home-contact-card">
        <IconGroup className="home-contact-icons" />
      </div>
    </WidgetShell>
  )
}
