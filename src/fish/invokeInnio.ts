import { useState, useCallback, useRef } from 'react'
import { useWorldModel } from './useWorldModel'
import { useAccount } from 'jazz-react'
import { v4 as uuidv4 } from 'uuid'

// Define types for our API interaction
type OpenAIResponse = {
  content: string
  loading: boolean
  error: string | null
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export function invokeInnio() {
  const { me } = useAccount();
  const [response, setResponse] = useState<OpenAIResponse>({
    content: '',
    loading: false,
    error: null
  })

  // Add conversation history state with proper message format
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])

  // Track last response time and content for cooldown and repetition prevention
  const lastResponseTime = useRef<number>(0)
  const lastEntry = useRef<string>('')
  const lastResponse = useRef<string>('')
  const lastSentContentLength = useRef<number>(0)
  const cooldownPeriod = 5000 // 5 seconds cooldown between API calls

  const isRequestInFlight = useRef(false)

  // Add reset function for new entries
  const resetForNewEntry = useCallback(() => {
    lastResponse.current = '';
    lastSentContentLength.current = 0;
    setConversationHistory([]);
  }, []);

  // Use our worldModel hook
  const { worldModel } = useWorldModel()

  const generateResponse = useCallback(async (currentEntry: string) => {
    if (isRequestInFlight.current) {
      console.log('Request already in flight, aborting');
      return;
    }
    isRequestInFlight.current = true;
    const requestId = uuidv4();
   
    // Define types for rich text format
    interface RichTextChild {
      text: string;
    }

    interface RichTextBlock {
      type: string;
      children: RichTextChild[];
    }

    // Helper function to extract plain text from rich text format
    const extractPlainText = (content: string): string => {
      // First, try to parse if it's a JSON string
      let parsedContent;
      try {
        // First attempt: try parsing as is (in case it's a JSON string)
        parsedContent = JSON.parse(content);
      } catch (e) {
        // Second attempt: try parsing the stringified version (in case it's already a string)
        try {
          parsedContent = JSON.parse(JSON.parse(content));
        } catch (e2) {
          // Third attempt: handle malformed array format
          try {
            // If content looks like an array but isn't proper JSON, try to fix it
            if (content.startsWith('{') && content.includes('},{')) {
              // Split by '},{' and wrap in proper array format
              const fixedContent = '[' + content.replace(/},{/g, '},{') + ']';
              parsedContent = JSON.parse(fixedContent);
            } else {
              throw new Error('Not a malformed array');
            }
          } catch (e3) {
            // If all attempts fail, return the original content
            return content;
          }
        }
      }

      // Now handle the parsed content
      if (Array.isArray(parsedContent)) {
        // Handle array of paragraphs
        return parsedContent
          .map(block => {
            if (block.children) {
              return block.children
                .map((child: RichTextChild) => child.text || '')
                .join(' ');
            }
            return '';
          })
          .filter(text => text.trim()) // Remove empty paragraphs
          .join('\n')
          .trim();
      } else if (parsedContent && typeof parsedContent === 'object') {
        // Handle single block case
        if (parsedContent.children) {
          return parsedContent.children
            .map((child: RichTextChild) => child.text || '')
            .join(' ')
            .trim();
        }
      }
      
      // If we get here, return the original content
      return content;
    };

    // Get the new content by comparing with last sent content
    let newContent;
    try {
      // Parse the full current entry
      const fullContent = JSON.parse(currentEntry);
      // If this is a new entry (lastSentContentLength is 0), use the entire content
      if (lastSentContentLength.current === 0) {
        newContent = currentEntry;
      } else {
        // Get the last paragraph (or paragraphs) that haven't been sent yet
        const lastSentIndex = Math.max(0, lastSentContentLength.current);
        newContent = JSON.stringify(fullContent.slice(lastSentIndex));
      }
    } catch (e) {
      newContent = currentEntry.slice(lastSentContentLength.current);
    }
    
    // Extract plain text from the new content
    const plainTextContent = extractPlainText(newContent);
    
    // If there's no new content, return the last response
    if (!plainTextContent.trim()) {
      return lastResponse.current;
    }

    // --- CHECK 2: Only send if not already loading ---
    if (response.loading) {
      return null;
    }

    // --- CHECK 3: Only send if cooldown has passed ---
    const now = Date.now();
    const timeSinceLastResponse = now - lastResponseTime.current;
    if (timeSinceLastResponse < cooldownPeriod) {
      return null;
    }

    // Add new content to conversation history as user message
    setConversationHistory(prev => [...prev, { role: 'user', content: plainTextContent }]);

    setResponse(prev => ({ ...prev, loading: true, error: null }));
    
    // Get the last three (most recent) entries from me.root.entries, newest first
    const lastThreeEntries = me?.root?.entries
      ?.filter(entry => entry != null)
      .slice(-3)
      .reverse()
      .map(entry => ({
        content: extractPlainText(entry.content),
        timestamp: new Date(entry.createdAt).toISOString()
      })) || [];
    
    // Log the full request body
    const requestBody = {
      new_content: plainTextContent,
      conversation_history: conversationHistory,
      last_three_entries: lastThreeEntries,
      closeby_memories: [], // TODO: Implement later
      world_model: worldModel
    };
    
    // Enhanced logging
    console.log('🐠 Sending request to Innio API:');
    console.log('----------------------------------------');
    console.log('📝 New Content:', plainTextContent);
    console.log('📚 Last Three Entries:', lastThreeEntries);
    console.log('💭 Conversation History:', conversationHistory);
    console.log('🌍 World Model:', worldModel);
    console.log('----------------------------------------');

    try {
      const responseApi = await fetch('https://innios-mind.fly.dev/api/generate-innio-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!responseApi.ok) {
        throw new Error(`HTTP error! status: ${responseApi.status}`);
      }

      const data = await responseApi.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const newResponse = data.message;
      
      if (!newResponse) {
        console.warn(` Warning: Empty response from API (requestId: ${requestId})`);
      }
      
      // Update our tracking variables
      lastResponseTime.current = Date.now();
      lastEntry.current = currentEntry;
      lastResponse.current = newResponse;
      // Update lastSentContentLength to the length of the full content array
      try {
        const fullContent = JSON.parse(currentEntry);
        lastSentContentLength.current = fullContent.length;
      } catch (e) {
        lastSentContentLength.current = currentEntry.length;
      }

      // Add AI response to conversation history as assistant message
      setConversationHistory(prev => [...prev, { role: 'assistant', content: newResponse }]);

      setResponse({
        content: newResponse,
        loading: false,
        error: null
      });

      return newResponse;
    } catch (error) {
      setResponse(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
      return null;
    } finally {
      isRequestInFlight.current = false;
      setResponse(prev => ({ ...prev, loading: false }));
    }
  }, [response.loading, worldModel, conversationHistory, me]);

  return {
    response,
    generateResponse,
    conversationHistory,
    resetForNewEntry
  }
} 