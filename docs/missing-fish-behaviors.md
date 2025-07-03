# Missing Behaviors from Fish.tsx in Innio.tsx

## 1. Movement & Physics Nuances

### 1.1 Minimum Speed Maintenance
**Original Fish.tsx:**
```typescript
// Set a minimum speed (70-90% of max) for more constant movement
const minSpeed = params.maxSpeed * 0.8;
// Ensure velocity is between min and max speed
if (currentVelocity.current.length() < minSpeed) {
  currentVelocity.current.normalize().multiplyScalar(minSpeed);
} else {
  currentVelocity.current.clampLength(0, params.maxSpeed);
}
```
This ensures the fish maintains a minimum swimming speed, creating more natural movement.

### 1.2 Darting Movements
**Original Fish.tsx:**
```typescript
// Add some quick, darting movements for more natural fish behavior
if (Math.random() < 0.02) { // Occasional quick darting movements
  const dart = Math.random() * 0.4 + 0.8; // 0.8-1.2x speed multiplier
  headRef.current!.position.add(
    currentVelocity.current.clone().multiplyScalar(dart)
  );
} else {
  headRef.current!.position.add(currentVelocity.current);
}
```
Random acceleration bursts make the movement more lifelike.

### 1.3 Vision-Based Boundary Avoidance
**Original Fish.tsx:**
```typescript
const visionPoint = vectorPool.get();
visionPoint.copy(headRef.current!.position).add(forward.clone().multiplyScalar(params.visionDistance));

const isVisionOut = visionPoint.x < params.bounds.min + params.boundaryBuffer ||
                    visionPoint.x > params.bounds.max - params.boundaryBuffer ||
                    // ... checks for all axes

if (isVisionOut) {
  const toCenter = vectorPool.get();
  toCenter.subVectors(new THREE.Vector3(0, 0, 0), headRef.current!.position).normalize();
  base.copy(headRef.current!.position).add(toCenter.multiplyScalar(params.forwardDistance));
  vectorPool.release(toCenter);
}
```
The fish looks ahead and steers away from boundaries preemptively.

### 1.4 3D Wander Target Generation
**Original Fish.tsx:**
```typescript
// Generate a random direction in 3D space
const phi = Math.random() * Math.PI * 2; // Azimuthal angle
const theta = Math.random() * Math.PI; // Polar angle
offset.set(
  Math.sin(theta) * Math.cos(phi),
  Math.sin(theta) * Math.sin(phi),
  Math.cos(theta)
).multiplyScalar(offsetLen);
```
Uses spherical coordinates for true 3D wandering.

## 2. Visual & Rendering Details

### 2.1 Perspective Line (Currently Unused)
**Original Fish.tsx:**
```typescript
// Calculate perspective line
if (headRef.current) {
  const headPosition = headRef.current.position.clone()
  const headScreenSpace = headPosition.clone().project(state.camera)
  const angleToCenter = Math.atan2(headScreenSpace.x, 1)
  const maxTilt = 0 // Currently disabled
  const lineLength = 3.5
  
  const lineVector = new THREE.Vector3(
    Math.sin(angleToCenter) * maxTilt,
    1,
    -Math.abs(Math.sin(angleToCenter)) * 0.5
  ).normalize().multiplyScalar(lineLength)
  
  // Update line geometry
  if (headRef.current && lineRef.current) {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(lineEnd.x, lineEnd.y, lineEnd.z)
    ];
    lineRef.current.geometry.setFromPoints(points);
  }
}
```

### 2.2 Non-Uniform Scaling
**Original Fish.tsx:**
```typescript
// Head scaling
<primitive object={new THREE.Object3D()} scale={[1.2, 0.85, 1]} />

// Tail segments with progressive vertical scaling
const verticalScale = 0.85 - (segProgress * 0.15);
<primitive object={new THREE.Object3D()} scale={[1, verticalScale, 1]} />
```
Creates a more organic, flattened appearance.

### 2.3 Food Target State Management
**Original Fish.tsx:**
```typescript
const [foodTarget, setFoodTarget] = useState<THREE.Vector3 | null>(null)

// In onEat callback
onEat: () => {
  setFoodTarget(null)
  setTailCount((prev) => {
    if (prev == MAX_LENGTH) {
      return prev
    }
    return prev + 1
  })
}
```
Maintains separate state for food targets.

## 3. Interaction Refinements

### 3.1 Double-Click Time Window
**Original Fish.tsx:**
```typescript
const DOUBLE_CLICK_TIME_THRESHOLD = 400; // ms between taps
const timeSinceLastTap = upTime - lastFeedTapTimeRef.current;
if (timeSinceLastTap < DOUBLE_CLICK_TIME_THRESHOLD) {
  handleFeedFish(e.point);
  lastFeedTapTimeRef.current = 0;
} else {
  lastFeedTapTimeRef.current = upTime;
}
```
Custom double-click detection with timing control.

### 3.2 Click Movement Threshold
**Original Fish.tsx:**
```typescript
const CLICK_MOVE_THRESHOLD_SQUARED = 5 * 5;
const dx = e.point.x - downDetails.point.x;
const dz = e.point.z - downDetails.point.z;
const distSq = dx * dx + dz * dz;
if (distSq > CLICK_MOVE_THRESHOLD_SQUARED) {
  // Reject as not a valid click
  return;
}
```
Prevents accidental clicks during dragging.

### 3.3 Cursor State Management
**Original Fish.tsx:**
```typescript
onPointerOver={() => document.body.style.cursor = 'pointer'}
onPointerOut={() => document.body.style.cursor = 'default'}
```
Visual feedback for interactive elements.

## 4. State Machine & Behavior

### 4.1 Message Update During Talk State
**Original Fish.tsx:**
```typescript
else if (fishMessage && fishBehavior.state === FishState.TALK) {
  // Update the message if already talking
  console.log("Updating fish message");
  fishBehavior.setMessage(fishMessage)
}
```
Allows message updates while talking.

### 4.2 Boundary Buffer Logic
**Original Fish.tsx:**
```typescript
const buffer = 30; // Much larger buffer in original
const isVisionOut = visionPoint.x < params.bounds.min + params.boundaryBuffer ||
                    visionPoint.x > params.bounds.max - params.boundaryBuffer
```
Uses a configurable boundary buffer for smoother avoidance.

## 5. Performance & Debug Features

### 5.1 Process Environment Checks
**Original Fish.tsx:**
```typescript
if (process.env.NODE_ENV === 'development') {
  const intervalId = setInterval(() => {
    console.log(`Vector pool stats: ${vectorPool.size()} available...`);
  }, 10000);
}
```
Development-only debug logging.

### 5.2 Vector Pool Debug Info
**Original Fish.tsx:**
```typescript
const created = { count: 0 };
// ...
if (created.count % 100 === 0) {
  console.warn(`Vector pool depleted ${created.count} times...`);
}
```
Tracks vector pool performance.

## 6. Audio Integration

### 6.1 Audio Listener Management
**Original Fish.tsx:**
```typescript
const audioListener = useRef<THREE.AudioListener | null>(null);

useEffect(() => {
  if (headRef.current) {
    audioListener.current = new THREE.AudioListener();
    headRef.current.add(audioListener.current);
  }
  return () => {
    if (audioListener.current && headRef.current) {
      headRef.current.remove(audioListener.current);
    }
  };
}, []);
```
Properly attaches audio listener to the fish head.

## 7. UI/UX Details

### 7.1 Camera Lock Controls
**Original Fish.tsx:**
```typescript
const cameraControls = useControls('Camera', {
  locked: { value: false, label: 'Lock to Fish' },
  followDistance: { value: 5, min: 2, max: 10, step: 0.1 },
  height: { value: 3, min: 1, max: 10, step: 0.1 },
}, { collapsed: true })
```
Allows camera to follow the fish.

### 7.2 Loading State Animation
**Original Fish.tsx:**
```typescript
useEffect(() => {
  if (isLoading) {
    let direction = 1;
    const pulseAnimation = setInterval(() => {
      direction *= -1;
      setHeadSpring({ 
        scale: direction > 0 ? 1.1 : 1,
        config: { duration: 500 }
      });
    }, 500);
    
    return () => clearInterval(pulseAnimation);
  }
}, [isLoading]);
```
Visual feedback during AI response loading.

## Implementation Priority

1. **High Priority** (Core behavior):
   - Minimum speed maintenance
   - Darting movements
   - Vision-based steering
   - 3D wander targets
   - Double-click/long-press refinements

2. **Medium Priority** (Polish):
   - Non-uniform scaling
   - Cursor state changes
   - Message updates during talk
   - Loading animations

3. **Low Priority** (Nice to have):
   - Perspective line
   - Camera lock
   - Debug logging
   - Process.env checks 