// Hand-rolled on purpose: a suite asserting on bytes must not borrow the app's own zip
// writer to check the app's zip output.
import { crc32, deflateSync, inflateRawSync } from 'node:zlib'

export function unzip(archive: Buffer): Record<string, Buffer> {
  const eocd = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) throw new Error('not a zip: no end-of-central-directory record')

  const entries: Record<string, Buffer> = {}
  const count = archive.readUInt16LE(eocd + 10)
  let record = archive.readUInt32LE(eocd + 16)

  for (let i = 0; i < count; i++) {
    const method = archive.readUInt16LE(record + 10)
    const compressed = archive.readUInt32LE(record + 20)
    const nameLength = archive.readUInt16LE(record + 28)
    const extraLength = archive.readUInt16LE(record + 30)
    const commentLength = archive.readUInt16LE(record + 32)
    const localHeader = archive.readUInt32LE(record + 42)
    const name = archive.toString('utf8', record + 46, record + 46 + nameLength)

    // The local header carries its own extra field, so the payload offset can only be
    // read there, never derived from the central directory.
    const start =
      localHeader +
      30 +
      archive.readUInt16LE(localHeader + 26) +
      archive.readUInt16LE(localHeader + 28)
    const payload = archive.subarray(start, start + compressed)
    entries[name] = method === 0 ? Buffer.from(payload) : inflateRawSync(payload)

    record += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

const chunk = (type: string, data: Buffer): Buffer => {
  const tagged = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const head = Buffer.alloc(4)
  head.writeUInt32BE(data.length)
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE(crc32(tagged) >>> 0)
  return Buffer.concat([head, tagged, tail])
}

/** A real 8-bit RGB PNG, so jpg-to-pdf has an image pdf-lib will embed. */
export function createPng(width: number, height: number): Buffer {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour

  const stride = 1 + width * 3
  const raw = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const row = y * stride // raw[row] stays 0: filter type "none"
    for (let x = 0; x < width; x++) {
      raw[row + 1 + x * 3] = x % 256
      raw[row + 2 + x * 3] = y % 256
      raw[row + 3 + x * 3] = 0x80
    }
  }

  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export const MAGIC: Record<string, number[]> = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
  webp: [0x52, 0x49, 0x46, 0x46],
}
