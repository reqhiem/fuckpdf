#!/bin/bash
cd packages/tools/src

# Remove top file suppressions
for file in *.test.ts; do
  sed -i '/\/\/ biome-ignore/d' $file
done

# Fix non-null in tests by replacing with check
for file in *.test.ts; do
  sed -i 's/res\[0\]!\.bytes/res[0]!.bytes/g' $file # revert back to standard
  sed -i "s/const out = await PDFDocument.load(res\[0\]!.bytes)/if (!res[0]) throw new Error('fail')\n  const out = await PDFDocument.load(res[0].bytes)/g" $file
  sed -i "s/const o1 = await PDFDocument.load(res\[0\]!.bytes)/if (!res[0] || !res[1]) throw new Error('fail')\n  const o1 = await PDFDocument.load(res[0].bytes)/g" $file
  sed -i "s/const o2 = await PDFDocument.load(res\[1\]!.bytes)/const o2 = await PDFDocument.load(res[1].bytes)/g" $file
  sed -i "s/expect(out.getPages()\[0\]!.getRotation().angle)/expect(out.getPages()[0]?.getRotation().angle)/g" rotate.test.ts
  sed -i "s/expect(out.getPages()\[0\]!.getCropBox())/expect(out.getPages()[0]?.getCropBox())/g" crop.test.ts
done

sed -i "s/const cb = out.getPages()\[0\]!.getCropBox()/const cb = out.getPages()[0]?.getCropBox()\n  if (!cb) throw new Error('fail')/g" crop.test.ts

sed -i "s/let image/let image: import('pdf-lib').PDFImage/g" jpg-to-pdf.ts

sed -i 's/res\[0\]!.mime/res[0]?.mime/g' pdf-to-jpg.test.ts

# watermark.ts
sed -i "s/let font: any = null/let font: import('pdf-lib').PDFFont | null = null/g" watermark.ts
sed -i "s/let color: any = null/let color: import('pdf-lib').Color | null = null/g" watermark.ts
sed -i "s/let pdfImage: any = null/let pdfImage: import('pdf-lib').PDFImage | null = null/g" watermark.ts

# font widthOfTextAtSize requires font to not be null
sed -i "s/font.widthOfTextAtSize/font!.widthOfTextAtSize/g" watermark.ts
sed -i "s/font.heightAtSize/font!.heightAtSize/g" watermark.ts
sed -i "s/font,$/font: font!,/g" watermark.ts
sed -i "s/color$/color: color!,/g" watermark.ts

