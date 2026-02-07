import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentRunItem } from "@/components/AgentRunItem";
import { AgentLauncher } from "@/components/AgentLauncher";
import {
  Bot,
  Pause,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  RotateCcw,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Play,
} from "lucide-react";
import { agentsService, type AgentRunFromApi, type MonitorRunFromApi } from "@/services/agents";
import { projectsService } from "@/services/projects";
import { formatDistanceToNow } from "date-fns";
import { useNotification } from "@/hooks/useNotification";

function formatAgentType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Derive a short summary from run input (content type, post type, etc.) instead of "Run completed". */
function getRunSummary(run: AgentRunFromApi): string {
  if (run.status === "failed" && run.error_message) return run.error_message;
  const input = run.input as Record<string, unknown> | null | undefined;
  if (!input || typeof input !== "object") return "—";
  const contentType =
    typeof input.contentType === "string"
      ? input.contentType
      : typeof input.content_type === "string"
        ? input.content_type
        : null;
  if (contentType) {
    const label = String(contentType).trim();
    return label ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase() : "—";
  }
  const postType = input.postType as string | undefined;
  if (postType === "page") return "Page";
  if (postType === "post") return "Post";
  return "—";
}

export default function AgentsMonitor() {
  const { projectId } = useParams<{ projectId: string }>();
  const [loading, setLoading] = useState(true);
  const { showError, notifySuccess } = useNotification();

  const [queueStatus, setQueueStatus] = useState<Awaited<ReturnType<typeof agentsService.queueStatus>> | null>(null);
  const [agentRuns, setAgentRuns] = useState<AgentRunFromApi[]>([]);
  const [monitorRuns, setMonitorRuns] = useState<MonitorRunFromApi[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof agentsService.stats>> | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [publishingReady, setPublishingReady] = useState(false);
  const [openAgentCards, setOpenAgentCards] = useState<Record<string, boolean>>({});
  const [openMonitorRunId, setOpenMonitorRunId] = useState<string | null>(null);
  const [showLauncher, setShowLauncher] = useState(false);

  const fetchData = () => {
    if (!projectId) return;
    Promise.all([
      agentsService.queueStatus(projectId).catch(() => null),
      agentsService.listRuns(projectId, { limit: 50 }).catch(() => null),
      agentsService.stats(projectId).catch(() => null),
    ])
      .then(([q, runs, s]) => {
        setQueueStatus(q ?? null);
        setAgentRuns(runs?.agentRuns ?? []);
        setStats(s ?? null);
      })
      .catch((err) => showError(err instanceof Error ? err.message : "Failed to load agents"));
  };

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    fetchData();
    const pollMs = 3000;
    const interval = setInterval(() => {
      if (cancelled) return;
      fetchData();
    }, pollMs);
    const done = () => {
      if (!cancelled) setLoading(false);
    };
    const t = setTimeout(done, 500);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(t);
    };
  }, [projectId, showError]);

  const currentJobs = queueStatus?.currentJobs ?? [];
  const jobs = queueStatus?.jobs;
  const agentHealthFromStats = stats?.stats ?? [];
  const hasActiveJobs = (jobs?.active ?? 0) > 0 || currentJobs.length > 0;

  const getHealthStatusIcon = (successRate: number) => {
    if (successRate >= 95) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (successRate >= 80) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getHealthStatusColor = (successRate: number) => {
    if (successRate >= 95) return "text-green-600";
    if (successRate >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const handleRetryFailed = async () => {
    if (!projectId || retrying) return;
    setRetrying(true);
    try {
      await agentsService.retryFailed(projectId);
      notifySuccess("Failed jobs scheduled for retry");
      fetchData();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to retry jobs");
    } finally {
      setRetrying(false);
    }
  };

  const handlePublishReady = async () => {
    if (!projectId || publishingReady) return;
    setPublishingReady(true);
    try {
      const res = await projectsService.publishReady(projectId);
      notifySuccess(res.scheduled ? `Scheduled publish for ${res.scheduled} page(s)` : res.message);
      fetchData();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to schedule publish");
    } finally {
      setPublishingReady(false);
    }
  };

  if (loading && !queueStatus && agentRuns.length === 0) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading agents…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agents Monitor</h1>
          <p className="text-sm text-muted-foreground">Monitor agent performance and job queue status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Pause className="h-4 w-4" />
            Pause All
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleRetryFailed}
            disabled={retrying || !projectId}
          >
            <RotateCcw className="h-4 w-4" />
            {retrying ? "Retrying…" : "Retry Failed"}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handlePublishReady}
            disabled={publishingReady || !projectId}
          >
            <Zap className="h-4 w-4" />
            {publishingReady ? "Scheduling…" : "Publish ready pages"}
          </Button>
          <Button
            className="gap-2"
            onClick={() => setShowLauncher(true)}
          >
            <Play className="h-4 w-4" />
            Run Agent
          </Button>
        </div>
      </div>

      {currentJobs.length > 0 && (
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Currently Running Jobs
              <Badge variant="default" className="animate-pulse">Live</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Refreshes every 3 seconds</p>
          </CardHeader>
          <CardContent>
            {currentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bot className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="font-medium">{formatAgentType(job.agentType)}</h3>
                    <p className="text-sm text-muted-foreground">Run ID: {job.runId?.slice(0, 8)}…</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{typeof job.progress === "number" ? `${job.progress}%` : "—"}</div>
                    <div className="text-xs text-muted-foreground">Progress</div>
                  </div>
                  <Button variant="outline" size="sm">Cancel</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className={hasActiveJobs ? "border-2 border-amber-200 dark:border-amber-800" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Queue Status
            {hasActiveJobs && (
              <Badge variant="default" className="animate-pulse">Live</Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {hasActiveJobs
              ? `${jobs?.active ?? 0} job(s) running · refreshing every 3s`
              : "Waiting, active, and completed counts for this project's queue."}
          </p>
        </CardHeader>
        <CardContent>
          {queueStatus ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4" />
                  <h3 className="font-medium">{queueStatus.queueName || "agent-tasks"}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Waiting</span>
                    <Badge variant="outline">{jobs?.waiting ?? 0}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active (running)</span>
                    <Badge variant="default">{jobs?.active ?? 0}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <Badge variant="secondary">{jobs?.completed ?? 0}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Failed</span>
                    <Badge variant="destructive">{jobs?.failed ?? 0}</Badge>
                  </div>
                  {(jobs?.delayed ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delayed</span>
                      <Badge variant="outline">{jobs?.delayed ?? 0}</Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Queue status unavailable. Ensure Redis and workers are running.</p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Jobs</TabsTrigger>
          <TabsTrigger value="monitor">Monitor Runs</TabsTrigger>
          <TabsTrigger value="health">Agent Health</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {agentRuns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent jobs</p>
                </div>
              ) : (() => {
                const byAgent = agentRuns.reduce<Record<string, AgentRunFromApi[]>>((acc, run) => {
                  const key = run.agent_type ?? "unknown";
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(run);
                  return acc;
                }, {});
                const agentKeys = Object.keys(byAgent).sort((a, b) => {
                  const latestA = Math.max(...byAgent[a].map((r) => new Date(r.created_at ?? 0).getTime()));
                  const latestB = Math.max(...byAgent[b].map((r) => new Date(r.created_at ?? 0).getTime()));
                  return latestB - latestA;
                });
                const groupByAgent = agentKeys.length > 1;

                return groupByAgent ? (
                  <div className="space-y-4">
                    {agentKeys.map((agentType) => {
                      const runs = byAgent[agentType];
                      if (runs.length === 1) {
                        const run = runs[0];
                        return (
                          <AgentRunItem
                            key={run.id}
                            id={run.id}
                            agent={formatAgentType(run.agent_type)}
                            status={run.status === "running" ? "running" : run.status === "failed" ? "failed" : "completed"}
                            duration={
                              run.duration_ms != null
                                ? `${Math.floor(run.duration_ms / 60000)}m ${Math.floor((run.duration_ms % 60000) / 1000)}s`
                                : "—"
                            }
                            summary={getRunSummary(run)}
                            timestamp={run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true }) : "—"}
                            inputData={run.input}
                            outputData={run.output}
                            errorMessage={run.error_message}
                          />
                        );
                      }
                      const isOpen = openAgentCards[agentType] !== false;
                      const toggle = () =>
                        setOpenAgentCards((prev) => ({ ...prev, [agentType]: !isOpen }));
                      return (
                        <Card key={agentType}>
                          <CardHeader
                            className="cursor-pointer select-none"
                            onClick={toggle}
                          >
                            <CardTitle className="flex items-center gap-2">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {formatAgentType(agentType)}
                            </CardTitle>
                          </CardHeader>
                          {isOpen && (
                            <CardContent>
                              <span className="block space-y-4">
                                {runs.map((run) => (
                                  <AgentRunItem
                                    key={run.id}
                                    id={run.id}
                                    agent={formatAgentType(run.agent_type)}
                                    status={run.status === "running" ? "running" : run.status === "failed" ? "failed" : "completed"}
                                    duration={
                                      run.duration_ms != null
                                        ? `${Math.floor(run.duration_ms / 60000)}m ${Math.floor((run.duration_ms % 60000) / 1000)}s`
                                        : "—"
                                    }
                                    summary={getRunSummary(run)}
                                    timestamp={run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true }) : "—"}
                                    inputData={run.input}
                                    outputData={run.output}
                                    errorMessage={run.error_message}
                                  />
                                ))}
                              </span>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  agentRuns.map((run) => (
                    <AgentRunItem
                      key={run.id}
                      id={run.id}
                      agent={formatAgentType(run.agent_type)}
                      status={run.status === "running" ? "running" : run.status === "failed" ? "failed" : "completed"}
                      duration={
                        run.duration_ms != null
                          ? `${Math.floor(run.duration_ms / 60000)}m ${Math.floor((run.duration_ms % 60000) / 1000)}s`
                          : "—"
                      }
                      summary={getRunSummary(run)}
                      timestamp={run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true }) : "—"}
                      inputData={run.input}
                      outputData={run.output}
                      errorMessage={run.error_message}
                    />
                  ))
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                SEO Monitor Runs
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Health score, alerts, trends, and recommendations from the monitor agent (stored after each run).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {monitorRuns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No monitor runs yet</p>
                  <p className="text-xs mt-2">Runs appear here after the monitor job completes (e.g. post-publish or scheduled).</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {monitorRuns.map((run) => {
                    const res = run.result ?? {};
                    const alerts = Array.isArray(res.alerts) ? res.alerts : [];
                    const trends = Array.isArray(res.trends) ? res.trends : [];
                    const recommendations = Array.isArray(res.recommendations) ? res.recommendations : [];
                    const candidates = Array.isArray(res.optimization_candidates) ? res.optimization_candidates : [];
                    const isOpen = openMonitorRunId === run.id;
                    return (
                      <div key={run.id} className="border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => setOpenMonitorRunId(isOpen ? null : run.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {run.healthScore != null ? (
                              <Badge
                                variant={
                                  run.healthScore >= 70 ? "default" : run.healthScore >= 40 ? "secondary" : "destructive"
                                }
                              >
                                Health {run.healthScore}
                              </Badge>
                            ) : (
                              <Badge variant="outline">—</Badge>
                            )}
                            <span className="text-sm text-muted-foreground truncate">
                              {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {alerts.length} alert(s) · {trends.length} trend(s) · {recommendations.length} rec(s) · {candidates.length} candidate(s)
                            </span>
                          </div>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="border-t bg-muted/30 p-4 space-y-4 text-sm">
                            {alerts.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Alerts</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {alerts.slice(0, 10).map((a, i) => {
                                    const alert = a as { type?: string; message?: string };
                                    return (
                                      <li key={i}>
                                        <Badge variant={alert.type === "critical" ? "destructive" : alert.type === "warning" ? "secondary" : "outline"} className="mr-2">
                                          {alert.type ?? "info"}
                                        </Badge>
                                        {String(alert.message ?? "—")}
                                      </li>
                                    );
                                  })}
                                  {alerts.length > 10 && <li className="text-muted-foreground">+{alerts.length - 10} more</li>}
                                </ul>
                              </div>
                            )}
                            {trends.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Trends</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {trends.slice(0, 5).map((t, i) => {
                                    const trend = t as { metric?: string; direction?: string; changePercentage?: number; analysis?: string };
                                    return (
                                      <li key={i}>
                                        {trend.metric ?? "—"} {trend.direction ?? ""} {trend.changePercentage != null ? `${trend.changePercentage}%` : ""} — {String(trend.analysis ?? "").slice(0, 80)}
                                      </li>
                                    );
                                  })}
                                  {trends.length > 5 && <li className="text-muted-foreground">+{trends.length - 5} more</li>}
                                </ul>
                              </div>
                            )}
                            {recommendations.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Recommendations</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {recommendations.slice(0, 5).map((r, i) => {
                                    const rec = r as { suggestion?: string; priority?: string };
                                    return (
                                      <li key={i}>
                                        <Badge variant="outline" className="mr-2">{rec.priority ?? "—"}</Badge>
                                        {String(rec.suggestion ?? "—").slice(0, 120)}
                                      </li>
                                    );
                                  })}
                                  {recommendations.length > 5 && <li className="text-muted-foreground">+{recommendations.length - 5} more</li>}
                                </ul>
                              </div>
                            )}
                            {alerts.length === 0 && trends.length === 0 && recommendations.length === 0 && (
                              <p className="text-muted-foreground">No alerts, trends, or recommendations in this run.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Health Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {agentHealthFromStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No agent runs yet. Run agents to see health stats.</p>
              ) : (
                agentHealthFromStats.map((agent) => {
                  const successRate = agent.totalRuns > 0 ? (agent.successCount / agent.totalRuns) * 100 : 0;
                  const avgDurationSec = agent.totalRuns > 0 ? agent.avgDuration / 1000 : 0;
                  const avgDurationStr = avgDurationSec >= 60
                    ? `${Math.floor(avgDurationSec / 60)}m ${Math.floor(avgDurationSec % 60)}s`
                    : `${Math.floor(avgDurationSec)}s`;
                  return (
                    <div key={agent.agentType} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getHealthStatusIcon(successRate)}
                          <h3 className="font-medium">{formatAgentType(agent.agentType)}</h3>
                          <Badge variant={successRate >= 95 ? "default" : "secondary"} className="text-xs">
                            {successRate >= 95 ? "healthy" : successRate >= 80 ? "warning" : "error"}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Success Rate</div>
                          <div className={`font-medium ${getHealthStatusColor(successRate)}`}>
                            {successRate.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg Duration</div>
                          <div className="font-medium">{avgDurationStr}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Total Runs</div>
                          <div className="font-medium">{agent.totalRuns}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Errors</div>
                          <div className={`font-medium ${agent.failureCount > 3 ? "text-red-600" : "text-green-600"}`}>
                            {agent.failureCount}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Progress value={successRate} className="h-2" />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Agent Launcher */}
      <AgentLauncher
        projectId={projectId || ""}
        isOpen={showLauncher}
        onClose={() => setShowLauncher(false)}
      />
    </div>
  );
}
