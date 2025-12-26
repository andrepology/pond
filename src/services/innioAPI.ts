// src/services/innioAPI.ts
const INNIOS_BASE = "https://innios-mind-v2.fly.dev/api";

export const innioAPI = {
  async createWorldModel(payload: any) {
    return this.callAPI("create_world_model", payload);
  },

  async takeNotes(payload: any) {
    return this.callAPI("take_notes", payload);
  },

  async summarizeConversation(payload: any) {
    return this.callAPI("summarize_conversation", payload);
  },

  async createFirstMsg(payload: any) {
    return this.callAPI("create_first_msg", payload);
  },

  async callAPI(endpoint: string, payload: any, retryCount = 0) {
    try {
      const response = await fetch(`${INNIOS_BASE}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();

    } catch (error) {
      // Retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = 1000 * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callAPI(endpoint, payload, retryCount + 1);
      }
      throw error;
    }
  }
};
