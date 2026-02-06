import type { AgentType } from '../types/index.js';
import type { BaseAgent } from './base.js';
import { logger } from '../lib/logger.js';

export interface AgentMetadata {
  type: AgentType;
  name: string;
  description: string;
  category: 'strategy' | 'execution';
  version: string;
  inputSchema: string;
  outputSchema: string;
  dependencies?: AgentType[];
}

class AgentRegistry {
  private agents: Map<AgentType, BaseAgent<any, any>> = new Map();
  private metadata: Map<AgentType, AgentMetadata> = new Map();
  private initialized = false;

  async initialize(agents: Record<AgentType, BaseAgent<any, any>>): Promise<void> {
    if (this.initialized) {
      logger.warn('Agent registry already initialized');
      return;
    }

    logger.info('Initializing agent registry');

    for (const [type, agent] of Object.entries(agents) as [AgentType, BaseAgent<any, any>][]) {
      this.registerAgent(type, agent);
    }

    this.validateRegistry();
    this.initialized = true;

    logger.info({
      agentCount: this.agents.size,
      types: Array.from(this.agents.keys()),
    }, 'Agent registry initialized');
  }

  private registerAgent(type: AgentType, agent: BaseAgent<any, any>): void {
    const config = agent.getConfig();

    this.agents.set(type, agent);
    
    const category = this.determineCategory(type);
    
    this.metadata.set(type, {
      type,
      name: config.name,
      description: config.description,
      category,
      version: '1.0.0',
      inputSchema: config.inputSchema.toString(),
      outputSchema: config.outputSchema.toString(),
    });

    logger.debug({ type, name: config.name }, 'Agent registered');
  }

  private determineCategory(type: AgentType): 'strategy' | 'execution' {
    const strategyAgents: AgentType[] = [
      'market_research',
      'site_architect',
      'optimizer',
      'technical_seo',
      'content_builder',
    ];

    return strategyAgents.includes(type) ? 'strategy' : 'execution';
  }

  private validateRegistry(): void {
    const requiredAgents: AgentType[] = [
      'market_research',
      'site_architect',
      'content_builder',
      'elementor_builder',
      'internal_linker',
      'page_builder',
      'publisher',
      'optimizer',
      'monitor',
      'fixer',
      'technical_seo',
    ];

    const missing = requiredAgents.filter(type => !this.agents.has(type));

    if (missing.length > 0) {
      logger.error({ missing }, 'Missing required agents');
      throw new Error(`Missing required agents: ${missing.join(', ')}`);
    }

    for (const [type, agent] of this.agents.entries()) {
      const config = agent.getConfig();
      
      if (!config.systemPrompt || config.systemPrompt.length < 50) {
        logger.warn({ type }, 'Agent has suspiciously short system prompt');
      }
    }

    logger.info('Agent registry validation passed');
  }

  getAgent<TInput = any, TOutput = any>(
    type: AgentType,
  ): BaseAgent<TInput, TOutput> | undefined {
    return this.agents.get(type);
  }

  getAgentOrThrow<TInput = any, TOutput = any>(
    type: AgentType,
  ): BaseAgent<TInput, TOutput> {
    const agent = this.agents.get(type);
    if (!agent) {
      throw new Error(`Agent not found: ${type}`);
    }
    return agent;
  }

  getMetadata(type: AgentType): AgentMetadata | undefined {
    return this.metadata.get(type);
  }

  listAgents(): AgentMetadata[] {
    return Array.from(this.metadata.values());
  }

  listAgentsByCategory(category: 'strategy' | 'execution'): AgentMetadata[] {
    return this.listAgents().filter(m => m.category === category);
  }

  hasAgent(type: AgentType): boolean {
    return this.agents.has(type);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getAgentDependencies(type: AgentType): AgentType[] {
    const DEPENDENCIES: Partial<Record<AgentType, AgentType[]>> = {
      site_architect: ['market_research'],
      content_builder: ['market_research', 'site_architect'],
      elementor_builder: ['content_builder'],
      page_builder: ['content_builder', 'elementor_builder'],
      internal_linker: ['site_architect'],
      publisher: ['page_builder'],
      optimizer: ['monitor'],
    };

    return DEPENDENCIES[type] || [];
  }

  async executeAgent<TInput, TOutput>(
    type: AgentType,
    projectId: string,
    input: TInput,
  ): Promise<TOutput> {
    if (!this.initialized) {
      throw new Error('Agent registry not initialized');
    }

    const agent = this.getAgentOrThrow<TInput, TOutput>(type);
    return await agent.run(projectId, input);
  }

  reset(): void {
    this.agents.clear();
    this.metadata.clear();
    this.initialized = false;
    logger.info('Agent registry reset');
  }
}

export const agentRegistry = new AgentRegistry();

export async function initializeAgentRegistry(
  agents: Record<AgentType, BaseAgent<any, any>>,
): Promise<void> {
  await agentRegistry.initialize(agents);
}

export function getRegisteredAgent<TInput = any, TOutput = any>(
  type: AgentType,
): BaseAgent<TInput, TOutput> {
  return agentRegistry.getAgentOrThrow<TInput, TOutput>(type);
}
