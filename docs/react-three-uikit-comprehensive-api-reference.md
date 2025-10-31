# @react-three/uikit Comprehensive API Reference

This document provides a comprehensive reference for @react-three/uikit, a library for building performant 3D user interfaces in Three.js using React Three Fiber and Yoga layout engine.

## Table of Contents

1. [Installation](#installation)
2. [Core Concepts](#core-concepts)
3. [Component Kits](#component-kits)
4. [Core Components](#core-components)
5. [Layout System](#layout-system)
6. [Styling Properties](#styling-properties)
7. [Component-Specific APIs](#component-specific-apis)
8. [Advanced Features](#advanced-features)
9. [Migration Guide](#migration-guide)

## Installation

### Core Dependencies
```bash
npm install three @react-three/fiber @react-three/uikit
```

### Component Kits
```bash
# Default kit (Shadcn-style components)
npm install @react-three/uikit-default

# Apfel kit (Apple Vision Pro-style components)
npm install @react-three/uikit-apfel
```

### Icons
```bash
# Lucide icons for React
npm install @react-three/uikit-lucide

# Vanilla Lucide icons
npm install @pmndrs/uikit-lucide
```

## Core Concepts

### Architecture
- **Yoga Layout Engine**: Flexbox-based layout system for 3D UI
- **Three.js Integration**: Components render as 3D meshes with materials
- **React Three Fiber**: Declarative Three.js rendering
- **Signal-based Updates**: Uses @preact/signals-core for reactive updates

### Key Components
- `Root`: Main container with Yoga layout
- `Container`: Flex container with styling
- `Fullscreen`: Camera-attached full-screen UI
- `Text`: 3D text rendering with MSDF fonts

### Rendering Pipeline
1. Yoga calculates layout
2. Three.js meshes created for each component
3. Materials applied with proper depth sorting
4. Raycasting for interaction

## Component Kits

### @react-three/uikit-default
**Theme**: Shadcn UI-inspired components

#### Available Components
- `Alert`, `AlertDialog`, `AlertDescription`, `AlertIcon`, `AlertTitle`
- `Avatar`, `AvatarFallback`, `AvatarImage`
- `Badge`
- `Button`
- `Card`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`
- `Checkbox`
- `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `DialogTrigger`
- `Input`
- `Label`
- `Pagination`, `PaginationContent`, `PaginationEllipsis`, `PaginationItem`, `PaginationLink`, `PaginationNext`, `PaginationPrevious`
- `Progress`
- `RadioGroup`, `RadioGroupItem`
- `Select`, `SelectContent`, `SelectItem`, `SelectLabel`, `SelectScrollDownButton`, `SelectScrollUpButton`, `SelectSeparator`, `SelectTrigger`, `SelectValue`
- `Separator`
- `Skeleton`
- `Slider`
- `Switch`
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- `Textarea`
- `Toast`, `ToastAction`, `ToastClose`, `ToastDescription`, `ToastProvider`, `ToastTitle`, `ToastViewport`
- `Toggle`, `ToggleGroup`, `ToggleGroupItem`
- `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`

### @react-three/uikit-apfel
**Theme**: Apple Vision Pro-inspired components

#### Available Components
- `Button`
- `Card`
- `Checkbox`
- `Input`
- `List`, `ListItem`
- `Loading`
- `Progress`
- `Slider`
- `TabBar`, `TabBarItem`

## Core Components

### Root Component
Main container component that establishes the layout context.

```tsx
<Root
  flexDirection="column"
  padding={10}
  gap={10}
  width={1000}
  height={500}
  anchorX="center"
  anchorY="middle"
  sizeX={1}
  sizeY={1}
/>
```

**Properties:**
- `anchorX`: `"left" | "center" | "right"`
- `anchorY`: `"top" | "center" | "bottom"`
- `sizeX`: `number` - Fixed width in Three.js units
- `sizeY`: `number` - Fixed height in Three.js units

### Container Component
Flexible container with extensive styling options.

```tsx
<Container
  backgroundColor="red"
  backgroundOpacity={0.8}
  borderRadius={8}
  borderWidth={2}
  borderColor="black"
  padding={16}
  flexDirection="row"
  alignItems="center"
  justifyContent="space-between"
  receiveShadow
  castShadow
  overflow="scroll"
/>
```

### Fullscreen Component
Camera-attached full-screen UI container.

```tsx
<Fullscreen
  attachCamera={true}
  distanceToCamera={5}
  flexDirection="column"
  padding={32}
  gap={16}
/>
```

### Text Component
3D text rendering with MSDF fonts.

```tsx
<Text
  color="white"
  fontSize={24}
  fontWeight="bold"
  fontFamily="inter"
  textAlign="center"
  verticalAlign="middle"
  letterSpacing={0.02}
  lineHeight={1.2}
  wordBreak="break-word"
/>
```

### Input Component
3D text input with full interaction support.

```tsx
<Input
  value={text}
  onValueChange={setText}
  placeholder="Enter text"
  multiline={false}
  type="text"
  disabled={false}
  tabIndex={0}
  caretColor="black"
  selectionColor="rgba(0,123,255,0.3)"
/>
```

**Ref Methods:**
- `focus()`: Programmatically focus input
- `blur()`: Remove focus
- `current`: Signal containing current value
- `selectionRange`: Signal with [start, end] selection
- `caretTransformation`: Signal with caret position/height
- `selectionTransformations`: Array of selection box transforms

## Layout System

### Flexbox Properties
UIKit uses Yoga's flexbox implementation with full CSS flexbox compatibility.

#### Container Properties
```tsx
<Container
  // Flex direction
  flexDirection="row" | "column" | "row-reverse" | "column-reverse"

  // Alignment
  alignItems="stretch" | "flex-start" | "center" | "flex-end" | "baseline"
  alignContent="flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "stretch"
  alignSelf="auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline"

  // Justification
  justifyContent="flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly"

  // Flex properties
  flexWrap="no-wrap" | "wrap" | "wrap-reverse"
  flexGrow={1}
  flexShrink={0}
  flexBasis="auto"
/>
```

#### Item Properties
```tsx
<Container
  // Positioning
  positionType="relative" | "absolute"

  // Dimensions
  width="auto" | number | "percentage"
  height="auto" | number | "percentage"
  minWidth={0}
  minHeight={0}
  maxWidth="none"
  maxHeight="none"
  aspectRatio={1}

  // Spacing
  margin={0}
  marginX={0}
  marginY={0}
  marginTop={0}
  marginLeft={0}
  marginRight={0}
  marginBottom={0}

  // Transforms
  transformTranslateX={0}
  transformTranslateY={0}
  transformTranslateZ={0}
  transformScaleX={1}
  transformScaleY={1}
  transformScaleZ={1}
  transformRotateX={0}
  transformRotateY={0}
  transformRotateZ={0}
/>
```

## Styling Properties

### Visual Properties
```tsx
<Container
  // Colors
  backgroundColor="#ffffff" | "red" | [r,g,b] | 0xff0000
  backgroundOpacity={1}

  // Borders
  borderWidth={1}
  borderColor="black"
  borderOpacity={1}
  borderRadius={4}
  borderTopLeftRadius={4}
  borderTopRightRadius={4}
  borderBottomRightRadius={4}
  borderBottomLeftRadius={4}
  borderBend={0}

  // Shadows
  receiveShadow={false}
  castShadow={false}

  // Rendering
  depthTest={true}
  depthWrite={true}
  renderOrder={0}
/>
```

### Scrollbars
```tsx
<Container
  overflow="scroll"

  // Scrollbar styling
  scrollbarWidth={8}
  scrollbarBackgroundColor="rgba(0,0,0,0.1)"
  scrollbarBackgroundOpacity={1}
  scrollbarBorderRadius={4}
  scrollbarColor="rgba(0,0,0,0.3)"
/>
```

### Material Classes
```tsx
<Container
  panelMaterialClass={CustomMaterial}
  scrollbarPanelMaterialClass={ScrollbarMaterial}
/>
```

## Component-Specific APIs

### Button Variants (@react-three/uikit-default)
```tsx
<Button variant="default" | "destructive" | "outline" | "secondary" | "ghost" | "link" />
<Button size="default" | "sm" | "lg" | "icon" />
```

### Button Variants (@react-three/uikit-apfel)
```tsx
<Button variant="rect" | "icon" />
<Button size="xs" | "sm" | "md" | "lg" />
<Button platter={true} /> // Special Apple-style button
```

### Card Structure (@react-three/uikit-default)
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Dialog System (@react-three/uikit-default)
```tsx
<Dialog>
  <DialogTrigger>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button>Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Tabs (@react-three/uikit-default)
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Form Controls
```tsx
<Checkbox checked={checked} onCheckedChange={setChecked} />
<RadioGroup value={value} onValueChange={setValue}>
  <RadioGroupItem value="option1" />
  <RadioGroupItem value="option2" />
</RadioGroup>
<Slider value={[value]} onValueChange={([v]) => setValue(v)} />
<Switch checked={checked} onCheckedChange={setChecked} />
```

## Advanced Features

### Custom Materials
```tsx
class CustomMaterial extends MeshPhongMaterial {
  constructor() {
    super({
      specular: 0x111111,
      shininess: 100,
      // Custom properties
    })
  }
}

<Container panelMaterialClass={CustomMaterial} />
```

### Signal-based Animation
```tsx
import { signal } from '@preact/signals-core'
import { useFrame } from '@react-three/fiber'

function AnimatedComponent() {
  const opacity = useMemo(() => signal(0), [])

  useFrame(({ clock }) => {
    opacity.value = Math.sin(clock.elapsedTime) * 0.5 + 0.5
  })

  return <Container backgroundOpacity={opacity} />
}
```

### Theming
```tsx
import { setPreferredColorScheme } from '@react-three/uikit'

setPreferredColorScheme('dark') // 'light' | 'dark' | 'auto'

<Defaults theme={{ /* custom theme overrides */ }}>
  {/* Components inherit theme */}
</Defaults>
```

### Font Management
```tsx
<FontFamilies
  inter={{
    normal: '/fonts/inter-normal.woff',
    bold: '/fonts/inter-bold.woff'
  }}
/>

<Text fontFamily="inter" fontWeight="bold">Styled Text</Text>
```

### Custom Containers with 3D Content
```tsx
<Content depthAlign="center" keepAspectRatio={true}>
  <mesh>
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
</Content>
```

### Scroll Events
```tsx
<Container
  overflow="scroll"
  onScroll={(x, y, scrollPosition, event) => {
    console.log('Scrolled to:', x, y)
    // Return false to prevent scroll
  }}
/>
```

## Migration Guide

### From UIKit 0.* to 1.*

#### Why this release
- **More alignment with HTML/CSS**: UIKit now follows web standards more closely
- **Stable core for vanilla Three.js**: `pmndrs/uikit` is the stable core that works across frameworks (IWSDK, vanilla three.js, react-three/fiber)
- **Cross-framework compatibility**: Component and icon kits work across vanilla and other frameworks
- **Simpler code**: Better maintainability

#### What's New (Added)
- `zIndex` to control render order (like HTML/CSS)
- `display: contents` (Yoga 3.2)
- `white-space` to control whitespace in text, inputs, etc.
- Global classes via `StyleSheet`
- `*` property to set default properties for all descendants
- Input `placeholder` support
- `important` to raise style precedence (works with `*`)
- Direct position, scale, rotation support on outermost UIKit components (no more wrapping in groups)

#### What Changed
- Properties that inherit in HTML/CSS now inherit in UIKit
- `pixelSize` can be set anywhere and inherits to descendants
- `textAlign: block` → `textAlign: justify`
- `Image` can no longer have children - wrap in relatively positioned container with absolutely positioned children and higher `zIndex`
- `ref` is now a proper UIKit Three.js component with typings and full internal access
- `setStyle` → `setProperties` (more robust and performant)
- `border`/`borderX`/... → `borderWidth`/`borderXWidth`/... (matches HTML/CSS)
- `lineHeight` without unit is multiplier; with `px` it's absolute (matches HTML/CSS)
- `scrollbarBackgroundColor` → `scrollbarColor`

#### Deprecated (React)
- `Root`: use `Container` or remove if unnecessary
- `DefaultProperties`: use `<Container display="contents" {...{ '*': defaultProps }}>` or write defaults using `'*'` on any component
- `FontFamilyProvider`: provide `fontFamilies` on a `Container` with `display="contents"` or on existing components
- `Icon` → `Svg`; property `text` → `content`

#### Removed
- `backgroundOpacity` and `borderOpacity`: Opacity is part of color now (background/border), like HTML/CSS. Use `withOpacity` or `useWithOpacity` React hook
- `useRootSize`: Access root via any element ref: `anyComponent.root.value.component.size.value`
- `isInteractionPanel`: All UIKit elements are interaction panels now
- `apfel-kit` (low usage)

### Quick Migration Checklist
1. Replace `Root` with `Container` (or remove if not necessary)
2. Replace `DefaultProperties` with `<Container display="contents" {...{ '*': defaultProps }}>`
3. Move `FontFamilyProvider` to `fontFamilies` on a `Container` or any other component
4. Replace `Icon` with `Svg` and rename `text` property → `content`
5. Rename `setStyle` → `setProperties`
6. Rename `border*` → `border*Width` variants
7. Update `textAlign: block` → `justify`
8. Remove `backgroundOpacity`/`borderOpacity`; use color with alpha or `withOpacity`/`useWithOpacity`
9. Remove `isInteractionPanel` usage
10. Remove `useRootSize`; use refs to access root size
11. Ensure `Image` has no children; wrap with relative container and place children absolutely with higher `zIndex`

### From Koestlich (Legacy)
- `Object` → `Content`
- Font declarations: `robotoNormal="url"` → `roboto={{ normal: "url" }}`
- `fontFamily="robotoBold"` → `fontFamily="roboto" fontWeight="bold"`

## Common Pitfalls

### Asynchronous Content Loading
The `Content` component measures its content upon creation. If content is loaded asynchronously, this initial measurement will be incorrect:

```tsx
// ❌ Wrong - Content measures empty Gltf initially
<Content>
  <Gltf src="model.glb" />
</Content>

// ✅ Correct - Use Suspense boundary
<Suspense fallback={<Loading />}>
  <Content>
    <Gltf src="model.glb" />
  </Content>
</Suspense>

// ✅ Alternative - Wrap in Suspense at higher level
<Suspense fallback={<Loading />}>
  <Content>
    <Gltf src="model.glb" />
  </Content>
</Suspense>
```

### Missing Local Clipping
For `overflow="hidden"` or `overflow="scroll"` to work, enable `localClippingEnabled`:

```tsx
<Canvas gl={{ localClippingEnabled: true }}>
  <Container overflow="scroll">
    {/* Scrollable content */}
  </Container>
</Canvas>
```

### Event Dispatching (Vanilla JS)
For manual event dispatching in vanilla UIKit:

```javascript
uiElement.dispatchEvent({
  type: 'pointerover',
  distance: 0,
  nativeEvent: {} as any,
  object: targetObject,
  point: new Vector3(),
  pointerId: -1,
})
```

## Interactivity

### Event Handlers
UIKit supports all React Three Fiber events plus custom UIKit-specific events:

```tsx
<Container
  // Standard R3F events
  onPointerOver={(e) => console.log('hover')}
  onPointerOut={(e) => console.log('unhover')}
  onClick={(e) => console.log('clicked')}
  onDoubleClick={(e) => console.log('double clicked')}
  onContextMenu={(e) => console.log('context menu')}
  onWheel={(e) => console.log('wheel')}

  // UIKit-specific events
  onSizeChange={(width, height) => console.log('size changed')}
  onIsClippedChange={(isClipped) => console.log('clipping changed')}
  onScroll={(x, y, scrollPosition, event) => {
    console.log('scrolled to:', x, y)
    // Return false to prevent scroll
    return false
  }}
/>
```

### Hover and Active States
Define different styles for interaction states:

```tsx
<Container
  backgroundColor="gray"
  hover={{ backgroundColor: "lightgray" }}
  active={{ backgroundColor: "darkgray" }}
/>
```

### Scroll Events
Handle scroll events with access to scroll position:

```tsx
<Container
  overflow="scroll"
  onScroll={(x, y, scrollPosition, event) => {
    console.log('Scroll position:', scrollPosition.value)
    // Prevent scroll by returning false
    return false
  }}
/>
```

### Scrollbar Styling
Customize scrollbar appearance:

```tsx
<Container
  overflow="scroll"
  scrollbarWidth={12}
  scrollbarBackgroundColor="rgba(0,0,0,0.1)"
  scrollbarBackgroundOpacity={0.8}
  scrollbarBorderRadius={6}
  scrollbarColor="rgba(0,0,0,0.3)"
/>
```

## Custom Materials

### Basic Custom Material
Create custom Three.js materials for UIKit components:

```tsx
import { MeshPhongMaterial } from 'three'

class CustomMaterial extends MeshPhongMaterial {
  constructor() {
    super({
      specular: 0x111111,
      shininess: 100,
      transparent: true,
      opacity: 0.8
    })
  }
}

<Container panelMaterialClass={CustomMaterial} />
```

### Advanced Custom Material Example
Full example with lighting and custom shader effects:

```tsx
class FancyMaterial extends MeshPhongMaterial {
  constructor() {
    super({
      specular: 0x111111,
      shininess: 100,
      emissive: 0x222222,
      transparent: true
    })
  }
}

export default function App() {
  return (
    <Canvas>
      <directionalLight position={[1,0,1]} intensity={10} />
      <Root>
        <Text
          backgroundColor="black"
          color="white"
          padding={24}
          borderRadius={32}
          fontSize={32}
          borderColor="black"
          borderBend={0.3}
          borderWidth={8}
          panelMaterialClass={FancyMaterial}
        >
          Custom Material Text
        </Text>
      </Root>
    </Canvas>
  )
}
```

### Custom Container with Shader Material
For full control over rendering:

```tsx
<CustomContainer width={200} height={200}>
  <shaderMaterial
    vertexShader="..."
    fragmentShader="..."
    uniforms={{ /* custom uniforms */ }}
  />
</CustomContainer>
```

## Font Management

### MSDF Font Generation
UIKit uses Multi-channel Signed Distance Field (MSDF) fonts for crisp text rendering at any size.

#### Prerequisites
```bash
npm install -g msdf-bmfont
```

#### Generate MSDF Font
```bash
# Generate JSON font and texture
npx msdf-bmfont -f json font.ttf -o output/font -s 48

# Or with custom charset
npx msdf-bmfont -f json font.ttf -i charset.txt -m 256,512 -o output/font -s 48
```

#### Character Set File (charset.txt)
```
!"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ €£
```

### Font Loading and Usage
```tsx
import { FontFamilyProvider } from '@react-three/uikit'

function App() {
  return (
    <FontFamilyProvider
      roboto={{
        normal: '/fonts/roboto-normal.json',
        bold: '/fonts/roboto-bold.json',
        italic: '/fonts/roboto-italic.json'
      }}
      inter={{
        light: '/fonts/inter-light.json',
        regular: '/fonts/inter-regular.json',
        medium: '/fonts/inter-medium.json',
        semibold: '/fonts/inter-semibold.json',
        bold: '/fonts/inter-bold.json'
      }}
    >
      <Text fontFamily="roboto" fontWeight="bold">
        Roboto Bold Text
      </Text>
      <Text fontFamily="inter" fontWeight="medium">
        Inter Medium Text
      </Text>
    </FontFamilyProvider>
  )
}
```

### Inline Font Texture (Advanced)
For self-contained fonts with base64-encoded textures:

```typescript
import generateBMFont from 'msdf-bmfont-xml'

generateBMFont('font.woff', {
  smallSize: true,
  charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ...',
  outputType: 'json'
}, async (error, textures, font) => {
  if (error) throw error

  // Convert textures to base64
  const pages = await Promise.all(
    textures.map(texture =>
      'data:image/png;base64,' + texture.texture.toString('base64')
    )
  )

  // Inline texture data
  const json = JSON.parse(font.data)
  json.pages = pages

  // Save modified font file
  await writeFile(font.filename, JSON.stringify(json))
})
```

### Font Properties
```tsx
<Text
  fontFamily="inter"           // Font family name
  fontWeight="bold"           // Font weight
  fontSize={24}               // Font size in pixels
  letterSpacing={0.02}        // Letter spacing
  lineHeight={1.2}            // Line height multiplier
  wordBreak="break-word"      // Word breaking behavior
  textAlign="center"          // Horizontal alignment
  verticalAlign="middle"      // Vertical alignment
>
  Formatted Text
</Text>
```

### Font Preprocessing (TTF Cleanup)
Remove overlapping paths from TTF fonts before MSDF generation:

```bash
# Linux with FontForge
fontforge -lang=ff -c 'Open($1); SelectAll(); RemoveOverlap(); Generate($2)' input.ttf output.ttf
```

## Performance Considerations

### Signal-based Animation
UIKit uses `@preact/signals-core` for reactive updates, providing superior performance for animations:

```tsx
import { Container } from '@react-three/uikit'
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { signal } from '@preact/signals-core'

export function AnimateBackground() {
  const opacity = useMemo(() => signal(0), [])
  useFrame(({ clock }) => {
    opacity.value = Math.sin(clock.elapsedTime) / 2 + 0.5
  })
  return <Container backgroundOpacity={opacity} />
}
```

### Direct Style Updates
For maximum performance, use `ref.current.setStyle()` to bypass React re-renders:

```tsx
import { Container } from '@react-three/uikit'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export function AnimateBackground() {
  const ref = useRef()
  useFrame(({ clock }) => {
    ref.current.setStyle({ backgroundOpacity: Math.sin(clock.elapsedTime) / 2 + 0.5 })
  })
  return <Container ref={ref} backgroundOpacity={0} />
}
```

### Optimization Tips
1. Use `DefaultProperties` to avoid prop drilling
2. Leverage signals for animations
3. Use appropriate `zIndexOffset` for layering
4. Minimize re-renders with stable references
5. Use `CustomContainer` for complex materials sparingly
6. Group animations using signals instead of state

### Memory Management
- Materials are shared automatically
- Geometries cached per unique parameters
- Fonts loaded once and cached
- Signals provide efficient reactive updates

## Integration Patterns

### With React Three Fiber
```tsx
<Canvas gl={{ localClippingEnabled: true }}>
  <OrbitControls />
  <Suspense fallback={<Loading />}>
    <Root>
      {/* UIKit components */}
    </Root>
  </Suspense>
</Canvas>
```

### With Existing 3D Scenes
```tsx
function Scene() {
  return (
    <>
      {/* 3D objects */}
      <mesh>...</mesh>

      {/* UI overlay */}
      <Fullscreen attachCamera distanceToCamera={5}>
        {/* UIKit components */}
      </Fullscreen>
    </>
  )
}
```

### State Management
```tsx
function App() {
  const [uiState, setUiState] = useState({ visible: true, text: '' })

  return (
    <Root>
      {uiState.visible && (
        <Container>
          <Input
            value={uiState.text}
            onValueChange={(text) => setUiState(prev => ({ ...prev, text }))}
          />
        </Container>
      )}
    </Root>
  )
}
```

This comprehensive API reference covers all major aspects of @react-three/uikit. The library provides a complete 3D UI system with professional-grade components, layout engine, and performance optimizations.
