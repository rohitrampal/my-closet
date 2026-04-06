const DEFAULT_MAX_EDGE = 1280
const DEFAULT_QUALITY = 0.82
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Image encode failed'))
      },
      'image/jpeg',
      quality
    )
  })
}

/**
 * Resize and JPEG-encode for upload (multipart); returns a small File, no data URLs.
 */
export async function compressImageToJpegFile(
  file: File,
  options?: { maxEdge?: number; quality?: number; maxBytes?: number }
): Promise<File> {
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES
  let quality = options?.quality ?? DEFAULT_QUALITY

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas not supported')
    }
    ctx.drawImage(bitmap, 0, 0, w, h)

    let blob = await canvasToJpegBlob(canvas, quality)
    while (blob.size > maxBytes && quality > 0.45) {
      quality -= 0.08
      blob = await canvasToJpegBlob(canvas, quality)
    }
    if (blob.size > maxBytes) {
      throw new Error('Image is still too large after compression')
    }
    return new File([blob], 'garment.jpg', { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}
