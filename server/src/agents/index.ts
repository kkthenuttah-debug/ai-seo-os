// Agent exports
export { BaseAgent } from './base.js';
export { marketResearchAgent, MarketResearchAgent } from './market-research.js';
export { siteArchitectAgent, SiteArchitectAgent } from './site-architect.js';
export { contentBuilderAgent, ContentBuilderAgent } from './content-builder.js';
export { elementorBuilderAgent, ElementorBuilderAgent } from './elementor-builder.js';
export { internalLinkerAgent, InternalLinkerAgent } from './internal-linker.js';
export { optimizerAgent, OptimizerAgent } from './optimizer.js';
export { monitorAgent, MonitorAgent } from './monitor.js';
export { fixerAgent, FixerAgent } from './fixer.js';
export { technicalSEOAgent, TechnicalSEOAgent } from './technical-seo.js';
export { pageBuilderAgent, PageBuilderAgent } from './page-builder.js';
export { publisherAgent, PublisherAgent } from './publisher.js';

import type { AgentType } from '../types/index.js';
import { marketResearchAgent } from './market-research.js';
import { siteArchitectAgent } from './site-architect.js';
import { contentBuilderAgent } from './content-builder.js';
import { elementorBuilderAgent } from './elementor-builder.js';
import { internalLinkerAgent } from './internal-linker.js';
import { optimizerAgent } from './optimizer.js';
import { monitorAgent } from './monitor.js';
import { fixerAgent } from './fixer.js';
import { technicalSEOAgent } from './technical-seo.js';
import { pageBuilderAgent } from './page-builder.js';
import { publisherAgent } from './publisher.js';

// Agent registry for dynamic access
export const agents = {
  market_research: marketResearchAgent,
  site_architect: siteArchitectAgent,
  content_builder: contentBuilderAgent,
  elementor_builder: elementorBuilderAgent,
  internal_linker: internalLinkerAgent,
  optimizer: optimizerAgent,
  monitor: monitorAgent,
  fixer: fixerAgent,
  technical_seo: technicalSEOAgent,
  page_builder: pageBuilderAgent,
  publisher: publisherAgent,
} as const;

export function getAgent(type: AgentType) {
  return agents[type];
}

export function listAgents() {
  return Object.entries(agents).map(([type, agent]) => ({
    type,
    name: agent.getConfig().name,
    description: agent.getConfig().description,
  }));
}
