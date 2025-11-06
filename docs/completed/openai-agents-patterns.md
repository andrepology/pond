# OpenAI Agents SDK TypeScript: Complete Core Patterns Guide

## Overview & Philosophy

The OpenAI Agents SDK for TypeScript is a production-ready framework for building agentic AI applications with minimal abstractions. It provides a small but powerful set of primitives that can express complex agent relationships and workflows.

### Core Principles
- **Lightweight**: Few abstractions, quick to learn
- **TypeScript-first**: Use native language features for orchestration
- **Production-ready**: Built-in tracing, evaluation, and debugging tools
- **Customizable**: Works great out of the box, extensible for complex needs

### Core Primitives
1. **Agents**: LLMs equipped with instructions, tools, and behavioral configuration
2. **Handoffs**: Delegation mechanism for multi-agent workflows
3. **Guardrails**: Input/output validation running parallel to agents
4. **Tools**: TypeScript functions with automatic schema generation
5. **Context**: Dependency injection for shared state and services

## Installation & Setup

```bash
npm install @openai/agents zod
# Optional: for realtime voice agents
npm install @openai/agents/realtime
```

```typescript
// Environment setup
export OPENAI_API_KEY=sk-your-api-key-here
```

## Core Pattern 1: Basic Agent Creation & Execution

### Simple Agent Pattern
```typescript
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant specialized in [domain].',
  model: 'gpt-4o', // Optional: defaults to gpt-4o-mini
});

const result = await run(agent, 'User query here');
console.log(result.finalOutput);
```

### Agent Configuration Options
```typescript
interface AgentConfiguration {
  name: string;
  instructions: string;
  model?: string; // 'gpt-4o', 'gpt-4o-mini', 'o4-mini', etc.
  tools?: Tool[];
  handoffs?: Agent[] | Handoff[];
  inputGuardrails?: InputGuardrail[];
  outputGuardrails?: OutputGuardrail[];
  outputType?: ZodSchema; // Structured output with Zod validation
  maxTurns?: number; // Default: 25
  temperature?: number;
  topP?: number;
}

const configuredAgent = new Agent({
  name: 'Data Analyst',
  instructions: `You are a data analyst. Always provide:
    1. Clear insights from data
    2. Actionable recommendations
    3. Confidence levels for your analysis`,
  model: 'gpt-4o',
  maxTurns: 10,
  temperature: 0.1, // Low temperature for analytical tasks
  outputType: z.object({
    insights: z.array(z.string()),
    recommendations: z.array(z.string()),
    confidence: z.number().min(0).max(1)
  })
});
```

## Core Pattern 2: Tools & Function Calling

### Basic Tool Definition
```typescript
import { tool } from '@openai/agents';
import { z } from 'zod';

const searchTool = tool({
  name: 'search',
  description: 'Search for information about a topic',
  parameters: z.object({
    query: z.string().describe('The search query'),
    category: z.enum(['general', 'technical', 'business']).optional()
  }),
  execute: async ({ query, category }) => {
    // Tool implementation
    const results = await performSearch(query, category);
    return {
      results: results.slice(0, 5),
      total: results.length
    };
  }
});

const agentWithTools = new Agent({
  name: 'Research Assistant',
  instructions: 'Help users find information using available tools.',
  tools: [searchTool]
});
```

### Advanced Tool Patterns

#### Tool with Context Access
```typescript
interface AppContext {
  userId: string;
  database: Database;
  apiKeys: { [service: string]: string };
}

const userDataTool = tool({
  name: 'getUserData',
  description: 'Retrieve user-specific data',
  parameters: z.object({
    dataType: z.enum(['profile', 'preferences', 'history'])
  }),
  execute: async ({ dataType }, context: AppContext) => {
    const userData = await context.database.query(
      'SELECT * FROM users WHERE id = ?', 
      [context.userId]
    );
    return userData[dataType];
  }
});
```

#### Tool with Approval (Human-in-the-Loop)
```typescript
const criticalActionTool = tool({
  name: 'deleteUserData',
  description: 'Delete user data (requires approval)',
  parameters: z.object({
    userId: z.string(),
    dataType: z.string()
  }),
  needsApproval: true, // Always requires approval
  execute: async ({ userId, dataType }) => {
    await deleteData(userId, dataType);
    return `Deleted ${dataType} for user ${userId}`;
  }
});

// Conditional approval
const sendEmailTool = tool({
  name: 'sendEmail',
  description: 'Send email to user',
  parameters: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string()
  }),
  needsApproval: async (context, { subject, body }) => {
    // Only require approval for sensitive emails
    return subject.toLowerCase().includes('urgent') || 
           body.toLowerCase().includes('payment');
  },
  execute: async ({ to, subject, body }) => {
    await emailService.send({ to, subject, body });
    return `Email sent to ${to}`;
  }
});
```

### Built-in OpenAI Tools
```typescript
import { 
  codeInterpreterTool,
  fileSearchTool,
  imageGenerationTool,
  webSearchTool
} from '@openai/agents';

const multiToolAgent = new Agent({
  name: 'Multi-tool Assistant',
  instructions: 'Use available tools to help users with various tasks.',
  tools: [
    codeInterpreterTool(), // Code execution
    fileSearchTool(),      // File search capabilities
    imageGenerationTool(), // DALL-E integration
    webSearchTool()        // Web search
  ]
});
```

## Core Pattern 3: Context Management & Dependency Injection

### Context Pattern
```typescript
interface PondContext {
  userId: string;
  sessionId: string;
  jazzAccount: JazzAccount;
  memories: AgentMemoryStore;
  sharedDocuments: DocumentRegistry;
  userPreferences: UserPreferences;
}

const contextualAgent = new Agent<PondContext>({
  name: 'Contextual Assistant',
  instructions: 'Access user context and shared data to provide personalized assistance.',
  tools: [memoryTool, documentTool, preferencesTool]
});

const result = await run(contextualAgent, 'What are my recent projects?', {
  context: {
    userId: 'user_123',
    sessionId: 'session_456',
    jazzAccount: userJazzAccount,
    memories: agentMemoryStore,
    sharedDocuments: documentRegistry,
    userPreferences: userPrefs
  }
});
```

### Context Access in Tools
```typescript
const memoryTool = tool({
  name: 'accessMemory',
  description: 'Access agent memory for user patterns and insights',
  parameters: z.object({
    memoryType: z.enum(['patterns', 'insights', 'preferences']),
    timeframe: z.string().optional()
  }),
  execute: async ({ memoryType, timeframe }, context: PondContext) => {
    const memories = await context.memories.getMemories(
      context.userId, 
      memoryType, 
      timeframe
    );
    return memories;
  }
});
```

## Core Pattern 4: Multi-Agent Orchestration & Handoffs

### Basic Handoff Pattern
```typescript
import { Agent, handoff } from '@openai/agents';

// Specialized agents
const codeReviewAgent = new Agent({
  name: 'Code Reviewer',
  instructions: 'Review code for best practices, bugs, and improvements.',
  model: 'gpt-4o'
});

const documentationAgent = new Agent({
  name: 'Documentation Writer',
  instructions: 'Write clear, comprehensive documentation.',
  model: 'gpt-4o-mini'
});

const testingAgent = new Agent({
  name: 'Test Writer',
  instructions: 'Write comprehensive test cases.',
  model: 'gpt-4o'
});

// Orchestrator agent
const developmentAgent = new Agent({
  name: 'Development Orchestrator',
  instructions: `Coordinate development tasks by delegating to specialized agents:
    - Code review: Use code reviewer for quality checks
    - Documentation: Use documentation writer for docs
    - Testing: Use test writer for test cases`,
  handoffs: [codeReviewAgent, documentationAgent, testingAgent]
});
```

### Advanced Handoff with Custom Logic
```typescript
const triageAgent = new Agent({
  name: 'Support Triage',
  instructions: `Analyze user requests and delegate appropriately:
    - Technical issues → Technical Support Agent
    - Billing questions → Billing Agent  
    - Refund requests → Refund Agent
    - General questions → General Support Agent`,
  handoffs: [
    handoff(technicalSupportAgent, {
      condition: (message: string) => 
        /error|bug|technical|api/i.test(message)
    }),
    handoff(billingAgent, {
      condition: (message: string) => 
        /billing|payment|invoice|subscription/i.test(message)
    }),
    handoff(refundAgent, {
      condition: (message: string) => 
        /refund|cancel|return/i.test(message)
    }),
    generalSupportAgent // Default fallback
  ]
});
```

### Sequential Agent Workflows
```typescript
const contentWorkflow = async (topic: string) => {
  // Step 1: Research
  const researchResult = await run(researchAgent, 
    `Research comprehensive information about: ${topic}`
  );
  
  // Step 2: Outline
  const outlineResult = await run(outlineAgent,
    `Create an outline based on this research: ${researchResult.finalOutput}`
  );
  
  // Step 3: Write
  const contentResult = await run(writerAgent,
    `Write content based on this outline: ${outlineResult.finalOutput}`
  );
  
  // Step 4: Review
  const reviewResult = await run(reviewAgent,
    `Review and improve this content: ${contentResult.finalOutput}`
  );
  
  return reviewResult.finalOutput;
};
```

## Core Pattern 5: Guardrails & Validation

### Input Guardrails
```typescript
import { defineOutputGuardrail } from '@openai/agents';

const contentFilter = defineOutputGuardrail({
  name: 'ContentFilter',
  description: 'Filter inappropriate content',
  parameters: z.object({
    text: z.string()
  }),
  execute: async ({ text }) => {
    const isAppropriate = await contentModerationService.check(text);
    if (!isAppropriate) {
      throw new Error('Content violates community guidelines');
    }
    return { approved: true };
  }
});

const safeAgent = new Agent({
  name: 'Safe Assistant',
  instructions: 'Help users while maintaining safety standards.',
  inputGuardrails: [contentFilter],
  outputGuardrails: [contentFilter]
});
```

### Custom Guardrail Patterns
```typescript
const rateLimitGuardrail = defineOutputGuardrail({
  name: 'RateLimiter',
  description: 'Enforce rate limits per user',
  parameters: z.object({
    userId: z.string(),
    action: z.string()
  }),
  execute: async ({ userId, action }, context) => {
    const requests = await context.redis.get(`rate_limit:${userId}:${action}`);
    if (requests && parseInt(requests) > 10) {
      throw new Error('Rate limit exceeded');
    }
    await context.redis.incr(`rate_limit:${userId}:${action}`);
    await context.redis.expire(`rate_limit:${userId}:${action}`, 3600);
    return { approved: true };
  }
});

const businessRulesGuardrail = defineOutputGuardrail({
  name: 'BusinessRules',
  description: 'Enforce business logic rules',
  parameters: z.object({
    operation: z.string(),
    data: z.any()
  }),
  execute: async ({ operation, data }, context) => {
    switch (operation) {
      case 'user_modification':
        if (!context.user.isAdmin && data.userId !== context.user.id) {
          throw new Error('Unauthorized: Can only modify own data');
        }
        break;
      case 'data_access':
        if (data.sensitive && !context.user.hasPermission('sensitive_data')) {
          throw new Error('Insufficient permissions for sensitive data');
        }
        break;
    }
    return { approved: true };
  }
});
```

## Core Pattern 6: Structured Output & Type Safety

### Zod Schema Integration
```typescript
import { z } from 'zod';

const analysisSchema = z.object({
  summary: z.string().describe('Brief summary of findings'),
  insights: z.array(z.object({
    type: z.enum(['opportunity', 'risk', 'trend']),
    description: z.string(),
    confidence: z.number().min(0).max(1),
    impact: z.enum(['low', 'medium', 'high'])
  })),
  recommendations: z.array(z.object({
    action: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    timeline: z.string(),
    resources: z.array(z.string())
  })),
  metadata: z.object({
    analysisDate: z.date(),
    dataQuality: z.number().min(0).max(1),
    limitationsNoted: z.array(z.string())
  })
});

const analyticsAgent = new Agent({
  name: 'Data Analytics Agent',
  instructions: 'Provide structured data analysis with insights and recommendations.',
  outputType: analysisSchema,
  model: 'gpt-4o'
});

// TypeScript inference from Zod schema
const result = await run(analyticsAgent, 'Analyze Q4 sales data');
// result.finalOutput is fully typed according to analysisSchema
```

### Complex Nested Schemas
```typescript
const projectPlanSchema = z.object({
  project: z.object({
    name: z.string(),
    description: z.string(),
    objectives: z.array(z.string()),
    scope: z.string(),
    constraints: z.array(z.string())
  }),
  phases: z.array(z.object({
    name: z.string(),
    duration: z.string(),
    milestones: z.array(z.object({
      name: z.string(),
      deliverable: z.string(),
      dueDate: z.string(),
      dependencies: z.array(z.string())
    })),
    resources: z.array(z.object({
      type: z.enum(['human', 'technology', 'financial']),
      name: z.string(),
      allocation: z.string(),
      cost: z.number().optional()
    }))
  })),
  risks: z.array(z.object({
    description: z.string(),
    probability: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high']),
    mitigation: z.string()
  }))
});
```

## Core Pattern 7: Streaming & Real-time Responses

### Streaming Text Responses
```typescript
import { run } from '@openai/agents';

const streamingAgent = new Agent({
  name: 'Streaming Assistant',
  instructions: 'Provide helpful responses with streaming output.'
});

const streamResult = await run(streamingAgent, 'Explain quantum computing', {
  stream: true
});

// Handle streaming events
for await (const event of streamResult.stream) {
  switch (event.type) {
    case 'text':
      process.stdout.write(event.text);
      break;
    case 'tool_call':
      console.log(`Calling tool: ${event.tool.name}`);
      break;
    case 'agent_updated':
      console.log(`Agent updated: ${event.agent.name}`);
      break;
  }
}
```

### Real-time Voice Agents
```typescript
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

const voiceAgent = new RealtimeAgent({
  name: 'Voice Assistant',
  instructions: 'You are a helpful voice assistant. Keep responses concise and natural.',
  voice: 'alloy', // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
  model: 'gpt-4o-realtime-preview',
  tools: [searchTool, calendarTool]
});

// Browser/WebRTC session
const session = new RealtimeSession(voiceAgent, {
  transport: 'webrtc' // or 'websocket'
});

await session.connect({
  apiKey: process.env.OPENAI_API_KEY
});

// Event handling
session.on('speech_started', () => {
  console.log('User started speaking...');
});

session.on('speech_stopped', () => {
  console.log('User stopped speaking...');
});

session.on('response_completed', (response) => {
  console.log('Agent response:', response.text);
});
```

## Core Pattern 8: Memory & Persistence Integration

### Custom Memory Tools for Agents
```typescript
interface AgentMemory {
  id: string;
  agentName: string;
  content: string;
  timestamp: Date;
  context: string;
  importance: number;
  tags: string[];
}

const memoryManagementTool = tool({
  name: 'manageMemory',
  description: 'Store and retrieve agent memories',
  parameters: z.object({
    action: z.enum(['store', 'retrieve', 'update', 'search']),
    content: z.string().optional(),
    query: z.string().optional(),
    tags: z.array(z.string()).optional(),
    importance: z.number().min(0).max(1).optional()
  }),
  execute: async ({ action, content, query, tags, importance }, context: PondContext) => {
    const memoryStore = context.memories;
    
    switch (action) {
      case 'store':
        const memory: AgentMemory = {
          id: generateId(),
          agentName: context.currentAgent.name,
          content: content!,
          timestamp: new Date(),
          context: context.sessionId,
          importance: importance || 0.5,
          tags: tags || []
        };
        await memoryStore.store(memory);
        return `Memory stored with ID: ${memory.id}`;
        
      case 'retrieve':
        const memories = await memoryStore.getRecentMemories(
          context.currentAgent.name, 
          10
        );
        return memories;
        
      case 'search':
        const searchResults = await memoryStore.search(
          query!, 
          context.currentAgent.name
        );
        return searchResults;
        
      default:
        throw new Error(`Unsupported memory action: ${action}`);
    }
  }
});

const memoryAwareAgent = new Agent({
  name: 'Memory-Aware Assistant',
  instructions: `You have access to persistent memory. Use it to:
    1. Remember important user information and preferences
    2. Track conversation history and patterns
    3. Build context across sessions
    4. Provide personalized responses based on history`,
  tools: [memoryManagementTool]
});
```

## Core Pattern 9: Error Handling & Resilience

### Comprehensive Error Handling
```typescript
import { 
  AgentsError, 
  ToolCallError, 
  MaxTurnsExceededError,
  ModelBehaviorError 
} from '@openai/agents';

const resilientAgentRun = async (agent: Agent, message: string) => {
  try {
    const result = await run(agent, message, {
      maxTurns: 10,
      timeout: 30000 // 30 second timeout
    });
    return result;
  } catch (error) {
    if (error instanceof MaxTurnsExceededError) {
      console.log('Agent exceeded maximum turns, providing partial response');
      return { finalOutput: 'I need more time to complete this task. Let me break it down into smaller steps.' };
    } else if (error instanceof ToolCallError) {
      console.log('Tool call failed:', error.toolName, error.message);
      // Retry with different approach or fallback
      const fallbackAgent = new Agent({
        name: 'Fallback Assistant',
        instructions: 'Help user without using external tools.',
        tools: [] // No tools to avoid tool errors
      });
      return await run(fallbackAgent, `Help with this request without using tools: ${message}`);
    } else if (error instanceof ModelBehaviorError) {
      console.log('Model behavior error:', error.message);
      // Log for analysis and provide graceful fallback
      await logModelBehaviorError(error);
      return { finalOutput: 'I encountered an issue processing your request. Please try rephrasing or contact support.' };
    } else {
      console.error('Unexpected error:', error);
      throw error;
    }
  }
};
```

### Retry and Circuit Breaker Patterns
```typescript
class AgentCircuitBreaker {
  private failures = 0;
  private lastFailure?: Date;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  async executeWithBreaker<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    return this.failures >= this.threshold && 
           this.lastFailure && 
           (Date.now() - this.lastFailure.getTime()) < this.timeout;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.lastFailure = undefined;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = new Date();
  }
}

const circuitBreaker = new AgentCircuitBreaker();

const safeAgentRun = async (agent: Agent, message: string) => {
  return await circuitBreaker.executeWithBreaker(async () => {
    return await run(agent, message);
  });
};
```

## Core Pattern 10: Testing & Evaluation

### Agent Testing Patterns
```typescript
describe('Agent Behavior Tests', () => {
  const testAgent = new Agent({
    name: 'Test Agent',
    instructions: 'You are a test agent. Respond predictably for testing.',
    model: 'gpt-4o-mini' // Use cheaper model for tests
  });

  test('should handle basic queries', async () => {
    const result = await run(testAgent, 'What is 2+2?');
    expect(result.finalOutput).toContain('4');
  });

  test('should use tools correctly', async () => {
    const mockTool = tool({
      name: 'mockTool',
      description: 'Mock tool for testing',
      parameters: z.object({ input: z.string() }),
      execute: jest.fn().mockResolvedValue('mock result')
    });

    const agentWithTool = new Agent({
      name: 'Tool Test Agent',
      instructions: 'Use the available tool when needed.',
      tools: [mockTool]
    });

    await run(agentWithTool, 'Use the mock tool with input "test"');
    expect(mockTool.execute).toHaveBeenCalledWith({ input: 'test' });
  });

  test('should handle errors gracefully', async () => {
    const failingTool = tool({
      name: 'failingTool',
      description: 'Tool that always fails',
      parameters: z.object({}),
      execute: async () => {
        throw new Error('Tool failure');
      }
    });

    const agentWithFailingTool = new Agent({
      name: 'Error Test Agent',
      instructions: 'Try to use the tool, handle failures gracefully.',
      tools: [failingTool]
    });

    const result = await run(agentWithFailingTool, 'Use the failing tool');
    expect(result.finalOutput).toBeTruthy(); // Should still provide a response
  });
});
```

### Performance Testing
```typescript
const performanceTest = async () => {
  const agent = new Agent({
    name: 'Performance Test Agent',
    instructions: 'Respond quickly and efficiently.',
    model: 'gpt-4o-mini'
  });

  const startTime = Date.now();
  const results = await Promise.all([
    run(agent, 'Query 1'),
    run(agent, 'Query 2'),
    run(agent, 'Query 3'),
    run(agent, 'Query 4'),
    run(agent, 'Query 5')
  ]);
  const endTime = Date.now();

  console.log(`Processed ${results.length} queries in ${endTime - startTime}ms`);
  console.log(`Average response time: ${(endTime - startTime) / results.length}ms`);
};
```

## Core Pattern 11: Tracing & Observability

### Built-in Tracing
```typescript
import { 
  setDefaultOpenAITracingExporter,
  OpenAITracingExporter 
} from '@openai/agents';

// Configure tracing
setDefaultOpenAITracingExporter(new OpenAITracingExporter({
  apiKey: process.env.OPENAI_API_KEY,
  projectName: 'pond-agents',
  environment: 'production'
}));

// Traces are automatically generated for all agent runs
const result = await run(agent, 'User query');
// Trace data is automatically sent to OpenAI for analysis
```

### Custom Tracing
```typescript
import { 
  withTrace, 
  withCustomSpan,
  getCurrentTrace 
} from '@openai/agents';

const customTracedOperation = async () => {
  return await withTrace('custom-operation', async (trace) => {
    return await withCustomSpan('data-processing', async (span) => {
      span.setAttributes({
        'operation.type': 'data_processing',
        'data.size': 1000,
        'user.id': 'user_123'
      });

      // Your operation here
      const result = await processData();
      
      span.setAttributes({
        'result.success': true,
        'result.items': result.length
      });

      return result;
    });
  });
};
```

## Advanced Integration Patterns

### Pattern: Agent Factory
```typescript
class AgentFactory {
  private static baseConfig = {
    model: 'gpt-4o',
    maxTurns: 10,
    temperature: 0.3
  };

  static createSpecialistAgent(
    specialty: string, 
    tools: Tool[] = [],
    customConfig: Partial<AgentConfiguration> = {}
  ): Agent {
    return new Agent({
      ...this.baseConfig,
      ...customConfig,
      name: `${specialty} Specialist`,
      instructions: `You are an expert ${specialty} specialist. 
        Provide accurate, detailed, and actionable advice in your domain.`,
      tools
    });
  }

  static createWorkflowAgent(
    workflowName: string,
    agents: Agent[],
    orchestrationLogic: string
  ): Agent {
    return new Agent({
      ...this.baseConfig,
      name: `${workflowName} Orchestrator`,
      instructions: `Orchestrate the ${workflowName} workflow: ${orchestrationLogic}`,
      handoffs: agents
    });
  }
}

// Usage
const codeReviewAgent = AgentFactory.createSpecialistAgent(
  'Code Review',
  [codeAnalysisTool, securityScanTool],
  { temperature: 0.1 } // Lower temperature for analytical tasks
);
```

### Pattern: Agent Middleware
```typescript
type AgentMiddleware = (
  agent: Agent, 
  message: string, 
  context?: any
) => Promise<{ agent: Agent; message: string; context?: any }>;

const loggingMiddleware: AgentMiddleware = async (agent, message, context) => {
  console.log(`[${new Date().toISOString()}] Agent: ${agent.name}, Message: ${message}`);
  return { agent, message, context };
};

const rateLimitMiddleware: AgentMiddleware = async (agent, message, context) => {
  await checkRateLimit(context?.userId);
  return { agent, message, context };
};

const authMiddleware: AgentMiddleware = async (agent, message, context) => {
  if (!context?.user?.isAuthenticated) {
    throw new Error('Authentication required');
  }
  return { agent, message, context };
};

class MiddlewareAgent {
  constructor(
    private agent: Agent,
    private middlewares: AgentMiddleware[] = []
  ) {}

  async run(message: string, context?: any) {
    let currentAgent = this.agent;
    let currentMessage = message;
    let currentContext = context;

    // Apply middlewares
    for (const middleware of this.middlewares) {
      const result = await middleware(currentAgent, currentMessage, currentContext);
      currentAgent = result.agent;
      currentMessage = result.message;
      currentContext = result.context;
    }

    return await run(currentAgent, currentMessage, { context: currentContext });
  }
}

// Usage
const protectedAgent = new MiddlewareAgent(agent, [
  authMiddleware,
  rateLimitMiddleware,
  loggingMiddleware
]);
```

## Best Practices & Guidelines

### Performance Optimization
1. **Model Selection**: Use `gpt-4o-mini` for simple tasks, `gpt-4o` for complex reasoning
2. **Tool Efficiency**: Implement tool caching and batching for expensive operations
3. **Context Management**: Pass only necessary context to avoid token waste
4. **Streaming**: Use streaming for long responses to improve perceived performance

### Security Considerations
1. **Input Validation**: Always validate user inputs before processing
2. **Output Sanitization**: Sanitize agent outputs before displaying to users
3. **Tool Permissions**: Implement proper authentication and authorization for tools
4. **Context Isolation**: Ensure proper isolation between user contexts

### Error Handling
1. **Graceful Degradation**: Provide fallback responses when tools fail
2. **User Communication**: Clearly communicate when operations fail or are limited
3. **Logging**: Implement comprehensive logging for debugging and monitoring
4. **Retry Logic**: Implement intelligent retry mechanisms for transient failures

### Testing Strategy
1. **Unit Tests**: Test individual tools and agent configurations
2. **Integration Tests**: Test complete workflows and agent interactions
3. **Performance Tests**: Monitor response times and resource usage
4. **User Acceptance Tests**: Validate agent behavior matches user expectations

This comprehensive guide covers all core patterns needed to build production-ready agent systems with the OpenAI Agents SDK for TypeScript. The patterns can be combined and extended based on specific application requirements. 