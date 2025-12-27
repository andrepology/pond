/**
 * Glass-morphism design system for journal components
 * Works seamlessly over dynamic Three.js backgrounds
 */

export const glass = {
  // White-based glass layers - refined for better visibility on dark/dynamic backgrounds
  ultraLight: 'rgba(255, 255, 255, 0.12)',
  light: 'rgba(255, 255, 255, 0.18)',
  medium: 'rgba(255, 255, 255, 0.35)',
  strong: 'rgba(255, 255, 255, 0.45)',
  solid: 'rgba(255, 255, 255, 0.98)',
} as const

export const text = {
  primary: 'rgba(255, 255, 255, 0.85)',
  secondary: 'rgba(255, 255, 255, 0.65)',
  tertiary: 'rgba(255, 255, 255, 0.45)',
  subtle: 'rgba(255, 255, 255, 0.3)',

  sage: 'rgba(220, 240, 230, 0.95)',
  sageSecondary: 'rgba(220, 240, 230, 0.75)',
  sageTertiary: 'rgba(220, 240, 230, 0.5)',
  sageSubtle: 'rgba(220, 240, 230, 0.3)',

  earth: 'rgba(255, 250, 240, 0.98)',
  earthSecondary: 'rgba(255, 250, 240, 0.85)',
  earthTertiary: 'rgba(255, 250, 240, 0.60)',
  earthSubtle: 'rgba(255, 250, 240, 0.40)',

  plum: 'rgba(235, 230, 245, 0.95)',
  plumSecondary: 'rgba(235, 230, 245, 0.75)',
  plumTertiary: 'rgba(235, 230, 245, 0.5)',
  plumSubtle: 'rgba(235, 230, 245, 0.3)',

  coral: 'rgba(255, 225, 220, 0.95)',
  coralSecondary: 'rgba(255, 225, 220, 0.75)',
  coralTertiary: 'rgba(255, 225, 220, 0.5)',
  coralSubtle: 'rgba(255, 225, 220, 0.3)',

  slate: 'rgba(235, 235, 245, 0.95)',
  slateSecondary: 'rgba(235, 235, 245, 0.75)',
  slateTertiary: 'rgba(235, 235, 245, 0.5)',
  slateSubtle: 'rgba(235, 235, 245, 0.3)',
  
  stone: 'rgba(110, 104, 92, 0.82)',
  stoneSecondary: 'rgba(110, 104, 92, 0.70)',
  stoneTertiary: 'rgba(110, 104, 92, 0.5)',
  stoneSubtle: 'rgba(110, 104, 92, 0.3)',

} as const

export const tint = {
  sage: 'rgba(90, 160, 130, 0.35)',
  sageStrong: 'rgba(90, 160, 130, 0.55)',

  earth: 'rgba(215, 185, 155, 0.5)',
  earthStrong: 'rgba(200, 165, 130, 0.8)',

  plum: 'rgba(140, 100, 170, 0.35)',
  plumStrong: 'rgba(140, 100, 170, 0.55)',

  coral: 'rgba(230, 80, 80, 0.35)',
  coralStrong: 'rgba(230, 80, 80, 0.55)',
  
  slate: 'rgba(80, 90, 130, 0.35)',
  slateStrong: 'rgba(80, 90, 130, 0.55)',
} as const

export const blur = {
  subtle: 'blur(2px)',
  medium: 'blur(6px)',
  strong: 'blur(12px)',
} as const
