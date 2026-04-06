import { toBlob } from 'html-to-image'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUiStore } from '@/stores/useUiStore'

export async function waitForImagesInNode(container: HTMLElement): Promise<void> {
  const imgs = [...container.querySelectorAll('img')]
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          })
    )
  )
}

export async function captureOutfitShareNode(node: HTMLElement): Promise<Blob> {
  await waitForImagesInNode(node)
  const token = useAuthStore.getState().token
  const lang = useUiStore.getState().language
  const fetchRequestInit: RequestInit | undefined = token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-App-Language': lang,
        },
      }
    : undefined

  const blob = await toBlob(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff',
    // Avoid flaky / slow Google Fonts embeds breaking export on some networks.
    skipFonts: true,
    ...(fetchRequestInit ? { fetchRequestInit } : {}),
  })
  if (!blob) {
    throw new Error('OUTFIT_SHARE_EXPORT_FAILED')
  }
  return blob
}

export function downloadOutfitShareBlob(
  blob: Blob,
  filenameBase = 'wardrobe-outfit'
): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenameBase}.png`
  a.rel = 'noopener'
  a.style.position = 'fixed'
  a.style.left = '-9999px'
  a.style.top = '0'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoking in the same tick can cancel the download in Chromium / Firefox.
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

export type ShareOutfitResult = 'shared' | 'unsupported' | 'cancelled'

export async function shareOutfitBlob(
  blob: Blob,
  options: { title?: string; text?: string }
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
