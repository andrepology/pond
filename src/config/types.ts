export interface Vec3 { x: number; y: number; z: number }

export interface Bounds {
  min: number
  max: number
  buffer?: number
}

export interface FishIntent {
  state: 'wander' | 'approach' | 'eat' | 'rest' | 'talk'
  target?: Vec3
  talkMessage?: string
}

export interface InnioClient {
  reset(): void
  respond(input: string): Promise<string>
}


