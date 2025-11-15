import { useCallback } from 'react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window && Boolean((window as any).__TAURI__)
}

export function TauriTitleBar() {
  const handleClose = useCallback(async () => {
    if (!isTauriEnvironment()) return
    try {
      const appWindow = getCurrentWebviewWindow()
      await appWindow.close()
    } catch (error) {
      console.error('Failed to close window:', error)
    }
  }, [])

  const handleMinimize = useCallback(async () => {
    if (!isTauriEnvironment()) return
    try {
      const appWindow = getCurrentWebviewWindow()
      await appWindow.minimize()
    } catch (error) {
      console.error('Failed to minimize window:', error)
    }
  }, [])

  const handleToggleMaximize = useCallback(async () => {
    if (!isTauriEnvironment()) return
    try {
      const appWindow = getCurrentWebviewWindow()
      await appWindow.toggleMaximize()
    } catch (error) {
      console.error('Failed to toggle maximize window:', error)
    }
  }, [])

  const handleDoubleClick = useCallback(async () => {
    // Mimic macOS behavior: double‑click title bar toggles zoom/maximize
    if (!isTauriEnvironment()) return
    const appWindow = getCurrentWebviewWindow()
    await appWindow.toggleMaximize()
  }, [])

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        paddingInline: 8,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0)',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      {/* Traffic light button cluster (macOS style) */}
      <div
        data-tauri-drag-region="false"
        style={{
          display: 'flex',
          gap: 8,
          position: 'relative',
          zIndex: 10000,
        }}
      >
        <button
          data-tauri-drag-region="false"
          onClick={(e) => {
            e.stopPropagation()
            handleClose()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Close window"
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            border: '1px solid #d04b41',
            backgroundColor: '#ff5f57',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 10001,
          }}
        />
        <button
          data-tauri-drag-region="false"
          onClick={(e) => {
            e.stopPropagation()
            handleMinimize()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Minimize window"
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            border: '1px solid #d0a022',
            backgroundColor: '#febc2e',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 10001,
          }}
        />
        <button
          data-tauri-drag-region="false"
          onClick={(e) => {
            e.stopPropagation()
            handleToggleMaximize()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Zoom window"
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            border: '1px solid #239234',
            backgroundColor: '#28c840',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 10001,
          }}
        />
      </div>
    </div>
  )
}


