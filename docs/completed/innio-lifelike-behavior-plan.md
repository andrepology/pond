# Innio Lifelike Behavior Enhancement Plan

## Current Critical Issues

### 1. Boundary Avoidance Failure
The current implementation has a fundamental flaw in boundary detection and response:

```typescript
// Current problematic code:
if (Math.abs(pos.x) > params.bounds.max - buffer || Math.abs(pos.z) > params.bounds.max - buffer) {
    // This only triggers when ALREADY too close
    const center = tempVec2.set(0, pos.y, 0);
    desired.subVectors(center, pos).normalize().multiplyScalar(params.maxSpeed);
}
```

**Problems:**
- Only reacts when already at boundary, not preemptively
- No turning animation - just reverses direction
- Doesn't consider current velocity/momentum
- Can get stuck oscillating at boundaries

### 2. Robotic Movement Patterns
- Constant speed feels unnatural
- No acceleration/deceleration curves
- Missing the "burst and glide" pattern of real fish
- No lateral movements or body banking

### 3. Missing Physics Realism
- No momentum conservation
- Instant direction changes
- No consideration of body dynamics
- Missing the sinusoidal wave motion through the body

## Real Fish Behavior Principles

### 1. **Anticipation & Sensing**
Fish don't just react to walls - they sense them coming and adjust course smoothly:
- Lateral line system detects pressure changes
- Visual system provides early warning
- Gradual course corrections start early
- Panic responses only when surprised

### 2. **Momentum & Propulsion**
Real fish swimming involves:
- **Burst Phase**: Tail thrust generates forward momentum
- **Glide Phase**: Coasting with minimal movement
- **Banking**: Body tilts into turns
- **Speed Variation**: Slower when exploring, faster when directed

### 3. **Body Dynamics**
Fish bodies are flexible:
- Head leads the direction change
- Body follows in a wave
- Tail provides thrust at the end
- Whole body participates in turning

## Detailed Implementation Plan

### Phase 1: Fix Critical Boundary Behavior

#### 1.1 Implement Proper Boundary Detection
```typescript
// Proposed approach:
const boundaryDetection = {
    // Multiple detection zones
    dangerZone: 0.1,      // Very close - emergency turn
    cautionZone: 0.3,     // Close - strong avoidance
    awarenessZone: 0.5,   // Approaching - gentle steering
    
    // Check distance to nearest boundary
    getDistanceToBoundary: (pos: Vector3) => {
        const distances = [
            params.bounds.max - Math.abs(pos.x),
            params.bounds.max - Math.abs(pos.y),
            params.bounds.max - Math.abs(pos.z)
        ];
        return Math.min(...distances);
    },
    
    // Get repulsion force based on proximity
    getBoundaryForce: (pos: Vector3, velocity: Vector3) => {
        const dist = getDistanceToBoundary(pos);
        const normal = getNearestBoundaryNormal(pos);
        
        if (dist < dangerZone) {
            // Emergency: Strong repulsion + velocity reversal
            return normal.multiplyScalar(maxSteerForce * 3);
        } else if (dist < cautionZone) {
            // Caution: Moderate steering away
            const force = normal.multiplyScalar(maxSteerForce * 2);
            // Blend with desired direction for smoother turn
            return force.lerp(desired, 0.3);
        } else if (dist < awarenessZone) {
            // Awareness: Gentle course correction
            return normal.multiplyScalar(maxSteerForce * 0.5);
        }
        return new Vector3(0, 0, 0);
    }
};
```

#### 1.2 Implement Turning Animation
```typescript
// When approaching boundary:
1. Detect boundary early (awarenessZone)
2. Begin body curve animation:
   - Head starts turning first
   - Body segments follow with delay
   - Tail whips to provide turning thrust
3. Adjust speed:
   - Slow down when turning
   - Speed up when heading to open water
4. Add banking:
   - Tilt body into the turn
   - More tilt = sharper turn
```

### Phase 2: Implement Organic Movement

#### 2.1 Burst and Glide Swimming
```typescript
interface SwimCycle {
    phase: 'burst' | 'glide' | 'turn';
    timer: number;
    intensity: number;
}

// Implement cyclic swimming:
- Burst: 0.3-0.5 seconds of acceleration
- Glide: 0.5-1.5 seconds of coasting
- Speed varies from 0.3x to 1.2x base speed
- More frequent bursts when excited/fleeing
```

#### 2.2 Momentum-Based Physics
```typescript
interface FishPhysics {
    mass: number;           // Affects acceleration
    dragCoefficient: number; // Water resistance
    thrustPower: number;    // Tail strength
    
    // Apply forces instead of direct velocity
    applyForce(force: Vector3) {
        const acceleration = force.divideScalar(mass);
        velocity.add(acceleration.multiplyScalar(deltaTime));
        
        // Apply drag
        const drag = velocity.clone().multiplyScalar(-dragCoefficient);
        velocity.add(drag.multiplyScalar(deltaTime));
    }
}
```

#### 2.3 Sinusoidal Body Motion
```typescript
// Enhanced tail animation:
const updateBodyWave = (time: number, speed: number) => {
    const waveFrequency = speed * 2 + 1; // Faster swim = faster wave
    const waveAmplitude = speed * 0.3;   // More speed = bigger movements
    
    for (let i = 0; i < segments.length; i++) {
        const delay = i * 0.1; // Wave travels down body
        const phase = time * waveFrequency - delay;
        
        // Lateral offset
        const offset = Math.sin(phase) * waveAmplitude * (i / segments.length);
        
        // Apply to segment position
        segment.position.x += offset;
        
        // Also rotate segment to follow wave
        segment.rotation.y = Math.sin(phase + 0.5) * 0.2;
    }
};
```

### Phase 3: Advanced Behaviors

#### 3.1 Contextual Speed Control
```typescript
const getTargetSpeed = (context: FishContext) => {
    if (nearBoundary) return baseSpeed * 0.5;  // Cautious
    if (approachingFood) return baseSpeed * 1.2; // Eager
    if (fleeing) return baseSpeed * 1.5;        // Fast escape
    if (resting) return baseSpeed * 0.1;        // Drift
    
    // Default: vary speed naturally
    const cycle = Math.sin(time * 0.5) * 0.2 + 0.8;
    return baseSpeed * cycle;
};
```

#### 3.2 Smooth Turning Mechanics
```typescript
const executeTurn = (targetDirection: Vector3) => {
    // 1. Calculate turn angle
    const turnAngle = currentDirection.angleTo(targetDirection);
    
    // 2. Determine turn rate based on angle
    const turnRate = turnAngle > Math.PI/2 ? 
        maxTurnRate : // Sharp turn
        maxTurnRate * (turnAngle / (Math.PI/2)); // Gradual
    
    // 3. Apply turn with body dynamics
    const turnStages = {
        initiate: () => {
            // Head turns first
            headDirection.lerp(targetDirection, turnRate * 1.5);
        },
        propagate: () => {
            // Body follows with S-curve
            for (let i = 0; i < segments.length; i++) {
                const delay = i * 0.05;
                const segmentRate = turnRate * (1 - delay);
                segments[i].direction.lerp(targetDirection, segmentRate);
            }
        },
        complete: () => {
            // Tail whip for propulsion
            tailDirection.lerp(targetDirection, turnRate * 0.5);
        }
    };
};
```

#### 3.3 Panic Response
```typescript
const panicResponse = (threat: Vector3) => {
    // Instant burst of speed
    const escapeDirection = position.sub(threat).normalize();
    
    // Override normal swimming
    swimPhase = 'panic';
    targetSpeed = maxSpeed * 2;
    
    // Erratic movement
    escapeDirection.add(randomVector().multiplyScalar(0.3));
    
    // Tighten body for speed
    waveAmplitude *= 0.5;
    waveFrequency *= 2;
};
```

### Phase 4: Visual Enhancements

#### 4.1 Body Banking
```typescript
// Tilt into turns like a real fish
const bankAngle = Math.atan2(lateralAcceleration, gravity) * 0.5;
fishGroup.rotation.z = THREE.MathUtils.lerp(
    fishGroup.rotation.z,
    bankAngle,
    0.1
);
```

#### 4.2 Fin Movements
```typescript
// Pectoral fins for stability
const updateFins = (velocity: Vector3, turning: boolean) => {
    if (turning) {
        // Spread fins for turning
        leftFin.rotation.y = -0.3;
        rightFin.rotation.y = 0.3;
    } else if (velocity.length() < 0.1) {
        // Gentle fin movements when hovering
        const finWave = Math.sin(time * 2) * 0.1;
        leftFin.rotation.z = finWave;
        rightFin.rotation.z = -finWave;
    }
};
```

## Implementation Priority

### Immediate (Fix Critical Issues):
1. **Boundary Detection System** - Multi-zone approach
2. **Turning Mechanics** - Smooth, anticipatory turns
3. **Momentum Physics** - No more instant direction changes

### Short Term (Natural Movement):
4. **Burst-Glide Swimming** - Natural speed variation
5. **Body Wave Dynamics** - Sinusoidal motion
6. **Banking Animation** - Tilt into turns

### Medium Term (Polish):
7. **Contextual Behaviors** - Speed based on situation
8. **Panic Responses** - Emergency escapes
9. **Fin Animations** - Subtle details

### Long Term (Advanced):
10. **Flocking Behavior** - Multiple fish coordination
11. **Obstacle Navigation** - Complex pathfinding
12. **Personality System** - Individual behavior variations

## Testing Approach

1. **Boundary Tests**:
   - Fish should never get stuck at edges
   - Smooth turns before hitting boundary
   - Natural deceleration when approaching walls

2. **Movement Tests**:
   - Speed should vary naturally
   - No robotic constant velocity
   - Smooth acceleration/deceleration

3. **Visual Tests**:
   - Body should flex naturally
   - Banking should match turn intensity
   - Overall movement should "feel" organic

## Success Metrics

- **No boundary collisions** - Fish anticipates and avoids
- **Natural speed variation** - 0.3x to 1.2x base speed
- **Smooth turning** - No instant direction changes
- **Body dynamics** - Visible flex and banking
- **Emergent behaviors** - Unpredictable but logical movement 