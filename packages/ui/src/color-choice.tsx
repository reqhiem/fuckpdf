import {
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  Fieldset,
} from '@heroui/react'
import type { ReactNode } from 'react'

const PRESETS = ['000000', 'ffffff', 'e03131', 'f08c00', 'ffe14d', '2f9e44', '1971c2', '7048e8']
const HEX = /^[0-9a-f]{6}$/i
// Keeps white on paper and ink on the dark ground visible.
const RING = 'shadow-[inset_0_0_0_1px_var(--border)]'

type ColorChoiceProps = {
  label: string
  /** Six hex digits, no leading hash. */
  value: string
  onChange: (value: string) => void
  labels: { custom: string; area: string; hue: string; hex: string }
  swatches?: string[]
  action?: ReactNode
  /** Shown instead of the swatches when `value` is empty. */
  empty?: ReactNode
}

export function ColorChoice({
  label,
  value,
  onChange,
  labels,
  swatches = PRESETS,
  action,
  empty,
}: ColorChoiceProps) {
  const colour = `#${HEX.test(value) ? value.toLowerCase() : '000000'}`
  const custom = !swatches.some((swatch) => `#${swatch.toLowerCase()}` === colour)
  const pick = (next: { toString: (format: 'hex') => string } | null) => {
    if (next) onChange(next.toString('hex').slice(1).toLowerCase())
  }

  return (
    <Fieldset aria-label={label} className="gap-2">
      <div className="flex items-center justify-between">
        <Fieldset.Legend>{label}</Fieldset.Legend>
        {action}
      </div>
      {!value && empty ? (
        empty
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <ColorSwatchPicker
            aria-label={label}
            className="gap-1.5"
            onChange={pick}
            size="sm"
            value={colour}
          >
            {swatches.map((swatch) => (
              <ColorSwatchPicker.Item
                className="data-[selected=true]:border-foreground"
                color={`#${swatch}`}
                key={swatch}
              >
                <ColorSwatchPicker.Swatch className={RING} />
                <ColorSwatchPicker.Indicator />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
          <ColorPicker onChange={pick} value={colour}>
            <ColorPicker.Trigger
              aria-label={labels.custom}
              className={`size-6 rounded-xl border-2 p-0 ${custom ? 'border-foreground' : 'border-transparent'}`}
            >
              {custom ? (
                <ColorSwatch className={`size-full scale-[0.77] rounded-[inherit] ${RING}`} />
              ) : (
                <span
                  aria-hidden="true"
                  className={`block size-full rounded-[inherit] bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] ${RING}`}
                />
              )}
            </ColorPicker.Trigger>
            <ColorPicker.Popover className="gap-2">
              <ColorArea
                aria-label={labels.area}
                className="max-w-full"
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
              >
                <ColorArea.Thumb />
              </ColorArea>
              <ColorSlider aria-label={labels.hue} channel="hue" className="px-1" colorSpace="hsb">
                <ColorSlider.Track>
                  <ColorSlider.Thumb />
                </ColorSlider.Track>
              </ColorSlider>
              <ColorField aria-label={labels.hex}>
                <ColorField.Group variant="secondary">
                  <ColorField.Prefix>
                    <ColorSwatch className={RING} size="xs" />
                  </ColorField.Prefix>
                  <ColorField.Input className="measure" />
                </ColorField.Group>
              </ColorField>
            </ColorPicker.Popover>
          </ColorPicker>
        </div>
      )}
    </Fieldset>
  )
}
