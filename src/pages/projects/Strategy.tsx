import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Settings2,
  History,
  Loader2,
  Bot,
  Activity,
} from "lucide-react";
import { projectsService, type ProjectFull } from "@/services/projects";
import { agentsService, type AgentRunFromApi } from "@/services/agents";
import { type MonitorRunFromApi } from "@/services/agents";
import { useNotification } from "@/hooks/useNotification";
import { formatDistanceToNow } from "date-fns";

type RunFrequency = "daily" | "weekly";

export default function Strategy() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targetKeywords, setTargetKeywords] = useState("");
  const [runFrequency, setRunFrequency] = useState<RunFrequency>("weekly");
  const [autopilot, setAutopilot] = useState(false);
  const [agentRuns, setAgentRuns] = useState<AgentRunFromApi[]>([]);
  const [monitorRuns, setMonitorRuns] = useState<MonitorRunFromApi[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { showError, notifySuccess } = useNotification();

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    projectsService
      .getFull(projectId)
      .then((p) => {
        setProject(p);
        const s = (p.settings ?? {}) as Record<string, unknown>;
        setTargetKeywords(Array.isArray(s.target_keywords) ? (s.target_keywords as string[]).join("\n") : (s.target_keywords as string) ?? "");
        setRunFrequency((s.run_frequency as RunFrequency) ?? "weekly");
        setAutopilot(Boolean(s.autopilot));
      })
      .catch(() => showError("Failed to load project"))
      .finally(() => setLoading(false));
  }, [projectId, showError]);

  useEffect(() => {
    if (!projectId) return;
    setHistoryLoading(true);
    Promise.all([
      agentsService.listRuns(projectId, { limit: 30 }),
      agentsService.listMonitorRuns(projectId, { limit: 20 }),
    ])
      .then(([runsRes, monitorRes]) => {
        setAgentRuns(runsRes.agentRuns ?? []);
        setMonitorRuns(monitorRes.monitorRuns ?? []);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [projectId]);

  const handleSaveStrategy = async () => {
    if (!projectId || !project) return;
    setSaving(true);
    try {
      const keywords = targetKeywords
        .split("\n")
        .map((k) => k.trim())
        .filter(Boolean);
      await projectsService.update(projectId, {
        settings: {
          ...(project.settings ?? {}),
          target_keywords: keywords,
          run_frequency: runFrequency,
          autopilot: autopilot,
        },
      });
      setProject((p) => (p ? { ...p, settings: { ...(p.settings ?? {}), target_keywords: keywords, run_frequency: runFrequency, autopilot } } : null));
      notifySuccess("Strategy saved");
    } catch {
      showError("Failed to save strategy");
    } finally {
      setSaving(false);
    }
  };

  type TimelineItem = {
    id: string;
    date: Date;
    type: "agent" | "monitor";
    label: string;
    detail?: string;
  };

  const timelineItems: TimelineItem[] = [
    ...agentRuns.map((r) => ({
      id: r.id,
      date: new Date(r.created_at),
      type: "agent" as const,
      label: `${r.agent_type?.replace(/_/g, " ") ?? "Agent"} run`,
      detail: r.status === "completed" ? "Completed" : r.status === "failed" ? r.error_message ?? "Failed" : r.status,
    })),
    ...monitorRuns.map((r) => ({
      id: r.id,
      date: new Date(r.createdAt),
      type: "monitor" as const,
      label: "Monitor run",
      detail: r.healthScore != null ? `Health ${r.healthScore}` : undefined,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (loading && !project) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Strategy & automation</h1>
        <p className="text-sm text-muted-foreground">
          Configure how the project automates itself and view what the system has done.
        </p>
      </div>

      {/* Project Strategy Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5" />
            Project strategy
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Target keywords, run frequency, and autopilot behavior
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="keywords">Target keywords</Label>
            <Textarea
              id="keywords"
              placeholder="One keyword per line&#10;e.g. best running shoes&#10;marathon training"
              value={targetKeywords}
              onChange={(e) => setTargetKeywords(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Run frequency</Label>
            <Select value={runFrequency} onValueChange={(v) => setRunFrequency(v as RunFrequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often the system runs research, monitoring, and optimization.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Autopilot</Label>
              <p className="text-sm text-muted-foreground">
                Automatically apply recommendations and publish when ready
              </p>
            </div>
            <Switch checked={autopilot} onCheckedChange={setAutopilot} />
          </div>
          <Button onClick={handleSaveStrategy} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save strategy"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Automation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Automation history
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Timeline of what the system has done while you were away
          </p>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : timelineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No automation history yet</p>
              <p className="text-xs mt-1">Runs will appear here after agents or monitor complete.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {timelineItems.slice(0, 50).map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                >
                  {item.type === "agent" ? (
                    <Bot className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  ) : (
                    <Activity className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium capitalize">{item.label}</p>
                    {item.detail && (
                      <p className="text-muted-foreground text-xs mt-0.5">{item.detail}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(item.date, { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {item.type}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
