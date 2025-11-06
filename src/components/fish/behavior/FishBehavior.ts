import type { Vec3, FishIntent } from '../config/Types'

export interface FishBehaviorOptions {
  approachThreshold?: number
  restDuration?: number
  eatDuration?: number
  restCheckInterval?: number
  minWanderRestDuration?: number
  maxWanderRestDuration?: number
}

function v3(x = 0, y = 0, z = 0): Vec3 { return { x, y, z } }

export class FishBehaviorFSM {
  private _state: FishIntent['state'] = 'wander'
  private _target: Vec3 | undefined
  private _queue: Vec3[] = []
  private _timer = 0
  private _message = ''
  private _currentProbRest?: number
  private _timeSinceRestCheck = 0
  private readonly opt: Required<FishBehaviorOptions>

  constructor(options?: FishBehaviorOptions) {
    this.opt = {
      approachThreshold: 0.5,
      restDuration: 0.5,
      eatDuration: 0.3,
      restCheckInterval: 10,
      minWanderRestDuration: 2.5,
      maxWanderRestDuration: 8,
      ...options,
    }
  }

  state(): FishIntent['state'] { return this._state }
  intent(): FishIntent { return { state: this._state, target: this._target, talkMessage: this._message } }

  enqueueFood(target: Vec3) {
    if (!this._target) {
      this._target = { ...target }
      if (this._state !== 'talk') {
        this._state = 'approach'
        this._timer = 0
      }
    } else {
      this._queue.push({ ...target })
    }
  }

  startTalking(message?: string) {
    this._state = 'talk'
    this._timer = 0
    if (message) this._message = message
  }

  stopTalking() {
    if (this._queue.length > 0) {
      this._target = this._queue.shift()
      this._state = 'approach'
    } else {
      this._state = 'wander'
      this._target = undefined
    }
    this._timer = 0
    this._currentProbRest = undefined
    this._timeSinceRestCheck = 0
  }

  reset() {
    this._state = 'wander'
    this._target = undefined
    this._queue = []
    this._timer = 0
    this._currentProbRest = undefined
    this._timeSinceRestCheck = 0
  }

  tick(dt: number) {
    switch (this._state) {
      case 'approach': {
        if (this._target) {
          // distance check without Three
          // Using squared distance to avoid sqrt where possible
          // If closer than threshold, eat
          const dx = this._target.x // head pos provided by movement; FSM uses threshold only
          // Note: FSM shouldn’t own positions; movement will trigger transition by calling a method when reached.
          // We keep approach logic minimal here.
        }
        break
      }
      case 'eat': {
        this._timer += dt
        if (this._timer >= this.opt.eatDuration) {
          this._currentProbRest = undefined
          this._state = 'rest'
          this._timer = 0
        }
        break
      }
      case 'rest': {
        this._timer += dt
        const restDur = this._currentProbRest ?? this.opt.restDuration
        if (this._timer >= restDur) {
          if (this._queue.length > 0) {
            this._target = this._queue.shift()
            this._state = 'approach'
          } else {
            this._state = 'wander'
            this._target = undefined
          }
          this._timer = 0
          this._currentProbRest = undefined
        }
        break
      }
      case 'wander': {
        this._timeSinceRestCheck += dt
        if (this._target == null && this._queue.length > 0) {
          this._target = this._queue.shift()
          this._state = 'approach'
          this._timer = 0
          this._currentProbRest = undefined
          this._timeSinceRestCheck = 0
          break
        }
        if (this._timeSinceRestCheck >= this.opt.restCheckInterval) {
          this._timeSinceRestCheck = 0
          if (Math.random() < 0.5) {
            const min = this.opt.minWanderRestDuration
            const max = this.opt.maxWanderRestDuration
            this._currentProbRest = min + Math.random() * (max - min)
            this._state = 'rest'
            this._timer = 0
            break
          }
        }
        break
      }
      case 'talk': {
        // movement decides motion; FSM holds state until stopTalking()
        break
      }
    }
  }

  // Callbacks from movement/interaction
  onReachedTarget() {
    this._state = 'eat'
    this._timer = 0
  }
}


