import { useState, useEffect, useCallback } from 'react'

interface EnvironmentMap {
  id: string
  path: string
  name: string
}

const ENVIRONMENT_MAPS: EnvironmentMap[] = [
  { id: 'autumn_field', path: '/envmaps/autumn_field_puresky_1k.hdr', name: 'Autumn Field' },
  { id: 'kloppenheim', path: '/envmaps/kloppenheim_02_puresky_1k.hdr', name: 'Kloppenheim' },
  { id: 'moon_noon', path: '/envmaps/qwantani_moon_noon_puresky_1k.hdr', name: 'Moon Noon' },
  { id: 'night', path: '/envmaps/qwantani_night_puresky_1k.hdr', name: 'Night' },
  { id: 'sunset', path: '/envmaps/qwantani_sunset_puresky_1k.hdr', name: 'Sunset' },
  { id: 'park_sunset', path: '/envmaps/rosendal_park_sunset_puresky_1k.hdr', name: 'Park Sunset' },
] as const

interface UseRandomEnvironmentOptions {
  autoSelect?: boolean  // Default: true - select on mount
  fallbackPath?: string // Default: sunset environment
}

interface UseRandomEnvironmentReturn {
  selectedPath: string | null
  isSelecting: boolean
  error: string | null
  selectNew: () => void
  reset: () => void
}

export function useRandomEnvironment(
  options: UseRandomEnvironmentOptions = {}
): UseRandomEnvironmentReturn {
  const { autoSelect = true, fallbackPath } = options

  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select on mount if enabled (runs only once)
  useEffect(() => {
    if (autoSelect) {
      try {
        setIsSelecting(true)
        setError(null)

        const randomIndex = Math.floor(Math.random() * ENVIRONMENT_MAPS.length)
        const selected = ENVIRONMENT_MAPS[randomIndex]

        setSelectedPath(selected.path)
      } catch (err) {
        setError('Failed to select environment map')
        // Fallback to provided path or default sunset
        setSelectedPath(fallbackPath || ENVIRONMENT_MAPS[4].path)
      } finally {
        setIsSelecting(false)
      }
    }
  }, [autoSelect, fallbackPath]) // Only depends on autoSelect and fallbackPath

  const selectNew = useCallback(() => {
    try {
      setIsSelecting(true)
      setError(null)

      // Filter out the currently selected environment to avoid repetition
      const availableMaps = ENVIRONMENT_MAPS.filter(map =>
        map.path !== selectedPath
      )

      // If all maps are filtered out (shouldn't happen), use all maps
      const mapsToChooseFrom = availableMaps.length > 0 ? availableMaps : ENVIRONMENT_MAPS

      const randomIndex = Math.floor(Math.random() * mapsToChooseFrom.length)
      const selected = mapsToChooseFrom[randomIndex]

      setSelectedPath(selected.path)
    } catch (err) {
      setError('Failed to select environment map')
      // Fallback to provided path or default sunset
      setSelectedPath(fallbackPath || ENVIRONMENT_MAPS[4].path)
    } finally {
      setIsSelecting(false)
    }
  }, [selectedPath, fallbackPath])

  const reset = useCallback(() => {
    setSelectedPath(null)
    setError(null)
    setIsSelecting(false)
  }, [])

  return {
    selectedPath,
    isSelecting,
    error,
    selectNew,
    reset,
  }
}
