import { useState, useEffect } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

interface UpdateStatus {
  checking: boolean
  available: boolean
  downloading: boolean
  error: string | null
  currentVersion: string | null
  latestVersion: string | null
}

/**
 * Hook for checking and installing app updates
 * Updates are checked on mount and can be manually triggered
 */
export function useAppUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    downloading: false,
    error: null,
    currentVersion: null,
    latestVersion: null,
  })

  async function checkForUpdates() {
    try {
      setStatus((s) => ({ ...s, checking: true, error: null }))

      const update = await check()

      if (update) {
        setStatus((s) => ({
          ...s,
          checking: false,
          available: true,
          currentVersion: update.currentVersion,
          latestVersion: update.version,
        }))

        // Auto-download and install
        let downloaded = 0
        let contentLength = 0

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              setStatus((s) => ({ ...s, downloading: true }))
              contentLength = event.data.contentLength || 0
              console.log(`Started downloading ${contentLength} bytes`)
              break
            case 'Progress':
              downloaded += event.data.chunkLength
              console.log(`Downloaded ${downloaded} of ${contentLength}`)
              break
            case 'Finished':
              console.log('Download finished')
              break
          }
        })

        console.log('Update installed, relaunching...')
        await relaunch()
      } else {
        setStatus((s) => ({ ...s, checking: false, available: false }))
      }
    } catch (error) {
      console.error('Update check failed:', error)
      setStatus((s) => ({
        ...s,
        checking: false,
        error: error instanceof Error ? error.message : 'Update failed',
      }))
    }
  }

  // Check for updates on mount (only in production builds)
  useEffect(() => {
    if (typeof window !== 'undefined' && '__TAURI__' in window && window.__TAURI__) {
      // Delay initial check to not interfere with startup
      const timer = setTimeout(checkForUpdates, 5000)
      return () => clearTimeout(timer)
    }
  }, [])

  return {
    status,
    checkForUpdates,
  }
}

