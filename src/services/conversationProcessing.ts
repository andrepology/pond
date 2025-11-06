// src/services/conversationProcessing.ts
// Shared utilities for conversation processing (startup, backfill, manual retry)

import { Conversation, PondAccount } from '../schema';
import { processConversationAI } from './conversationAIProcessing';

/**
 * Determines if a conversation needs AI processing
 */
export function needsProcessing(conversation: Conversation): boolean {
  if (!conversation) return false;

  // Legacy conversations (no aiProcessingStatus field)
  if (!conversation.$jazz.has("aiProcessingStatus")) {
    return true;
  }

  // New conversations with pending/failed status
  const status = conversation.aiProcessingStatus;
  return status === "pending" || status === "failed";
}

/**
 * Gets conversations that need processing, sorted by newest first
 */
export function getConversationsNeedingProcessing(conversations: Conversation[]): Conversation[] {
  return conversations
    .filter(conv => conv && needsProcessing(conv))
    .sort((a, b) => (b.startTime || 0) - (a.startTime || 0)); // Newest first
}

/**
 * Configuration options for batch processing
 */
export interface BatchProcessingOptions {
  conversations: Conversation[];
  batchSize?: number;
  delayBetweenBatches?: number;
  maxBatches?: number;
  onProgress?: (processed: number, total: number) => void;
  onError?: (conversationId: string, error: Error) => void;
}

/**
 * Processes conversations in configurable batches with rate limiting
 */
export async function processConversationBatch(
  options: BatchProcessingOptions,
  account: PondAccount
): Promise<void> {
  const {
    conversations,
    batchSize = 2,
    delayBetweenBatches = 2000,
    maxBatches = Infinity,
    onProgress,
    onError
  } = options;

  let processed = 0;
  let batchIndex = 0;

  while (batchIndex < maxBatches && processed < conversations.length) {
    const batch = conversations.slice(processed, processed + batchSize);
    if (batch.length === 0) break;

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (conv) => {
        try {
          await processConversationAI(conv.$jazz.id, account);
          return { success: true, id: conv.$jazz.id };
        } catch (error) {
          onError?.(conv.$jazz.id, error as Error);
          return { success: false, id: conv.$jazz.id, error };
        }
      })
    );

    // Count successful processing
    const successful = results.filter(r =>
      r.status === "fulfilled" && r.value.success
    ).length;

    processed += batch.length;
    onProgress?.(processed, conversations.length);

    // Stop if we're done or this was the last batch
    if (processed >= conversations.length) break;

    // Delay before next batch (unless this is the last batch)
    if (processed < conversations.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }

    batchIndex++;
  }
}

/**
 * STUB: Backfill processing when user enables AI processing
 * TODO: Integrate this when user preference toggle is implemented
 */
export function handleAiProcessingEnabled(account: PondAccount) {
  // STUB: This function should be called when useAiProcessing changes from false to true

  const conversationsToProcess = getConversationsNeedingProcessing(Array.from(account.root.conversations));

  if (conversationsToProcess.length === 0) {
    console.log('No conversations need AI processing');
    return;
  }

  console.log(`Starting backfill processing for ${conversationsToProcess.length} conversations`);

  processConversationBatch({
    conversations: conversationsToProcess,
    batchSize: 2, // Process 2 at a time
    delayBetweenBatches: 2000, // 2 second delay between batches
    maxBatches: 10, // Limit to prevent overwhelming (20 conversations max)
    onProgress: (processed, total) => {
      console.log(`Backfill processing: ${processed}/${total} conversations`);
      // TODO: Could show progress indicator to user
    },
    onError: (conversationId, error) => {
      console.warn(`Backfill processing failed for ${conversationId}:`, error);
      // TODO: Could show user notification for failures
    }
  }, account);
}

/**
 * STUB: Manual retry processing for failed conversations
 * TODO: Integrate this with UI retry button
 */
export function retryFailedConversations(account: PondAccount) {
  // STUB: This function should be called when user clicks retry button

  const failedConversations = Array.from(account.root.conversations)
    .filter(conv => conv?.aiProcessingStatus === "failed");

  if (failedConversations.length === 0) {
    console.log('No failed conversations to retry');
    return;
  }

  console.log(`Retrying ${failedConversations.length} failed conversations`);

  processConversationBatch({
    conversations: failedConversations,
    batchSize: 1, // One at a time for manual retry
    delayBetweenBatches: 1000,
    onProgress: (processed, total) => {
      // TODO: Update UI progress
      console.log(`Retry processing: ${processed}/${total} conversations`);
    },
    onError: (conversationId, error) => {
      // TODO: Show specific error to user
      console.error(`Retry failed for ${conversationId}:`, error);
    }
  }, account);
}

