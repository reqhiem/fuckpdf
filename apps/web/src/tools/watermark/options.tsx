import type { WatermarkOptions } from '@fuckpdf/tools'
import {
  Button,
  ColorChoice,
  Description,
  Fieldset,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@fuckpdf/ui'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

const TYPES = [
  { id: 'text', label: 'typeText' },
  { id: 'image', label: 'typeImage' },
] as const

const MODES = [
  { id: 'positioned', label: 'modePositioned' },
  { id: 'tiled', label: 'modeTiled' },
] as const

const PLACEMENTS = [
  { id: 'center', label: 'positionCenter' },
  { id: 'top-left', label: 'positionTopLeft' },
  { id: 'top-right', label: 'positionTopRight' },
  { id: 'bottom-left', label: 'positionBottomLeft' },
  { id: 'bottom-right', label: 'positionBottomRight' },
] as const

const LAYERS = [
  { id: 'over', label: 'layerOver' },
  { id: 'under', label: 'layerUnder' },
] as const

export default function WatermarkOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as WatermarkOptions
  const type = options.type ?? 'text'
  const mode = options.mode ?? 'positioned'
  const position = options.position ?? 'center'
  const layer = options.layer ?? 'over'
  const color = options.color ?? '000000'
  const colourLabels = {
    custom: t('options.colour.custom'),
    area: t('options.colour.area'),
    hue: t('options.colour.hue'),
    hex: t('options.colour.hex'),
  }
  const picker = useRef<HTMLInputElement>(null)
  const [imageName, setImageName] = useState<string>()

  return (
    <div className="flex flex-col gap-4">
      <Fieldset>
        <Fieldset.Legend>{t('options.watermark.type')}</Fieldset.Legend>
        <ToggleButtonGroup
          aria-label={t('options.watermark.type')}
          disallowEmptySelection
          fullWidth
          onSelectionChange={(keys) =>
            onChange({ ...options, type: String([...keys][0] ?? type) as WatermarkOptions['type'] })
          }
          selectedKeys={[type]}
        >
          {TYPES.map((option) => (
            <ToggleButton id={option.id} key={option.id}>
              {t(`options.watermark.${option.label}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Fieldset>

      {type === 'text' ? (
        <TextField onChange={(text) => onChange({ ...options, text })} value={options.text ?? ''}>
          <Label>{t('options.watermark.text')}</Label>
          <Input />
        </TextField>
      ) : (
        <div className="flex flex-col gap-2">
          <Label>{t('options.watermark.image')}</Label>
          <Button className="w-full" onPress={() => picker.current?.click()} variant="secondary">
            {t(imageName ? 'options.watermark.imageReplace' : 'options.watermark.imagePick')}
          </Button>
          {imageName ? <p className="truncate text-sm text-muted">{imageName}</p> : null}
          <input
            accept="image/png, image/jpeg"
            aria-hidden="true"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const buffer = await file.arrayBuffer()
              setImageName(file.name)
              onChange({ ...options, imageBytes: new Uint8Array(buffer), imageMime: file.type })
            }}
            ref={picker}
            tabIndex={-1}
            type="file"
          />
        </div>
      )}

      {type === 'text' && (
        <>
          <ColorChoice
            label={t('options.watermark.color')}
            labels={colourLabels}
            onChange={(next) => onChange({ ...options, color: next })}
            value={color}
          />

          <NumberField
            minValue={1}
            onChange={(size) => onChange({ ...options, size: size ?? 48 })}
            value={options.size ?? 48}
          >
            <Label>{t('options.watermark.size')}</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input className="measure" />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
        </>
      )}

      <Fieldset>
        <Fieldset.Legend>{t('options.watermark.mode')}</Fieldset.Legend>
        <ToggleButtonGroup
          aria-label={t('options.watermark.mode')}
          disallowEmptySelection
          fullWidth
          onSelectionChange={(keys) =>
            onChange({ ...options, mode: String([...keys][0] ?? mode) as WatermarkOptions['mode'] })
          }
          selectedKeys={[mode]}
        >
          {MODES.map((option) => (
            <ToggleButton id={option.id} key={option.id}>
              {t(`options.watermark.${option.label}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Fieldset>

      {mode === 'positioned' && (
        <Select
          onChange={(key) =>
            onChange({
              ...options,
              position: String(key ?? position) as WatermarkOptions['position'],
            })
          }
          value={position}
        >
          <Label>{t('options.watermark.position')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {PLACEMENTS.map((option) => (
                <ListBox.Item
                  id={option.id}
                  key={option.id}
                  textValue={t(`options.watermark.${option.label}`)}
                >
                  {t(`options.watermark.${option.label}`)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      )}

      <Slider
        maxValue={1}
        onChange={(opacity) =>
          onChange({ ...options, opacity: Array.isArray(opacity) ? (opacity[0] ?? 0.5) : opacity })
        }
        formatOptions={{ style: 'percent' }}
        step={0.05}
        value={options.opacity ?? 0.5}
      >
        <Label>{t('options.watermark.opacity')}</Label>
        <Slider.Output className="measure" />
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>

      <Slider
        formatOptions={{ style: 'unit', unit: 'degree' }}
        maxValue={180}
        minValue={-180}
        onChange={(rotation) =>
          onChange({
            ...options,
            rotation: Array.isArray(rotation) ? (rotation[0] ?? 45) : rotation,
          })
        }
        step={5}
        value={options.rotation ?? 45}
      >
        <Label>{t('options.watermark.rotation')}</Label>
        <Slider.Output className="measure" />
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>

      <Fieldset>
        <Fieldset.Legend>{t('options.watermark.layer')}</Fieldset.Legend>
        <ToggleButtonGroup
          aria-label={t('options.watermark.layer')}
          disallowEmptySelection
          fullWidth
          onSelectionChange={(keys) =>
            onChange({
              ...options,
              layer: String([...keys][0] ?? layer) as WatermarkOptions['layer'],
            })
          }
          selectedKeys={[layer]}
        >
          {LAYERS.map((option) => (
            <ToggleButton id={option.id} key={option.id}>
              {t(`options.watermark.${option.label}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Fieldset>

      <TextField onChange={(pages) => onChange({ ...options, pages })} value={options.pages ?? ''}>
        <Label>{t('options.watermark.pages')}</Label>
        <Input className="measure" />
        <Description>{t('options.watermark.pagesHint')}</Description>
      </TextField>
    </div>
  )
}
