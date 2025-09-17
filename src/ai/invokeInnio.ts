import type { InnioClient } from '../components/fish/config/Types'

export function createDefaultInnioClient(): InnioClient {
  return {
    reset() {
      if (import.meta.env.DEV) console.log('Innio: reset called')
    },
    async respond(input: string): Promise<string> {
      // Mock; replace with real client later
      const preview = input.trim().slice(0, 48)
      return Promise.resolve(`Mock response to: "${preview}${input.length > 48 ? '…' : ''}"`)
    },
  }
}


