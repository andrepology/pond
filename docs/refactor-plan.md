# Fish.tsx Refactoring Plan

This document outlines a plan to refactor the `Fish.tsx` component. The goal is to significantly improve its structure, readability, and maintainability by separating concerns and breaking it down into smaller, reusable pieces. **No functionality will be removed.**

---

### Guiding Principles

1.  **Separation of Concerns**: Move non-rendering logic out of the component.
2.  **Encapsulation**: Group related state and logic into custom hooks.
3.  **Readability**: Make the main component's render method clean and declarative.
4.  **Maintainability**: Create smaller, focused modules that are easier to understand and test.

---

### Phase 1: Create Custom Hooks for Logic Encapsulation

The core of the refactor is to extract complex logic into dedicated custom hooks.

#### 1.1. `useFishMovement` Hook
- **Responsibility**: Handle all physics, steering, and animation calculations related to the fish's physical movement.
- **Contents**:
    - The `updateMovement` function.
    - The `computeTargetDirection` function.
    - The `updateTailSegments` function.
    - All related refs and state: `currentVelocity`, `lastHeadDir`, `wanderTargetRef`, `tailPositions`, etc.
    - The main `useFrame` call that orchestrates the movement updates.
- **Interface**:
    - **Input**: `fishBehavior`, `headRef`, `tailRefs`, and relevant control parameters from `leva`.
    - **Output**: Nothing. This hook will directly manipulate the `ref` objects passed to it within its own `useFrame`.

#### 1.2. `useFishInteraction` Hook
- **Responsibility**: Manage all direct user interactions with the fish and the environment.
- **Contents**:
    - The `handleFishClick` function (for triggering AI).
    - The `handleFeedFish` function.
    - State management for interactions, e.g., `[isLoading, setIsLoading]`.
    - Logic for the pulse and spring animations that provide immediate feedback on click.
- **Interface**:
    - **Input**: `fishBehavior`, `setHeadSpring`, `me`, `generateResponse`, `resetForNewEntry`.
    - **Output**: Returns the event handler functions (`handleFishClick`, `handleFeedFish`) and the `isLoading` state.

#### 1.3. `useFishSpeech` Hook
- **Responsibility**: Encapsulate the entire speech animation system.
- **Contents**:
    - The two complex `useEffect` hooks for orchestrating message display.
    - All related state: `allWordsForCurrentMessage`, `displayWords`, `isTextContainerVisible`.
    - All related refs: `wordVisibilityTimeoutsRef`, `stopTalkCleanupTimeoutRef`.
- **Interface**:
    - **Input**: `fishBehavior`.
    - **Output**: Returns an object with the props needed by the `Html` component for rendering: `{ displayWords, isTextContainerVisible }`.

#### 1.4. `usePointerEvents` (Generic Utility Hook)
- **Responsibility**: Abstract the complex logic for differentiating single-clicks, double-clicks, and long-presses.
- **Contents**:
    - The `onPointerDown`, `onPointerUp`, `onPointerMove`, `onDoubleClick`, and `onClick` logic.
    - Internal refs for tracking timers and positions (`lastPointerDownRef`, etc.).
- **Interface**:
    - **Input**: An object with callbacks, e.g., `{ onDoubleClick, onLongPress }`.
    - **Output**: Returns an object of event handlers (`{ onPointerDown, onPointerUp, ... }`) that can be spread onto a mesh.

### Phase 2: Refactor the Main `Fish.tsx` Component

After creating the hooks, the main component will be dramatically simplified.

- **Remove Old Logic**: Delete all the functions, `useEffect` hooks, and state that have been moved into the new custom hooks.
- **Integrate Hooks**: Call the new hooks at the top of the component to get the necessary state and event handlers.
- **Declarative JSX**: The component's return statement will become a clean, declarative JSX tree. The props for meshes and UI elements will be sourced directly from the hooks.

**Example of the new component structure:**

```typescript
// src/components/Fish.tsx

const Fish: React.FC<FishProps> = ({ onPositionUpdate }) => {
  // --- Refs to 3D objects (remain in component) ---
  const headRef = useRef<THREE.Mesh>(null);
  const tailRefs = useRef<(THREE.Mesh | null)[]>([]);

  // --- Leva Controls (remain in component) ---
  const movementControls = useControls(...);
  // ...

  // --- Custom Hooks ---
  const { handleFishClick, handleFeedFish, isLoading } = useFishInteraction(...);
  const { displayWords, isTextContainerVisible } = useFishSpeech(fishBehavior);
  const pointerEventHandlers = usePointerEvents({ onDoubleClick: handleFeedFish, onLongPress: handleFeedFish });
  useFishMovement(fishBehavior, headRef, tailRefs, ...); // This hook doesn't return, it just runs

  // --- JSX ---
  return (
    <group>
      {/* Ground plane with simplified event handlers */}
      <mesh {...pointerEventHandlers}>
        {/* ... */}
      </mesh>

      {/* Fish head */}
      <a.mesh ref={headRef} onPointerDown={handleFishClick}>
        {/* ... */}
        {(fishBehavior.state === FishState.TALK) && (
          <Html>
            {/* JSX for speech bubble using `displayWords` and `isTextContainerVisible` */}
          </Html>
        )}
      </a.mesh>
      
      {/* ... Tail and markers ... */}
    </group>
  );
};
```

### Phase 3: Code Cleanup and Dependency Fixes

1.  **Resolve Linter Errors**:
    -   Run `pnpm install @react-three/postprocessing @react-spring/three jazz-react @types/node` to add missing dependencies.
    -   Correct all import paths (`../../steering/FishBehavior` will become `../FishBehavior`).
    -   Fix all `verbatimModuleSyntax` errors by using `import type { ... }` for types.

2.  **Centralize Constants**: Move hardcoded values (e.g., `PULSE_SPEED`, animation durations, color values) to a `constants.ts` file or to the top of their respective hooks to improve configurability.

3.  **Create Helper Files**: Move pure utility functions like `smoothstep` and the `vectorPool` implementation into a `src/utils/` directory to be imported where needed.

This phased approach ensures a structured and manageable refactoring process, leading to a much cleaner, more modular, and professional codebase. 