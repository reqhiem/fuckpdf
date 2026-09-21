import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function createFixturePdf(): Promise<Buffer> {
  const document = await PDFDocument.create()
  const page = document.addPage([612, 792])
  const font = await document.embedFont(StandardFonts.Helvetica)

  page.drawText('fuckpdf test fixture', {
    x: 72,
    y: 720,
    font,
    size: 18,
    color: rgb(0, 0, 0),
  })

  return Buffer.from(await document.save())
}
