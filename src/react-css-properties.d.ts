// Augment React's CSSProperties for Tauri window dragging
// This file extends React types without overriding the module

import 'react'

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}
