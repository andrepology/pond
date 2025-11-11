/**
 * Device detection utilities for responsive behavior
 */

/**
 * Detects if the current device is a mobile device
 * Uses both user agent detection and touch/screen size heuristics
 */
export const isMobileDevice = (): boolean => {
  // Check user agent for mobile devices
  const ua = navigator.userAgent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

  // Check for touch capability and screen size (catches tablets in portrait mode)
  const hasTouch = 'ontouchstart' in window
  const smallScreen = window.innerWidth <= 768

  return mobileRegex.test(ua) || (hasTouch && smallScreen)
}

/**
 * More granular device detection
 */
export const getDeviceType = () => {
  const ua = navigator.userAgent
  const width = window.innerWidth

  if (/iPhone|iPod/.test(ua)) return 'iphone'
  if (/iPad/.test(ua)) return 'ipad'
  if (/Android/.test(ua)) {
    return width <= 768 ? 'android-phone' : 'android-tablet'
  }
  if (width <= 768 && 'ontouchstart' in window) return 'tablet'
  if (width <= 480 && 'ontouchstart' in window) return 'phone'

  return 'desktop'
}
