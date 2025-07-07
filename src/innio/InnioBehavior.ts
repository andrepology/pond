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
  public stationaryPosition: THREE.Vector3 | null;
  public stationaryDirection: THREE.Vector3 | null;

  private options: InnioBehaviorOptions;
  private timer: number;
  private message: string = '';
  private timeSinceLastRestCheck: number;
  private currentProbabilisticRestDuration?: number;
  private _tempVec: THREE.Vector3;

  constructor(options?: InnioBehaviorOptions) {
    this.options = {
      approachThreshold: 0.5,
      restDuration: 2,
      eatDuration: 1,
      bounds: { min: -10, max: 10 },
      onEat: undefined,
      restCheckInterval: 10,
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
    this.timeSinceLastRestCheck = 0;
    this._tempVec = new THREE.Vector3();
  }

  public setFoodTarget(target: THREE.Vector3) {
    if (!this.target) {
      this.target = target.clone();
      if (this.state !== InnioState.TALK) {
        this.state = InnioState.APPROACH;
        this.timer = 0;
      }
    } else {
      this.targetQueue.push(target.clone());
    }
  }

  public update(headPosition: THREE.Vector3, velocity: THREE.Vector3, deltaTime: number) {
    switch (this.state) {
      case InnioState.APPROACH:
        if (this.target) {
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
          this.currentProbabilisticRestDuration = undefined;
          this.enterStationaryState(InnioState.REST, headPosition, velocity);
        }
        break;

      case InnioState.REST:
        this.timer += deltaTime;
        const durationForThisRest = this.currentProbabilisticRestDuration ?? this.options.restDuration!;
        if (this.timer >= durationForThisRest) {
          if (this.currentProbabilisticRestDuration !== undefined) {
            this.currentProbabilisticRestDuration = undefined;
          }
          this.exitStationaryState();
        }
        break;

      case InnioState.WANDER:
        if (this.targetQueue.length > 0 && !this.target) {
            this.target = this.targetQueue.shift()!;
            this.state = InnioState.APPROACH;
            this.timer = 0;
            this.timeSinceLastRestCheck = 0;
            this.currentProbabilisticRestDuration = undefined;
            break;
        }

        this.timeSinceLastRestCheck += deltaTime;
        if (this.timeSinceLastRestCheck >= this.options.restCheckInterval!) {
          this.timeSinceLastRestCheck = 0;
          if (Math.random() < 0.5) {
            this.currentProbabilisticRestDuration = THREE.MathUtils.randFloat(
              this.options.minWanderRestDuration!,
              this.options.maxWanderRestDuration!
            );
            this.enterStationaryState(InnioState.REST, headPosition, velocity);
          }
        }
        break;

      case InnioState.TALK:
        // Movement is handled in Innio.tsx
        break;
    }
  }

  private enterStationaryState(state: InnioState.REST | InnioState.TALK, position: THREE.Vector3, velocity: THREE.Vector3) {
    this.state = state;
    this.timer = 0;
    this.stationaryPosition = position.clone();
    
    if (velocity.length() > 0.001) {
      this.stationaryDirection = velocity.clone().normalize();
    } else if (!this.stationaryDirection) {
      this.stationaryDirection = new THREE.Vector3(0, 0, 1);
    }
  }

  private exitStationaryState() {
    this.stationaryPosition = null;
    this.stationaryDirection = null;
    this.timer = 0;
    
    if (this.targetQueue.length > 0) {
      this.target = this.targetQueue.shift()!;
      this.state = InnioState.APPROACH;
    } else {
      this.target = null;
      this.state = InnioState.WANDER;
    }
  }

  public startTalking(position: THREE.Vector3, velocity: THREE.Vector3, message: string) {
    this.message = message;
    this.enterStationaryState(InnioState.TALK, position, velocity);
  }

  public stopTalking() {
    if (this.state === InnioState.TALK) {
        this.message = '';
        this.exitStationaryState();
    }
  }

  public getMessage(): string | null {
    return this.state === InnioState.TALK ? this.message : null;
  }
  
  public setMessage(text: string) {
    this.message = text;
  }
} 