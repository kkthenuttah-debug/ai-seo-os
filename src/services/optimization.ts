import { api } from "@/services/api";
import { agentsService, type AgentRunFromApi } from "./agents";
import type { PagePerformanceResponse } from "./analytics";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 60;

export interface OptimizerRecommendation {
  type: "title" | "meta" | "content" | "heading" | "internal_link";
  current: string;
  suggested: string;
  reason: string;
  priority: "low" | "medium" | "high";
}

export interface OptimizerResult {
  recommendations: OptimizerRecommendation[];
  updated_content?: string;
  updated_meta_title?: string;
  updated_meta_description?: string;
}

/** Run the optimizer agent for a page; returns runId. Poll getRun until completed. */
export async function runOptimizer(
  projectId: string,
  pageId: string,
  currentContent: string,
  gscData: PagePerformanceResponse["queries"]
): Promise<{ runId: string }> {
  const body = {
    agentType: "optimizer",
    input: {
      project_id: projectId,
      page_id: pageId,
      gsc_data: gscData.map((q) => ({
        query: q.query,
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr,
        position: q.position,
      })),
      current_content: currentContent,
    },
  };
  const res = await api.post<{ success: boolean; runId: string }>(
    `/projects/${projectId}/agents/run`,
    body
  );
  return { runId: res.runId };
}

/** Get agent run by id (for polling). */
export function getRun(projectId: string, runId: string): Promise<AgentRunFromApi> {
  return agentsService.getRun(projectId, runId);
}

/** Poll run until completed or failed; returns output or throws. */
export function pollRunUntilComplete(
  projectId: string,
  runId: string
): Promise<OptimizerResult> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const poll = () => {
      attempts += 1;
      getRun(projectId, runId)
        .then((run) => {
          if (run.status === "completed" && run.output) {
            const out = run.output as { recommendations?: OptimizerRecommendation[]; updated_content?: string; updated_meta_title?: string; updated_meta_description?: string };
            resolve({
              recommendations: out.recommendations ?? [],
              updated_content: out.updated_content,
              updated_meta_title: out.updated_meta_title,
              updated_meta_description: out.updated_meta_description,
            });
            return;
          }
          if (run.status === "failed") {
            reject(new Error(run.error_message || "Optimizer run failed"));
            return;
          }
          if (attempts >= POLL_MAX_ATTEMPTS) {
            reject(new Error("Optimizer run timed out"));
            return;
          }
          setTimeout(poll, POLL_INTERVAL_MS);
        })
        .catch(reject);
    };
    poll();
  });
}

export const optimizationService = {
  runOptimizer,
  getRun,
  pollRunUntilComplete,
};
