import * as THREE from 'three'

export enum InnioState {
  WANDER = "wander",
  APPROACH = "approach",
  EAT = "eat",
  REST = "rest",
  TALK = "talk",
}

export interface InnioBehaviorOptions {
  approachThreshold?: number;    // distance under which the innio is considered to have reached the target
  restDuration?: number;         // how long the innio remains in REST state (in seconds) after eating
  eatDuration?: number;          // how long the eating animation lasts (in seconds)
  bounds?: { min: number; max: number }; // allowed X and Z range for targets
  onEat?: () => void;           // callback triggered when the innio finishes eating
  restCheckInterval?: number;    // How often (in seconds) to check if the innio should rest
  minWanderRestDuration?: number; // Min duration for a probabilistic rest
  maxWanderRestDuration?: number; // Max duration for a probabilistic rest
}

export class InnioBehavior {
  public state: InnioState;
  public target: THREE.Vector3 | null;
  public targetQueue: THREE.Vector3[];
  private options: InnioBehaviorOptions;
  private timer: number;
  
  // Single source of truth for stationary states (REST only now)
  public stationaryPosition: THREE.Vector3 | null;
  public stationaryDirection: THREE.Vector3 | null;
  
  // Flag to track if talking while moving
  public isTalking: boolean = false;

  // Temporary vector to reduce allocations
  private _tempVec: THREE.Vector3;

  // Add to the class properties
  private message: string = '';
  private currentProbabilisticRestDuration?: number; // Stores duration for a specific probabilistic rest
  private timeSinceLastRestCheck: number; // Timer for checking rest probability

  constructor(options?: InnioBehaviorOptions) {
    this.options = {
      approachThreshold: 0.5,
      restDuration: 2, // Default duration for post-eating rest
      eatDuration: 1,
      bounds: { min: -10, max: 10 },
      onEat: undefined,
      restCheckInterval: 10, // Default to checking every 10 seconds
      minWanderRestDuration: 1,
      maxWanderRestDuration: 5,
      ...options,
    };
    this.state = InnioState.WANDER;
    this.target = null;
    this.targetQueue = [];
    this.stationaryPosition = null;
    this.stationaryDirection = null;
    this.timer = 0;
    this._tempVec = new THREE.Vector3();
    this.currentProbabilisticRestDuration = undefined;
    this.timeSinceLastRestCheck = 0; // Initialize the new timer
  }

  /**
   * External method to set the food target.
   * Instead of overriding the current target if one exists, we queue additional food points.
   */
  public setFoodTarget(target: THREE.Vector3) {
    // If no current target, set it and transition (unless talking)
    if (!this.target) {
      this.target = target.clone();
      if (this.state !== InnioState.TALK) {
        this.state = InnioState.APPROACH;
        this.timer = 0;
      }
    } else {
      // Otherwise queue it
      this.targetQueue.push(target.clone());
    }
  }

  /**
   * Call this on every frame.
   * The update logic is:
   * - In APPROACH, if the innio is near the target, switch to EAT.
   * - In EAT, count elapsed time (allowing an eating animation to play), then call onEat and switch to REST.
   * - In REST, wait a little (simulate a pause), then:
   *   > If there is another food target queued, switch to APPROACH with that target.
   *   > Otherwise, return to WANDER.
   */
  public update(headPosition: THREE.Vector3, velocity: THREE.Vector3, deltaTime: number) {
    switch (this.state) {
      case InnioState.APPROACH:
        if (this.target) {
          // Reuse the temporary vector instead of creating a new one
          this._tempVec.copy(headPosition).sub(this.target);
          if (this._tempVec.length() < this.options.approachThreshold!) {
            this.state = InnioState.EAT;
            this.timer = 0;
          }
        }
        break;

      case InnioState.EAT:
        this.timer += deltaTime;
        if (this.timer >= this.options.eatDuration!) {
          this.options.onEat?.();
          this.currentProbabilisticRestDuration = undefined; // Ensure this is clear before entering post-eat rest
          this.enterStationaryState(InnioState.REST, headPosition, velocity);
        }
        break;

      case InnioState.REST:
        this.timer += deltaTime;
        let durationForThisRest = this.options.restDuration!;
        if (this.currentProbabilisticRestDuration !== undefined) {
          durationForThisRest = this.currentProbabilisticRestDuration;
        }

        if (this.timer >= durationForThisRest) {
          if (this.currentProbabilisticRestDuration !== undefined) {
            this.currentProbabilisticRestDuration = undefined; // Clear it after use
          }
          this.exitStationaryState();
        }
        break;

      case InnioState.WANDER:
        // If innio is talking, it should not make autonomous decisions like resting.
        // Actual movement during TALK is handled by Innio.tsx based on velocity when TALK started.
        if (this.isTalking) {
            break;
        }

        // Priority 1: If there's food in queue, approach it.
        if (!this.target && this.targetQueue.length > 0) {
          this.target = this.targetQueue.shift()!;
          this.state = InnioState.APPROACH;
          this.timer = 0;
          this.currentProbabilisticRestDuration = undefined; // Clear any pending probabilistic rest
          this.timeSinceLastRestCheck = 0; // Reset rest check timer when starting to approach food
          break; 
        }

        // Priority 2: Periodically check if the innio should rest.
        this.timeSinceLastRestCheck += deltaTime;
        if (this.options.restCheckInterval && this.timeSinceLastRestCheck >= this.options.restCheckInterval) {
          this.timeSinceLastRestCheck = 0; // Reset the timer

          if (this.options.minWanderRestDuration !== undefined &&
              this.options.maxWanderRestDuration !== undefined &&
              this.options.minWanderRestDuration <= this.options.maxWanderRestDuration && // Basic sanity check
              Math.random() < 0.5) { // 50% chance to rest
            
            this.currentProbabilisticRestDuration = THREE.MathUtils.randFloat(
                this.options.minWanderRestDuration,
                this.options.maxWanderRestDuration
            );
            this.enterStationaryState(InnioState.REST, headPosition, velocity);
            break; 
          }
        }
        
        // Otherwise, continue wandering (actual movement logic is in Innio.tsx)
        break;

      case InnioState.TALK:
        // While talking, the innio might be stationary or continue its previous movement.
        // Don't change any movement behavior while talking
        // This allows the innio to continue its current movement
        break;
    }
  }

  private enterStationaryState(state: InnioState.REST | InnioState.TALK, position: THREE.Vector3, velocity: THREE.Vector3) {
    this.stationaryPosition = position.clone();
    
    // Set direction, preferring current velocity if significant
    if (velocity.length() > 0.001) {
      this.stationaryDirection = velocity.clone().normalize();
    } else if (this.stationaryDirection) {
      // Keep existing direction
      this.stationaryDirection = this.stationaryDirection.clone();
    } else {
      // Default to forward
      this.stationaryDirection = new THREE.Vector3(0, 0, 1);
    }
    
    this.state = state;
    this.timer = 0;
  }

  private exitStationaryState() {
    if (this.targetQueue.length > 0) {
      this.target = this.targetQueue.shift()!;
      this.state = InnioState.APPROACH;
    } else {
      this.state = InnioState.WANDER;
      this.target = null;
    }
    this.stationaryPosition = null;
    this.stationaryDirection = null;
    this.timer = 0;
    this.currentProbabilisticRestDuration = undefined;
    this.timeSinceLastRestCheck = 0; // Reset on full reset as well
  }

  // Updated to not make the innio stationary
  public startTalking(position: THREE.Vector3, velocity: THREE.Vector3, message?: string) {
    // Enter stationary state with TALK state (makes innio stop moving)
    this.enterStationaryState(InnioState.TALK, position, velocity);
    this.isTalking = true;
    
    if (message) {
      this.message = message;
    }
  }

  public stopTalking() {
    if (this.state === InnioState.TALK) {
      // Just return to previous state (or WANDER by default)
      this.state = InnioState.WANDER; // Default to WANDER after talking
      this.isTalking = false;
      // this.stationaryPosition = null; // Clear these as it's no longer in a fixed "talk" position
      // this.stationaryDirection = null;
      // If we want it to resume wandering smoothly, these should ideally not be nulled
      // if it was moving while talking. The exitStationaryState will handle WANDER.
      this.exitStationaryState(); // This will correctly transition to WANDER or APPROACH if food is queued
    }
  }

  public resetTarget() {
    this.target = null;
    this.targetQueue = [];
    this.stationaryPosition = null;
    this.stationaryDirection = null;
    this.state = InnioState.WANDER;
    this.timer = 0;
    this.currentProbabilisticRestDuration = undefined;
    this.timeSinceLastRestCheck = 0; // Reset on full reset as well
  }

  // Helper to check if we're in a stationary state (now only REST)
  public isStationary(): boolean {
    return this.state === InnioState.REST || this.state === InnioState.TALK;
  }

  // Add a method to set message
  public setMessage(text: string) {
    this.message = text;
  }

  // Add a method to get message
  public getMessage(): string {
    return this.message;
  }
} 