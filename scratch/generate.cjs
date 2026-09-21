const fs = require('fs');
const path = require('path');

const localesDir = path.join('/home/joel/Documents/dev/fuckpdf/apps/web/src/locales');
fs.mkdirSync(localesDir, { recursive: true });

const enOptionsJson = {
  "options": {
    "merge": {
      "order": "File order (one name per line)",
      "ranges": "Page ranges (filename=1-5, one per line)"
    },
    "split": {
      "mode": "Split mode",
      "modeAll": "Extract all pages",
      "modeCustom": "Custom ranges",
      "modeEveryN": "Every N pages",
      "modeSize": "By max file size",
      "ranges": "Custom ranges (comma separated)",
      "everyN": "Pages per split",
      "maxSize": "Max file size (bytes)",
      "zip": "Output as ZIP"
    },
    "remove-pages": {
      "pages": "Pages to remove (e.g. 1-5, 8)"
    },
    "extract-pages": {
      "pages": "Pages to extract (e.g. 1-5, 8)",
      "split": "Extract each page to a separate file"
    },
    "organize": {
      "addBlank": "Insert blank page"
    },
    "rotate": {
      "angle": "Rotation angle",
      "pages": "Pages to rotate (empty for all)"
    },
    "page-numbers": {
      "position": "Position",
      "firstNumber": "First number",
      "pages": "Pages to number (empty for all)",
      "format": "Format (use {n} and {total})",
      "font": "Font",
      "size": "Font size",
      "color": "Text color",
      "margin": "Margin"
    },
    "watermark": {
      "type": "Watermark type",
      "typeText": "Text",
      "typeImage": "Image",
      "text": "Text",
      "image": "Image file",
      "mode": "Placement mode",
      "modePositioned": "Positioned",
      "modeTiled": "Tiled",
      "position": "Position",
      "opacity": "Opacity",
      "rotation": "Rotation (degrees)",
      "layer": "Layer",
      "layerOver": "Over content",
      "layerUnder": "Under content",
      "pages": "Pages to watermark",
      "color": "Color",
      "size": "Size"
    },
    "crop": {
      "boxX": "X",
      "boxY": "Y",
      "boxWidth": "Width",
      "boxHeight": "Height",
      "pages": "Pages to crop",
      "flatten": "Flatten (rasterize)"
    },
    "jpg-to-pdf": {
      "pageSize": "Page size",
      "orientation": "Orientation",
      "margin": "Margin",
      "fitMode": "Fit mode"
    },
    "pdf-to-jpg": {
      "dpi": "DPI (72-300)",
      "format": "Format"
    }
  }
};
fs.writeFileSync(path.join(localesDir, 'en.options.json'), JSON.stringify(enOptionsJson, null, 2));

const inputClass = "w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20";
const labelClass = "flex flex-col gap-1";
const spanClass = "text-sm font-medium text-ink dark:text-paper";

const components = {
  'merge': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { MergeOptions } from '@fuckpdf/tools/src/merge'

export default function MergeOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as MergeOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.merge.order')}</span>
        <textarea
          className="${inputClass}"
          value={options.order?.join('\\n') ?? ''}
          onChange={(e) => onChange({ ...options, order: e.target.value.split('\\n').filter(Boolean) })}
        />
      </label>
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.merge.ranges')}</span>
        <textarea
          className="${inputClass}"
          value={Object.entries(options.ranges ?? {}).map(([k, v]) => \`\${k}=\${v}\`).join('\\n')}
          onChange={(e) => {
            const ranges: Record<string, string> = {}
            for (const line of e.target.value.split('\\n')) {
              const [k, v] = line.split('=')
              if (k && v) ranges[k.trim()] = v.trim()
            }
            onChange({ ...options, ranges })
          }}
        />
      </label>
    </div>
  )
}
  `,
  'split': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { SplitOptions, SplitMode } from '@fuckpdf/tools/src/split'

export default function SplitOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as SplitOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.split.mode')}</span>
        <select
          className="${inputClass}"
          value={options.mode ?? 'all'}
          onChange={(e) => onChange({ ...options, mode: e.target.value as SplitMode })}
        >
          <option value="all">{t('options.split.modeAll')}</option>
          <option value="custom">{t('options.split.modeCustom')}</option>
          <option value="every-n">{t('options.split.modeEveryN')}</option>
          <option value="size">{t('options.split.modeSize')}</option>
        </select>
      </label>
      
      {options.mode === 'custom' && (
        <label className="${labelClass}">
          <span className="${spanClass}">{t('options.split.ranges')}</span>
          <input
            className="${inputClass}"
            type="text"
            value={options.ranges?.join(',') ?? ''}
            onChange={(e) => onChange({ ...options, ranges: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          />
        </label>
      )}

      {options.mode === 'every-n' && (
        <label className="${labelClass}">
          <span className="${spanClass}">{t('options.split.everyN')}</span>
          <input
            className="${inputClass}"
            type="number"
            min={1}
            value={options.everyN ?? 1}
            onChange={(e) => onChange({ ...options, everyN: Number(e.target.value) })}
          />
        </label>
      )}

      {options.mode === 'size' && (
        <label className="${labelClass}">
          <span className="${spanClass}">{t('options.split.maxSize')}</span>
          <input
            className="${inputClass}"
            type="number"
            min={1}
            value={options.maxSize ?? 1000000}
            onChange={(e) => onChange({ ...options, maxSize: Number(e.target.value) })}
          />
        </label>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={options.zip ?? false}
          onChange={(e) => onChange({ ...options, zip: e.target.checked })}
        />
        <span className="${spanClass}">{t('options.split.zip')}</span>
      </label>
    </div>
  )
}
  `,
  'remove-pages': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { RemovePagesOptions } from '@fuckpdf/tools/src/remove-pages'

export default function RemovePagesOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as RemovePagesOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.remove-pages.pages')}</span>
        <input
          className="${inputClass}"
          type="text"
          value={options.pages ?? ''}
          onChange={(e) => onChange({ ...options, pages: e.target.value })}
        />
      </label>
    </div>
  )
}
  `,
  'extract-pages': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { ExtractPagesOptions } from '@fuckpdf/tools/src/extract-pages'

export default function ExtractPagesOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as ExtractPagesOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.extract-pages.pages')}</span>
        <input
          className="${inputClass}"
          type="text"
          value={options.pages ?? ''}
          onChange={(e) => onChange({ ...options, pages: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={options.split ?? false}
          onChange={(e) => onChange({ ...options, split: e.target.checked })}
        />
        <span className="${spanClass}">{t('options.extract-pages.split')}</span>
      </label>
    </div>
  )
}
  `,
  'organize': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { OrganizeOptions } from '@fuckpdf/tools/src/organize'

export default function OrganizeOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as OrganizeOptions

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        onClick={() => onChange({ ...options, operations: [...(options.operations || []), { type: 'blank' }] })}
      >
        {t('options.organize.addBlank')}
      </button>
    </div>
  )
}
  `,
  'rotate': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { RotateOptions } from '@fuckpdf/tools/src/rotate'

export default function RotateOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as RotateOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.rotate.angle')}</span>
        <select
          className="${inputClass}"
          value={options.angle ?? 90}
          onChange={(e) => onChange({ ...options, angle: Number(e.target.value) })}
        >
          <option value={90}>90°</option>
          <option value={180}>180°</option>
          <option value={270}>270°</option>
        </select>
      </label>
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.rotate.pages')}</span>
        <input
          className="${inputClass}"
          type="text"
          value={options.pages ?? ''}
          onChange={(e) => onChange({ ...options, pages: e.target.value })}
        />
      </label>
    </div>
  )
}
  `,
  'page-numbers': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { PageNumbersOptions, PositionAnchor } from '@fuckpdf/tools/src/page-numbers'

const POSITIONS: PositionAnchor[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right'
]

export default function PageNumbersOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as PageNumbersOptions

  return (
    <div className="flex flex-col gap-4">
      <div className="${labelClass}">
        <span className="${spanClass}">{t('options.page-numbers.position')}</span>
        <div className="grid grid-cols-3 gap-2 w-32">
          {POSITIONS.map(pos => (
            <button
              key={pos}
              type="button"
              className={\`flex h-10 w-10 items-center justify-center rounded-md border focus:outline-2 focus:outline-accent \${options.position === pos ? 'border-accent bg-accent/10' : 'border-ink/20 dark:border-paper/20'}\`}
              onClick={() => onChange({ ...options, position: pos })}
            >
              <div className={\`h-2 w-2 bg-current \${pos.includes('left') ? 'mr-auto ml-1' : pos.includes('right') ? 'ml-auto mr-1' : ''} \${pos.includes('top') ? 'mb-auto mt-1' : pos.includes('bottom') ? 'mt-auto mb-1' : ''}\`} />
            </button>
          ))}
        </div>
      </div>
      
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.page-numbers.firstNumber')}</span>
        <input
          className="${inputClass}"
          type="number"
          value={options.firstNumber ?? 1}
          onChange={(e) => onChange({ ...options, firstNumber: Number(e.target.value) })}
        />
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.page-numbers.pages')}</span>
        <input
          className="${inputClass}"
          type="text"
          value={options.pages ?? ''}
          onChange={(e) => onChange({ ...options, pages: e.target.value })}
        />
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.page-numbers.format')}</span>
        <input
          className="${inputClass}"
          type="text"
          value={options.format ?? '{n}'}
          onChange={(e) => onChange({ ...options, format: e.target.value })}
        />
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.page-numbers.font')}</span>
        <select
          className="${inputClass}"
          value={options.font ?? 'Helvetica'}
          onChange={(e) => onChange({ ...options, font: e.target.value as 'Helvetica' | 'Times-Roman' })}
        >
          <option value="Helvetica">Helvetica</option>
          <option value="Times-Roman">Times Roman</option>
        </select>
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.page-numbers.size')}</span>
        <input
          className="${inputClass}"
          type="number"
          min={1}
          value={options.size ?? 12}
          onChange={(e) => onChange({ ...options, size: Number(e.target.value) })}
        />
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.page-numbers.color')}</span>
        <input
          className="${inputClass}"
          type="text"
          value={options.color ?? '000000'}
          onChange={(e) => onChange({ ...options, color: e.target.value })}
        />
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.page-numbers.margin')}</span>
        <input
          className="${inputClass}"
          type="number"
          min={0}
          value={options.margin ?? 20}
          onChange={(e) => onChange({ ...options, margin: Number(e.target.value) })}
        />
      </label>
    </div>
  )
}
  `,
  'watermark': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { WatermarkOptions } from '@fuckpdf/tools/src/watermark'

export default function WatermarkOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as WatermarkOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.watermark.type')}</span>
        <select
          className="${inputClass}"
          value={options.type ?? 'text'}
          onChange={(e) => onChange({ ...options, type: e.target.value as 'text' | 'image' })}
        >
          <option value="text">{t('options.watermark.typeText')}</option>
          <option value="image">{t('options.watermark.typeImage')}</option>
        </select>
      </label>

      {options.type === 'text' ? (
        <label className="${labelClass}">
          <span className="${spanClass}">{t('options.watermark.text')}</span>
          <input
            className="${inputClass}"
            type="text"
            value={options.text ?? ''}
            onChange={(e) => onChange({ ...options, text: e.target.value })}
          />
        </label>
      ) : (
        <label className="${labelClass}">
          <span className="${spanClass}">{t('options.watermark.image')}</span>
          <input
            className="${inputClass}"
            type="file"
            accept="image/png, image/jpeg"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) {
                const buffer = await file.arrayBuffer()
                onChange({ ...options, imageBytes: new Uint8Array(buffer), imageMime: file.type })
              }
            }}
          />
        </label>
      )}

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.watermark.mode')}</span>
        <select
          className="${inputClass}"
          value={options.mode ?? 'positioned'}
          onChange={(e) => onChange({ ...options, mode: e.target.value as 'positioned' | 'tiled' })}
        >
          <option value="positioned">{t('options.watermark.modePositioned')}</option>
          <option value="tiled">{t('options.watermark.modeTiled')}</option>
        </select>
      </label>

      {options.mode === 'positioned' && (
        <label className="${labelClass}">
          <span className="${spanClass}">{t('options.watermark.position')}</span>
          <select
            className="${inputClass}"
            value={options.position ?? 'center'}
            onChange={(e) => onChange({ ...options, position: e.target.value as any })}
          >
            <option value="center">Center</option>
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </label>
      )}

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.watermark.opacity')}</span>
        <input
          className="${inputClass}"
          type="range"
          min="0" max="1" step="0.1"
          value={options.opacity ?? 0.5}
          onChange={(e) => onChange({ ...options, opacity: Number(e.target.value) })}
        />
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.watermark.rotation')}</span>
        <input
          className="${inputClass}"
          type="number"
          value={options.rotation ?? 45}
          onChange={(e) => onChange({ ...options, rotation: Number(e.target.value) })}
        />
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.watermark.layer')}</span>
        <select
          className="${inputClass}"
          value={options.layer ?? 'over'}
          onChange={(e) => onChange({ ...options, layer: e.target.value as 'over' | 'under' })}
        >
          <option value="over">{t('options.watermark.layerOver')}</option>
          <option value="under">{t('options.watermark.layerUnder')}</option>
        </select>
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.watermark.pages')}</span>
        <input
          className="${inputClass}"
          type="text"
          value={options.pages ?? ''}
          onChange={(e) => onChange({ ...options, pages: e.target.value })}
        />
      </label>

      {options.type === 'text' && (
        <>
          <label className="${labelClass}">
            <span className="${spanClass}">{t('options.watermark.color')}</span>
            <input
              className="${inputClass}"
              type="text"
              value={options.color ?? '000000'}
              onChange={(e) => onChange({ ...options, color: e.target.value })}
            />
          </label>
          <label className="${labelClass}">
            <span className="${spanClass}">{t('options.watermark.size')}</span>
            <input
              className="${inputClass}"
              type="number"
              min={1}
              value={options.size ?? 48}
              onChange={(e) => onChange({ ...options, size: Number(e.target.value) })}
            />
          </label>
        </>
      )}
    </div>
  )
}
  `,
  'crop': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { CropOptions } from '@fuckpdf/tools/src/crop'

export default function CropOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as CropOptions
  const box = options.box || { x: 0, y: 0, width: 100, height: 100 }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="${labelClass}">
          <span className="${spanClass}">{t('options.crop.boxX')}</span>
          <input
            className="${inputClass}"
            type="number"
            value={box.x}
            onChange={(e) => onChange({ ...options, box: { ...box, x: Number(e.target.value) } })}
          />
        </label>
        <label className="${labelClass}">
          <span className="${spanClass}">{t('options.crop.boxY')}</span>
          <input
            className="${inputClass}"
            type="number"
            value={box.y}
            onChange={(e) => onChange({ ...options, box: { ...box, y: Number(e.target.value) } })}
          />
        </label>
        <label className="${labelClass}">
          <span className="${spanClass}">{t('options.crop.boxWidth')}</span>
          <input
            className="${inputClass}"
            type="number"
            min={1}
            value={box.width}
            onChange={(e) => onChange({ ...options, box: { ...box, width: Number(e.target.value) } })}
          />
        </label>
        <label className="${labelClass}">
          <span className="${spanClass}">{t('options.crop.boxHeight')}</span>
          <input
            className="${inputClass}"
            type="number"
            min={1}
            value={box.height}
            onChange={(e) => onChange({ ...options, box: { ...box, height: Number(e.target.value) } })}
          />
        </label>
      </div>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.crop.pages')}</span>
        <input
          className="${inputClass}"
          type="text"
          value={options.pages ?? ''}
          onChange={(e) => onChange({ ...options, pages: e.target.value })}
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={options.flatten ?? false}
          onChange={(e) => onChange({ ...options, flatten: e.target.checked })}
        />
        <span className="${spanClass}">{t('options.crop.flatten')}</span>
      </label>
    </div>
  )
}
  `,
  'jpg-to-pdf': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { JpgToPdfOptions } from '@fuckpdf/tools/src/jpg-to-pdf'

export default function JpgToPdfOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as JpgToPdfOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.jpg-to-pdf.pageSize')}</span>
        <select
          className="${inputClass}"
          value={options.pageSize ?? 'A4'}
          onChange={(e) => onChange({ ...options, pageSize: e.target.value as any })}
        >
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
          <option value="fit-image">Fit Image</option>
        </select>
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.jpg-to-pdf.orientation')}</span>
        <select
          className="${inputClass}"
          value={options.orientation ?? 'portrait'}
          onChange={(e) => onChange({ ...options, orientation: e.target.value as any })}
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.jpg-to-pdf.margin')}</span>
        <input
          className="${inputClass}"
          type="number"
          min={0}
          value={options.margin ?? 0}
          onChange={(e) => onChange({ ...options, margin: Number(e.target.value) })}
        />
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.jpg-to-pdf.fitMode')}</span>
        <select
          className="${inputClass}"
          value={options.fitMode ?? 'contain'}
          onChange={(e) => onChange({ ...options, fitMode: e.target.value as any })}
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="fill">Fill</option>
        </select>
      </label>
    </div>
  )
}
  `,
  'pdf-to-jpg': `
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'
import type { PdfToJpgOptions } from '@fuckpdf/tools/src/pdf-to-jpg'

export default function PdfToJpgOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as PdfToJpgOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.pdf-to-jpg.dpi')}</span>
        <input
          className="${inputClass}"
          type="number"
          min={72}
          max={300}
          value={options.dpi ?? 150}
          onChange={(e) => onChange({ ...options, dpi: Number(e.target.value) })}
        />
      </label>

      <label className="${labelClass}">
        <span className="${spanClass}">{t('options.pdf-to-jpg.format')}</span>
        <select
          className="${inputClass}"
          value={options.format ?? 'jpeg'}
          onChange={(e) => onChange({ ...options, format: e.target.value as 'jpeg' | 'png' | 'webp' })}
        >
          <option value="jpeg">JPEG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
        </select>
      </label>
    </div>
  )
}
  `
};

for (const [tool, code] of Object.entries(components)) {
  const dir = path.join('/home/joel/Documents/dev/fuckpdf/apps/web/src/tools', tool);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'options.tsx'), code.trim() + '\n');
}
