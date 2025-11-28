// src/services/conversationAIProcessing.ts
import { PondAccount, Conversation, FieldNote } from '../schema';
import { innioAPI } from './innioAPI';

export async function processConversationAI(conversationId: string, account: PondAccount) {
  // 1. Check user preference - use $jazz.has() to check if field exists
  if (!account.root || !account.root.$jazz.has("useAiProcessing") || !account.root.useAiProcessing) {
    return;
  }

  // 2. Load conversation and check processing status
  const conversation = await Conversation.load(conversationId);
  if (!conversation) {
    return;
  }

  // Skip if already completed or currently processing
  const currentStatus = conversation.aiProcessingStatus;
  if (currentStatus === "completed" || currentStatus === "processing") {
    return;
  }

  // 3. Mark as processing - use $jazz.set() for CoMap fields
  conversation.$jazz.set("aiProcessingStatus", "processing");
  conversation.$jazz.set("aiProcessingAttemptedAt", Date.now());

  try {
    // 4. Convert messages to API format (no time_in_call_secs)
    const transcript = conversation.messages.map(msg => ({
      role: msg.role === 'agent' ? 'innio' : msg.role,
      message: msg.content
    }));

    const userName = account.profile?.name || "User";
    const userPronouns = account.profile?.pronouns || "they/them";

    // 5. Parallel API calls with error handling
    const [worldModelResult, notesResult, summaryResult] = await Promise.allSettled([
      innioAPI.createWorldModel({
        conversation_transcript: transcript,
        old_world_model: account.root.worldModel?.toString()
      }),
      innioAPI.takeNotes({
        conversation_transcript: transcript,
        first_name: userName,
        pronouns: userPronouns,
        world_model: account.root.worldModel?.toString()
      }),
      innioAPI.summarizeConversation({
        conversation_transcript: transcript,
        first_name: userName,
        pronouns: userPronouns,
        world_model: account.root.worldModel?.toString()
      })
    ]);

    // 6. Reload conversation after async operations (Jazz sync safety)
    const freshConversation = await Conversation.load(conversationId);
    if (!freshConversation) {
      return;
    }

    // Store successful results
    if (worldModelResult.status === "fulfilled" && worldModelResult.value.world_model) {
      account.root.$jazz.set("worldModel", worldModelResult.value.world_model);
    }

    if (notesResult.status === "fulfilled" && notesResult.value.notes) {
      // Create FieldNote with proper owner, then use $jazz.push() for CoList
      const fieldNote = FieldNote.create({
        content: notesResult.value.notes,
        conversationRef: freshConversation,
        createdAt: Date.now(),
      }, account.root.$jazz.owner);
      account.root.fieldNotes.$jazz.push(fieldNote);
    }

    if (summaryResult.status === "fulfilled" && summaryResult.value.summary) {
      freshConversation.$jazz.set("summary", summaryResult.value.summary);
    }

    // Mark as completed
    freshConversation.$jazz.set("aiProcessingStatus", "completed");

  } catch (error) {
    // 8. Mark as failed with error details - reload conversation for safety
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Reload conversation in error case too (sync safety)
    try {
      const freshConversation = await Conversation.load(conversationId);
      if (freshConversation) {
        freshConversation.$jazz.set("aiProcessingStatus", "failed");
        freshConversation.$jazz.set("aiProcessingError", errorMessage);
      }
    } catch (markError) {
      // Silent fail - conversation status update failed
    }
  }
}
