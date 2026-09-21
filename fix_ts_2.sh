#!/bin/bash
cd packages/tools/src

# remove-pages.ts
sed -i 's/import { PDFDocument } from .pdf-lib.//g' remove-pages.ts

# split.ts
sed -i 's/generateOutputName, //g' split.ts
sed -i 's/let endPage = startPage//g' split.ts

# Fix @fuckpdf/engine-pdfium imports
for file in crop.ts crop.test.ts pdf-to-jpg.ts pdf-to-jpg.test.ts; do
  sed -i "s|@fuckpdf/engine-pdfium/src/types|@fuckpdf/engine-pdfium|g" $file
done

# Fix test possibly undefined
sed -i 's/out.getPages()\[0\]/out.getPages()[0]!/g' crop.test.ts
sed -i 's/out.getPages()\[0\]/out.getPages()[0]!/g' rotate.test.ts
sed -i 's/res\[0\]\.mime/res[0]!.mime/g' pdf-to-jpg.test.ts

# Fix implicitly any doc and bytes in test mocks
sed -i 's/async (bytes, fn)/async (bytes: Uint8Array, fn: any)/g' crop.test.ts
sed -i 's/async (bytes, fn)/async (bytes: Uint8Array, fn: any)/g' pdf-to-jpg.test.ts
sed -i 's/async (rgba)/async (rgba: Uint8Array)/g' pdf-to-jpg.test.ts

# Fix doc implicitly any in source
sed -i 's/async (doc)/async (doc: any)/g' crop.ts
sed -i 's/async (doc)/async (doc: any)/g' pdf-to-jpg.ts

