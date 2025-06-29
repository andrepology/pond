# Silk Components API Reference

> Native‑like swipeable sheets on the web for React applications.

## Core Components

### Sheet
The main sheet component that provides native-like swipeable sheet functionality.

#### Sheet.Root
Root container for the sheet component.

**Props:**
```typescript
interface SheetRootProps {
  license: "commercial" | "non-commercial"  // Required
  componentId?: SheetId
  forComponent?: SheetStackId | "closest"
  asChild?: boolean
  sheetRole?: React.AriaRole
  defaultPresented?: boolean
  presented?: boolean
  onPresentedChange?: (presented: boolean) => void
  defaultActiveDetent?: number
  activeDetent?: number
  onActiveDetentChange?: (detent: number) => void
  onSafeToUnmountChange?: (safeToUnmount: boolean) => void
  children: React.ReactNode
}
```

#### Sheet.View
Defines the sheet's presentation behavior and interactions.

**Props:**
```typescript
interface SheetViewProps {
  forComponent?: SheetId
  children: React.ReactNode
  contentPlacement?: "top" | "bottom" | "left" | "right" | "center"
  detents?: string | Array<string>  // e.g., ["20%", "60%", "90%"] or ["300px"]
  tracks?: "top" | "bottom" | "left" | "right" | ["top", "bottom"] | ["left", "right"]
  swipeOvershoot?: boolean
  swipeDismissal?: boolean
  swipe?: boolean
  swipeTrap?: boolean | { x?: boolean; y?: boolean }
  nativeEdgeSwipePrevention?: boolean
  enteringAnimationSettings?: EnteringAnimationSettings
  exitingAnimationSettings?: ExitingAnimationSettings
  steppingAnimationSettings?: SteppingAnimationSettings
  onTravelStatusChange?: (travelStatus: TravelStatus) => void
  onTravelRangeChange?: (range: TravelRange) => void
  onTravel?: (params: { progress: number; range: TravelRange; progressAtDetents: number[] }) => void
  onTravelStart?: () => void
  onTravelEnd?: () => void
  inertOutside?: boolean
  onPresentAutoFocus?: ViewAutoFocusHandlerValue
  onDismissAutoFocus?: ViewAutoFocusHandlerValue
  onClickOutside?: ClickOutsideHandlerValue
  onEscapeKeyDown?: EscapeKeyDownHandlerValue
  onFocusInside?: (customEvent: SheetViewFocusInsideCustomEvent) => void
  nativeFocusScrollPrevention?: boolean
}
```

#### Sheet.Content
The main content area of the sheet.

**Props:**
```typescript
interface SheetContentProps {
  asChild?: boolean
  "data-silk"?: string
  travelAnimation?: TravelAnimationPropValue
  stackingAnimation?: StackingAnimationPropValue
}
```

#### Sheet.Backdrop
Background overlay that appears behind the sheet.

**Props:**
```typescript
interface SheetBackdropProps {
  asChild?: boolean
  "data-silk"?: string
  swipeable?: boolean
  themeColorDimming?: false | "auto"
  travelAnimation?: TravelAnimationPropValue
  stackingAnimation?: StackingAnimationPropValue
}
```

#### Sheet.Handle
Visual handle for dragging the sheet.

**Props:**
```typescript
interface HandleProps {
  asChild?: boolean
  "data-silk"?: string
  forComponent?: SheetId
  action?: "step" | HandleStepActionWithOptions | "dismiss"
  onPress?: TriggerPressHandlerValue
  onClick?: (e: React.MouseEvent<HTMLElement>) => void
  travelAnimation?: TravelAnimationPropValue
  stackingAnimation?: StackingAnimationPropValue
}
```

#### Sheet.Trigger
Button to trigger sheet presentation/dismissal.

**Props:**
```typescript
interface SheetTriggerProps {
  asChild?: boolean
  "data-silk"?: string
  forComponent?: SheetId
  action?: "present" | "dismiss" | "step" | StepActionWithOptions
  onPress?: TriggerPressHandlerValue
  onClick?: (e: React.MouseEvent<HTMLElement>) => void
  travelAnimation?: TravelAnimationPropValue
  stackingAnimation?: StackingAnimationPropValue
}
```

#### Sheet.Portal
Portal component to render sheet in specific container.

**Props:**
```typescript
interface SheetPortalProps {
  container?: HTMLElement | null
  children: React.ReactNode
}
```

#### Sheet.Title & Sheet.Description
Accessibility components for sheet content.

**Props:**
```typescript
interface SheetTitleProps {
  asChild?: boolean
  children: React.ReactNode
  travelAnimation?: TravelAnimationPropValue
  stackingAnimation?: StackingAnimationPropValue
}

interface SheetDescriptionProps {
  asChild?: boolean
  children: React.ReactNode
  travelAnimation?: TravelAnimationPropValue
  stackingAnimation?: StackingAnimationPropValue
}
```

### Scroll Components

#### Scroll.Root
Root container for scrollable content.

**Props:**
```typescript
interface ScrollRootProps {
  asChild?: boolean
  componentId?: ScrollId
  componentRef?: React.RefObject<ScrollRef>
  "data-silk"?: string
}
```

#### Scroll.View
Scrollable viewport container.

**Props:**
```typescript
interface ScrollViewProps {
  asChild?: boolean
  "data-silk"?: string
  forComponent?: ScrollId
  axis?: "x" | "y"
  pageScroll?: boolean
  nativePageScrollReplacement?: "auto" | boolean
  safeArea?: SafeArea
  scrollGestureTrap?: boolean | { x?: boolean; y?: boolean } | { xStart?: boolean; xEnd?: boolean; yStart?: boolean; yEnd?: boolean }
  scrollGestureOvershoot?: boolean
  scrollGesture?: "auto" | false
  onScroll?: (params: { progress: number; distance: number; availableDistance: number; nativeEvent: React.UIEvent<HTMLDivElement> }) => void
  onScrollStart?: { dismissKeyboard: boolean } | ((customEvent: ScrollViewScrollStartCustomEvent) => void)
  onScrollEnd?: (customEvent: ScrollViewScrollEndCustomEvent) => void
  onFocusInside?: { scrollIntoView: boolean } | ((customEvent: ScrollViewFocusInsideCustomEvent) => void)
  nativeFocusScrollPrevention?: boolean
  scrollAnimationSettings?: { skip: "auto" | boolean }
  scrollAnchoring?: boolean
  scrollSnapType?: "none" | "proximity" | "mandatory"
  scrollPadding?: string
  scrollTimelineName?: string
  nativeScrollbar?: boolean
}
```

#### Scroll.Content
Content container within scrollable area.

**Props:**
```typescript
interface ScrollContentProps {
  asChild?: boolean
  "data-silk"?: string
}
```

#### Scroll.Trigger
Button to control scrolling programmatically.

**Props:**
```typescript
interface TriggerProps {
  forComponent?: ScrollId
  asChild?: boolean
  action?: ScrollTriggerAction
  onPress?: TriggerPressHandlerValue
  onClick?: (e: React.MouseEvent<HTMLElement>) => void
}
```

### Animation Types

#### Travel Animations
Control animations during sheet travel (dragging).

```typescript
type TravelAnimationPropValue = AnimationDeclarations
type AnimationDeclarations = {
  opacity?: [ValidCSSValue, ValidCSSValue] | CssValueTemplate | string
  translate?: [ValidCSSValue, ValidCSSValue] | CssValueTemplate | string
  scale?: [ValidCSSValue, ValidCSSValue] | CssValueTemplate | string
  // ... other CSS properties
}
```

#### Animation Settings
Control entering, exiting, and stepping animations.

```typescript
type SpringPreset = "gentle" | "smooth" | "snappy" | "brisk" | "bouncy" | "elastic"

type EnteringAnimationSettings = SpringPreset | {
  easing: "spring"
  stiffness: number
  damping: number
  mass: number
  initialVelocity?: number
  precision?: number
  delay?: number
  track?: "top" | "bottom" | "left" | "right"
} | {
  easing: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | `cubic-bezier(${string})`
  duration: number
  delay?: number
  track?: "top" | "bottom" | "left" | "right"
}
```

### Utility Components

#### Island
Creates isolated interactive areas within sheets.

**Props:**
```typescript
interface IslandRootProps {
  asChild?: boolean
  disabled?: boolean
  forComponent?: SheetId | SheetStackId | Array<SheetId | SheetStackId>
  children?: React.ReactNode
  contentGetter?: (() => HTMLElement | Element | null | undefined) | string
}
```

#### AutoFocusTarget
Manages focus when sheets present/dismiss.

**Props:**
```typescript
interface AutoFocusTargetRootProps {
  asChild?: boolean
  "data-silk"?: string
  forComponent?: SheetId
  timing: "present" | "dismiss" | Array<"present" | "dismiss">
}
```

## Hooks and Utilities

### createComponentId()
Creates unique component identifiers for sheets.

```typescript
const componentId = createComponentId()
```

### useClientMediaQuery(query: string)
Hook for responsive behavior based on media queries.

```typescript
const isMobile = useClientMediaQuery('(max-width: 768px)')
```

### useThemeColorDimmingOverlay()
Hook for managing theme color dimming overlay.

```typescript
const { setDimmingOverlayOpacity, animateDimmingOverlayOpacity } = useThemeColorDimmingOverlay({
  elementRef?: React.RefObject<HTMLElement>
  dimmingColor: string
})
```

### animate()
Utility function for custom animations.

```typescript
animate(element: HTMLElement | null, keyframes: {
  [key: string]: [string | number, string | number]
}, options?: {
  duration?: number
  easing?: string
})
```

## Key Concepts

### Detents
Detents are specific positions where sheets can snap to. They can be specified as:
- **Percentages**: `["20%", "60%", "90%"]` - relative to container height
- **Pixels**: `["300px", "500px"]` - absolute values
- **Mixed**: `["100px", "50%", "calc(100vh - 200px)"]`

### Content Placement
Determines where the sheet content appears:
- `"bottom"` - Classic bottom sheet
- `"top"` - Sheet from top
- `"left"` - Left sidebar
- `"right"` - Right sidebar  
- `"center"` - Modal dialog

### Tracks
Defines the direction users swipe to dismiss:
- Must match `contentPlacement` (except for center)
- Can be single direction: `"bottom"`
- Or bi-directional: `["top", "bottom"]`

### Travel Status
Sheet animation states:
- `"entering"` - Sheet is appearing
- `"idleInside"` - Sheet is stationary and visible
- `"stepping"` - Sheet is moving between detents
- `"exiting"` - Sheet is disappearing
- `"idleOutside"` - Sheet is hidden

## CSS Styling

### Import Styles
```typescript
import '@silk-hq/components/layered-styles'
```

### Custom Styling
All components are unstyled by default. Use `className` prop or CSS-in-JS:

```typescript
<Sheet.Content className="bg-white rounded-t-lg shadow-lg">
  {/* Content */}
</Sheet.Content>
```

### Data Attributes
Components use `data-silk` attributes for internal styling hooks:

```css
[data-silk~="presented"] {
  /* Styles when sheet is presented */
}
```

## Best Practices

1. **Always set license prop** on `Sheet.Root`
2. **Use Portal for containment** when rendering within specific containers
3. **Match tracks with contentPlacement** for intuitive interactions
4. **Provide multiple detents** for better UX
5. **Use semantic HTML** with `Sheet.Title` and `Sheet.Description`
6. **Handle keyboard events** with `onEscapeKeyDown`
7. **Implement proper focus management** with AutoFocusTarget
8. **Test on mobile devices** for optimal gesture handling

## Examples

### Basic Bottom Sheet
```typescript
<Sheet.Root license="non-commercial" presented={isPresented}>
  <Sheet.View contentPlacement="bottom" tracks="bottom" detents={["300px", "60%"]}>
    <Sheet.Backdrop className="bg-black/20" />
    <Sheet.Content className="bg-white rounded-t-lg">
      <Sheet.Handle className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-2" />
      <div className="p-6">
        <Sheet.Title>Sheet Title</Sheet.Title>
        <Sheet.Description>Sheet description content</Sheet.Description>
      </div>
    </Sheet.Content>
  </Sheet.View>
</Sheet.Root>
```

### Scrollable Sheet Content
```typescript
<Sheet.Content className="bg-white">
  <Scroll.Root>
    <Scroll.View axis="y">
      <Scroll.Content>
        {/* Long scrollable content */}
      </Scroll.Content>
    </Scroll.View>
  </Scroll.Root>
</Sheet.Content>
``` 