#!/bin/bash
cd packages/tools/src

sed -i "s/const rendered = await doc.render({ page: i + 1, dpi: 300 })/await doc.render({ page: i + 1, dpi: 300 })/g" crop.ts
sed -i "s/PasswordRequiredError, //g" merge.ts
sed -i "s/generateOutputName, //g" pdf-to-jpg.ts

sed -i "s/withDocument: async (bytes: Uint8Array, fn: (doc: PdfiumDocument) => Promise<unknown>) => {/withDocument: async <T>(bytes: Uint8Array, fn: (doc: PdfiumDocument) => Promise<T>, _pwd?: string): Promise<T> => {/g" crop.test.ts pdf-to-jpg.test.ts

