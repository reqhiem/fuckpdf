/**
 * Crop geometry. Pure, so it is the one part of the grid a test can pin down.
 *
 * A drag happens in CSS pixels on a thumbnail that has already been rotated for display;
 * a CropBox wants PDF points, origin bottom-left, in the page's own unrotated space.
 */
export type CropRect = { x: number; y: number; width: number; height: number }

/** A dragged rectangle, in CSS pixels relative to the displayed thumbnail. */
export type DragRect = { left: number; top: number; width: number; height: number }

export type Size = { width: number; height: number }

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Display fraction (top-left origin, after the cell's clockwise CSS rotation) back to
 * the page's own unrotated fraction. */
const unrotate = (a: number, b: number, rotation: number): [number, number] => {
  if (rotation === 90) return [b, 1 - a]
  if (rotation === 180) return [1 - a, 1 - b]
  if (rotation === 270) return [1 - b, a]
  return [a, b]
}

/**
 * @param drag  the rectangle the user dragged, in CSS pixels
 * @param box   the displayed thumbnail's box, same units as `drag`
 * @param page  the page size in PDF points, unrotated
 * @param rotation clockwise degrees currently applied to the thumbnail
 */
export function toPdfPoints(drag: DragRect, box: Size, page: Size, rotation: number): CropRect {
  if (box.width <= 0 || box.height <= 0) return { x: 0, y: 0, width: 0, height: 0 }

  const [u0, v0] = unrotate(
    clamp01(drag.left / box.width),
    clamp01(drag.top / box.height),
    rotation,
  )
  const [u1, v1] = unrotate(
    clamp01((drag.left + drag.width) / box.width),
    clamp01((drag.top + drag.height) / box.height),
    rotation,
  )

  const left = Math.min(u0, u1)
  const right = Math.max(u0, u1)
  const top = Math.min(v0, v1)
  const bottom = Math.max(v0, v1)

  return {
    x: left * page.width,
    y: (1 - bottom) * page.height,
    width: (right - left) * page.width,
    height: (bottom - top) * page.height,
  }
}
