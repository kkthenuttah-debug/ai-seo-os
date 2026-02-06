# AI Agent Orchestration System

A comprehensive AI agent system for automated SEO content generation and optimization using Google's Gemini API.

## Architecture

### Core Components

1. **Gemini Router** (`geminiRouter.ts`)
   - Intelligent model selection based on agent category
   - Strategy agents: `gemini-2.0-flash-exp` (complex reasoning)
   - Execution agents: `gemini-2.0-flash-lite` (fast execution)
   - Automatic fallback and retry logic
   - Cost tracking and token management
   - Configurable timeouts (60s strategy, 30s execution)

2. **JSON Enforcer** (`jsonEnforcer.ts`)
   - Ensures agents always return valid JSON
   - Automatic retry with stricter prompts
   - Cleans markdown code blocks
   - Handles malformed responses
   - Stream support for real-time responses

3. **Base Agent** (`base.ts`)
   - Abstract class for all agents
   - Zod-based input/output validation
   - Automatic run tracking and metrics
   - Error handling and logging
   - Retry support with exponential backoff

4. **Agent Registry** (`registry.ts`)
   - Central registry for all agents
   - Runtime agent validation
   - Dependency tracking
   - Metadata management
   - Dynamic agent loading

5. **Agent Context** (`context.ts`)
   - Execution context for agents
   - Correlation ID tracking
   - Metrics collection
   - Retry count management
   - Metadata support

6. **Agent Orchestrator** (`orchestrator.ts`)
   - Coordinates multi-agent workflows
   - Sequential and parallel execution
   - Error handling and recovery
   - Result aggregation
   - Cost and performance tracking

## Agent Types

### Strategy Agents (Advanced Reasoning)

**Market Research Agent** (`market-research.ts`)
- Analyzes target markets and competitors
- Identifies keyword opportunities
- Suggests content gaps and topics
- Output: Market analysis, competitors, keywords

**Site Architect Agent** (`site-architect.ts`)
- Designs site structure and hierarchy
- Plans internal linking strategy
- Defines technical requirements
- Output: Site structure, linking map, tech specs

**Content Builder Agent** (`content-builder.ts`)
- Writes SEO-optimized content
- Creates engaging copy with proper structure
- Suggests internal links
- Output: Title, meta, content, headings

**Technical SEO Agent** (`technical-seo.ts`)
- Audits technical SEO factors
- Identifies critical issues
- Provides prioritized recommendations
- Output: Issues, recommendations, SEO score

**Optimizer Agent** (`optimizer.ts`)
- Analyzes GSC performance data
- Recommends content improvements
- Identifies ranking opportunities
- Output: Optimization recommendations

### Execution Agents (Fast Operations)

**Elementor Builder Agent** (`elementor-builder.ts`)
- Generates Elementor JSON layouts
- Creates responsive page structures
- Applies design best practices
- Output: Elementor data, widget info

**Page Builder Agent** (`page-builder.ts`)
- Assembles complete pages
- Coordinates content + layout
- Validates readiness to publish
- Output: Complete page with metadata

**Internal Linker Agent** (`internal-linker.ts`)
- Identifies linking opportunities
- Suggests natural anchor text
- Calculates relevance scores
- Output: Link suggestions with context

**Monitor Agent** (`monitor.ts`)
- Tracks keyword rankings
- Analyzes GSC trends
- Generates performance alerts
- Output: Rankings, trends, alerts

**Publisher Agent** (`publisher.ts`)
- Publishes content to WordPress
- Handles API interactions
- Manages post metadata
- Output: Publication status and URL

**Fixer Agent** (`fixer.ts`)
- Diagnoses and fixes errors
- Repairs malformed content
- Suggests preventive measures
- Output: Fix status, changes, recommendations

## Usage Examples

### Basic Agent Execution

```typescript
import { getAgent } from './agents';

const agent = getAgent('market_research');

const result = await agent.run(projectId, {
  niche: 'digital marketing',
  target_audience: 'small businesses',
});

console.log(result.keyword_opportunities);
```

### Using the Orchestrator

```typescript
import { createOrchestrator } from './agents';

const orchestrator = createOrchestrator({
  projectId: 'project-123',
  userId: 'user-456',
  retryOnFailure: true,
  maxRetries: 3,
});

orchestrator
  .addStep({
    agentType: 'market_research',
    input: {
      niche: 'fitness',
      target_audience: 'beginners',
    },
  })
  .addStep({
    agentType: 'site_architect',
    input: (ctx) => ({
      niche: 'fitness',
      target_audience: 'beginners',
      market_research: ctx.results.get('market_research'),
      domain: 'example.com',
    }),
  });

const result = await orchestrator.execute();

if (result.success) {
  console.log('Architecture:', result.results.get('site_architect'));
}
```

### Parallel Execution

```typescript
const orchestrator = createOrchestrator({ projectId, userId });

const results = await orchestrator.executeParallel(
  ['content_builder', 'elementor_builder'],
  (agentType) => {
    if (agentType === 'content_builder') {
      return { page_title: 'My Page', target_keyword: 'fitness' };
    } else {
      return { pageTitle: 'My Page', content: '...' };
    }
  }
);
```

### Phase Execution Helpers

```typescript
import { executeMarketResearchPhase } from './agents';

const phase1 = await executeMarketResearchPhase(projectId, userId, {
  niche: 'digital marketing',
  targetAudience: 'startups',
  domain: 'example.com',
});

console.log(phase1.marketResearch);
console.log(phase1.siteArchitecture);
```

## Model Selection

### Strategy Agents
- **Model**: `gemini-2.0-flash-exp`
- **Max Tokens**: 2000
- **Timeout**: 60s
- **Use Case**: Complex reasoning, planning, analysis

### Execution Agents
- **Model**: `gemini-2.0-flash-lite`
- **Max Tokens**: 1000
- **Timeout**: 30s
- **Use Case**: Fast operations, data transformation

### Fallback Strategy
1. Try primary model
2. If fails after 2 attempts, switch to fallback
3. Exponential backoff between retries (1s, 2s, 4s, max 10s)

## Error Handling

### Automatic Retries
- All agents support retry with exponential backoff
- Default: 3 retries
- Configurable per agent or orchestrator

### Error Recovery
- JSON parsing failures → retry with stricter prompts
- API timeouts → fallback to simpler model
- Rate limits → exponential backoff
- Validation errors → logged and thrown

### Fixer Agent Integration
- Automatically invoked for persistent errors
- Analyzes root cause
- Attempts automated fixes
- Provides manual review recommendations

## Cost Tracking

```typescript
import { geminiRouter } from './agents';

const stats = geminiRouter.getCostStats();
console.log({
  totalTokens: stats.totalTokens,
  totalCost: stats.totalCost,
  callCount: stats.callCount,
});

// Reset tracking
geminiRouter.resetCostStats();
```

## Metrics Collection

```typescript
import { metricsCollector } from './agents';

const metrics = metricsCollector.getAllMetrics();

for (const metric of metrics) {
  console.log({
    agent: metric.agentType,
    duration: metric.duration,
    tokens: metric.tokensUsed,
    cost: metric.cost,
    status: metric.status,
  });
}
```

## Best Practices

1. **Always validate inputs** - Use Zod schemas for type safety
2. **Use correlation IDs** - Track related operations across agents
3. **Monitor costs** - Track token usage and costs regularly
4. **Handle errors gracefully** - Always provide error handlers
5. **Use orchestrator for workflows** - Don't chain agents manually
6. **Implement retries** - Use built-in retry logic for transient errors
7. **Log everything** - Use structured logging for debugging
8. **Test with small inputs** - Validate agent behavior before scaling

## Configuration

### Environment Variables
```bash
GEMINI_API_KEY=your-api-key
```

### Model Configuration
Edit `geminiRouter.ts` to customize:
- Model selection per agent
- Token limits
- Timeouts
- Temperature settings

### Agent Customization
Each agent can be customized:
- System prompts (`prompts/system/`)
- Input/output schemas
- Retry behavior
- Timeout values

## Monitoring

### Agent Run Tracking
All agent executions are logged to `agent_runs` table:
- Input/output data
- Duration and token usage
- Error messages
- Model used

### Logging
Structured logs include:
- Agent type
- Correlation ID
- Duration
- Token usage
- Cost
- Error details

## Future Enhancements

1. **Streaming Responses** - Real-time content generation
2. **Agent Versioning** - Multiple versions of agents
3. **A/B Testing** - Compare agent performance
4. **Custom Agents** - User-defined agent types
5. **Agent Marketplace** - Share and discover agents
6. **Fine-tuning** - Custom model training
7. **Caching** - Cache common agent results
8. **Rate Limiting** - Built-in rate limiting per agent

## Contributing

To add a new agent:

1. Create agent file in `agents/` directory
2. Extend `BaseAgent` class
3. Define input/output schemas with Zod
4. Write system prompt
5. Implement `buildUserPrompt` method
6. Add to agent registry in `index.ts`
7. Update types in `types/agents.ts`
8. Add tests
9. Update documentation

## Support

For issues or questions:
- Check logs for error details
- Review agent run records in database
- Verify API keys and configuration
- Check token limits and quotas
- Review system prompts for clarity
