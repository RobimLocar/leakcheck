// Fires a Meta Pixel event, retrying until fbq is available.
// Needed because the pixel script (afterInteractive) and useEffect both run
// after hydration — no guaranteed order. Without retry, events on page load
// are silently dropped when fbq hasn't initialized yet.
export function fireFbq(event: string, params: Record<string, unknown>, retries = 12) {
  if (typeof window === 'undefined') return
  if ((window as any).fbq) {
    ;(window as any).fbq('track', event, params)
    return
  }
  if (retries > 0) {
    setTimeout(() => fireFbq(event, params, retries - 1), 150)
  }
}
