import { toBlob } from 'html-to-image'

export async function waitForImagesInNode(container: HTMLElement): Promise<void> {
  const imgs = [...container.querySelectorAll('img')]
  await Promise.all(
    imgs.map(
      (img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true })
              img.addEventListener('error', () => resolve(), { once: true })
            }),
    ),
  )
}

export async function captureOutfitShareNode(node: HTMLElement): Promise<Blob> {
  await waitForImagesInNode(node)
  const blob = await toBlob(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff',
  })
  if (!blob) {
    throw new Error('OUTFIT_SHARE_EXPORT_FAILED')
  }
  return blob
}

export function downloadOutfitShareBlob(blob: Blob, filenameBase = 'wardrobe-outfit'): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenameBase}.png`
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(url)
}

export type ShareOutfitResult = 'shared' | 'unsupported' | 'cancelled'

export async function shareOutfitBlob(
  blob: Blob,
  options: { title?: string; text?: string },
): Promise<ShareOutfitResult> {
  const file = new File([blob], 'wardrobe-outfit.png', { type: 'image/png' })
  const shareData: ShareData = {
    files: [file],
    title: options.title,
    text: options.text,
  }

  if (!navigator.share || !navigator.canShare?.(shareData)) {
    return 'unsupported'
  }

  try {
    await navigator.share(shareData)
    return 'shared'
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return 'cancelled'
    }
    throw e
  }
}
