import { cx, Dropdown, Label } from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import { ConvertTrigger, converters } from './convert-trigger'
import { icons } from './icons'

export default function ConvertMenu({ current }: { current: string }) {
  const { t } = useTranslation()
  return (
    <Dropdown>
      <ConvertTrigger active={converters.some((id) => id === current)} />
      <Dropdown.Popover>
        <Dropdown.Menu>
          {converters.map((id) => {
            const Icon = icons[id]
            return (
              <Dropdown.Item
                aria-current={current === id ? 'page' : undefined}
                href={`/${id}`}
                id={id}
                key={id}
                textValue={t(`tools.${id}.name`)}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" />
                <Label className={cx(current === id && 'text-accent')}>
                  {t(`tools.${id}.name`)}
                </Label>
              </Dropdown.Item>
            )
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
