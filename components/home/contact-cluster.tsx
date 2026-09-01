import { IconGroup } from '~/app/about/icon_fun'
import { WidgetShell } from './widget-shell'

export function ContactCluster() {
  return (
    <WidgetShell widget="contact" label="Contact and identity">
      <div className="home-contact-card">
        <IconGroup className="home-contact-icons" />
      </div>
    </WidgetShell>
  )
}
