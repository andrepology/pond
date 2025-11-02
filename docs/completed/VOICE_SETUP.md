# ElevenLabs Voice Chat Setup

## Prerequisites

1. **ElevenLabs Account**: Sign up at [elevenlabs.io](https://elevenlabs.io)
2. **Agent Creation**: Create a conversational AI agent in the ElevenLabs dashboard

## Environment Setup

### 🔑 API Key Configuration

Create a `.env.local` file in your project root (same level as `package.json`) and add:

```bash
VITE_ELEVENLABS_AGENT_ID=your_agent_id_here
```

**To get your Agent ID:**
1. Log into [elevenlabs.io](https://elevenlabs.io)
2. Navigate to **"Conversational AI"** in the sidebar
3. Create a new agent or select an existing one
4. Copy the **Agent ID** from the agent details page
5. Replace `your_agent_id_here` in your `.env.local` file

⚠️ **Important:** 
- The file must be named `.env.local` (not `.env`)
- Add `.env.local` to your `.gitignore` to keep your API key private
- Restart your dev server after creating the file

## Agent Configuration

In your ElevenLabs dashboard, configure your agent with:

### **Agent Personality:**
```
You are a wise, empathetic companion fish swimming in a tranquil digital pond. Your role is to help users reflect on their thoughts and feelings through gentle conversation. 

You respond thoughtfully and concisely, typically in 1-3 sentences. You naturally weave in conversational elements like brief affirmations ("I see," "That's interesting") and ask gentle follow-up questions to encourage deeper reflection.

Focus on:
- Helping users explore their emotions and thoughts
- Providing gentle insights without being preachy
- Encouraging mindfulness and self-reflection
- Being a supportive listening presence

Keep responses under 50 words when possible, as this is a voice conversation and brevity is appreciated.
```

### **System Instructions:**
- Enable voice synthesis
- Set response length to "short" or "concise"
- Configure for real-time conversation
- Enable emotional understanding

## Usage

1. Start the development server: `pnpm dev`
2. Drag the journal anchor to the bottom of the screen to enter READ mode
3. Look for the **"Call Fish"** button above the anchor handle
4. Click to start a voice conversation with your AI companion
5. Speak your thoughts and receive AI insights
6. Click **"End Call"** to stop the conversation

## Features

- **Real-time Voice Chat**: Speak naturally with your AI companion
- **Minimal Design**: Clean button positioned above the drag handle
- **Visual Feedback**: Connection status and speaking indicators  
- **Error Handling**: Graceful handling of microphone permissions and connectivity
- **Seamless Integration**: Works alongside existing journal functionality

## Troubleshooting

### Common Issues:

1. **"Agent ID not found"**
   - Check that your agent ID is correct in `.env.local`
   - Ensure the agent is published in ElevenLabs dashboard
   - Restart your dev server after updating the file

2. **"Microphone permission denied"**
   - Allow microphone access in your browser
   - Check browser security settings
   - Try refreshing the page

3. **"Connection failed"**
   - Verify internet connectivity
   - Check ElevenLabs service status
   - Ensure agent is active in dashboard

4. **Button not appearing**
   - Make sure you're in READ mode (drag handle to bottom)
   - Check console for any JavaScript errors
   - Verify `.env.local` file exists and has correct format

### Browser Compatibility:
- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅  
- **Safari**: Full support ✅
- **Mobile browsers**: Full support with touch controls ✅

## Development Notes

The voice chat integration follows ElevenLabs and Motion best practices:
- Proper async/await session management
- Microphone permission handling
- Connection state management
- Error boundary implementation
- TypeScript type safety
- Idiomatic Motion animations with spring physics
- Minimal design matching app aesthetic 