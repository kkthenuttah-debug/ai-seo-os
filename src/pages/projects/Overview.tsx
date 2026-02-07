import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrafficChart } from "@/components/TrafficChart";
import { KeywordsChart } from "@/components/KeywordsChart";
import { AgentRunItem } from "@/components/AgentRunItem";
import { IntegrationCard } from "@/components/IntegrationCard";
import { ProjectHeader } from "@/components/ProjectHeader";
import { AgentLauncher } from "@/components/AgentLauncher";
import {
  Play,
  Pause,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Target,
  Search,
  ExternalLink,
  Bot,
  Sparkles,
} from "lucide-react";
import { projectsService } from "@/services/projects";
import { analyticsService } from "@/services/analytics";
import { agentsService, type AgentRunFromApi } from "@/services/agents";
import { integrationsService } from "@/services/integrations";
import { formatDistanceToNow } from "date-fns";
import { useNotification } from "@/hooks/useNotification";

function formatAgentType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function mapRunToItem(r: AgentRunFromApi): {
  id: string;
  agent: string;
  status: "running" | "completed" | "failed";
  duration: string;
  summary: string;
  timestamp: string;
} {
  const duration =
    r.duration_ms != null ? `${Math.floor(r.duration_ms / 60000)}m ${Math.floor((r.duration_ms % 60000) / 1000)}s` : "—";
  return {
    id: r.id,
    agent: formatAgentType(r.agent_type),
    status: r.status === "running" ? "running" : r.status === "failed" ? "failed" : "completed",
    duration,
    summary: r.error_message || "Run completed",
    timestamp: r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : "—",
  };
}

export default function Overview() {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [isAutomationActive, setIsAutomationActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  const [projectName, setProjectName] = useState("");
  const [domain, setDomain] = useState("");
  const [projectStatus, setProjectStatus] = useState("active");
  const [lastUpdated, setLastUpdated] = useState("");
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof analyticsService.overview>> | null>(null);
  const [traffic, setTraffic] = useState<Awaited<ReturnType<typeof analyticsService.traffic>> | null>(null);
  const [keywords, setKeywords] = useState<Awaited<ReturnType<typeof analyticsService.keywords>> | null>(null);
  const [agentRuns, setAgentRuns] = useState<ReturnType<typeof mapRunToItem>[]>([]);
  const [integrations, setIntegrations] = useState<Array<{ name: string; connected: boolean; url?: string; lastSync?: string; status: string }>>([]);
  const [showLauncher, setShowLauncher] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      projectsService.get(projectId).catch(() => null),
      analyticsService.overview(projectId).catch(() => null),
      analyticsService.traffic(projectId).catch(() => null),
      analyticsService.keywords(projectId).catch(() => null),
      agentsService.listRuns(projectId, { limit: 10 }).catch(() => null),
      integrationsService.list(projectId).catch(() => []),
    ])
      .then(([proj, ov, tr, kw, runs, ints]) => {
        if (cancelled) return;
        if (proj) {
          setProjectName(proj.name);
          setDomain(proj.domain);
          setProjectStatus(proj.status);
          setLastUpdated(proj.updatedAt ? formatDistanceToNow(new Date(proj.updatedAt), { addSuffix: true }) : "");
        }
        setOverview(ov ?? null);
        setTraffic(tr ?? null);
        setKeywords(kw ?? null);
        setAgentRuns((runs?.agentRuns ?? []).map(mapRunToItem));
        setIntegrations(
          Array.isArray(ints)
            ? ints.map((i) => ({
                name: i.type === "wordpress" ? "WordPress" : i.type === "gsc" ? "Google Search Console" : i.type,
                connected: i.status === "active",
                url: (i.data as { site_url?: string })?.site_url,
                lastSync: i.last_sync_at ? formatDistanceToNow(new Date(i.last_sync_at), { addSuffix: true }) : undefined,
                status: i.status === "active" ? "connected" : "disconnected",
              }))
            : []
        );
      })
      .catch((err) => {
        if (!cancelled) showError(err instanceof Error ? err.message : "Failed to load overview");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId, showError]);

  const formatNumber = (num: number) => (num >= 1000 ? `${(num / 1000).toFixed(1)}K` : String(num));
  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;
  const getPositionColor = (position: number) => {
    if (position <= 3) return "text-green-600";
    if (position <= 10) return "text-blue-600";
    if (position <= 20) return "text-yellow-600";
    return "text-gray-600";
  };
  const getPositionBadgeVariant = (position: number) => (position <= 3 ? "default" : position <= 10 ? "secondary" : "outline");

  const trafficData = traffic?.daily?.map((d) => ({
    name: (d as { name?: string; date?: string }).name ?? (d as { date?: string }).date ?? "",
    impressions: d.impressions,
    clicks: d.clicks,
  })) ?? [];
  const keywordsData = keywords?.topClicks?.slice(0, 10).map((k) => ({
    keyword: k.keyword,
    position: k.position,
    volume: 0,
    difficulty: 0,
    clicks: k.clicks,
  })) ?? [];

  if (loading && !projectName) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading overview…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectHeader
        projectName={projectName || "Project"}
        domain={domain}
        status={projectStatus}
        lastUpdated={lastUpdated}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Published Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{overview?.pages.published ?? 0}</div>
            <div className="text-xs text-muted-foreground">of {overview?.pages.total ?? 0} total</div>
            <Button size="sm" variant="outline" className="mt-2 w-full text-xs" asChild>
              <Link to={`/app/projects/${projectId}/pages`}>View all pages</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Keywords Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {overview?.rankings.top10 ?? 0} <span className="text-sm text-muted-foreground">in top 10</span>
            </div>
            <div className="text-xs text-muted-foreground">Avg position: {overview?.rankings.avgPosition ?? "—"}</div>
            <Button size="sm" variant="outline" className="mt-2 w-full text-xs" asChild>
              <Link to={`/app/projects/${projectId}/rankings`}>View rankings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Leads Captured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{overview?.leads.total ?? 0}</div>
            <Button size="sm" variant="outline" className="mt-2 w-full text-xs" asChild>
              <Link to={`/app/projects/${projectId}/leads`}>View leads</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" />
              Site Traffic
            </CardTitle>
          </CardHeader>
          <CardContent>
            {traffic?.summary ? (
              <>
                <div className="text-2xl font-semibold">{formatNumber(traffic.summary.totalClicks)}</div>
                <div className="text-xs text-muted-foreground">
                  clicks from {formatNumber(traffic.summary.totalImpressions)} impressions
                </div>
                <div className="text-xs text-muted-foreground">CTR: {formatPercentage(traffic.summary.avgCTR * 100)}</div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">Connect GSC for traffic data</p>
                <Button size="sm" variant="outline" className="text-xs" asChild>
                  <Link to={`/app/projects/${projectId}/integrations`}>Integrations</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Traffic Trend
              </CardTitle>
              <div className="flex gap-2">
                <Button variant={selectedTimeRange === "7d" ? "default" : "outline"} size="sm" onClick={() => setSelectedTimeRange("7d")}>7D</Button>
                <Button variant={selectedTimeRange === "30d" ? "default" : "outline"} size="sm" onClick={() => setSelectedTimeRange("30d")}>30D</Button>
                <Button variant={selectedTimeRange === "90d" ? "default" : "outline"} size="sm" onClick={() => setSelectedTimeRange("90d")}>90D</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trafficData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No traffic data. Connect GSC and sync.</p>
            ) : (
              <TrafficChart data={trafficData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            {keywordsData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No keyword data yet.</p>
            ) : (
              <KeywordsChart data={keywordsData.slice(0, 5)} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Agent Runs</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/app/projects/${projectId}/agents`}>View queue</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {agentRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No agent runs yet.</p>
            ) : (
              agentRuns.map((run) => <AgentRunItem key={run.id} {...run} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keywords Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {keywordsData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No keywords yet.</p>
            ) : (
              keywordsData.slice(0, 6).map((k, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{k.keyword}</p>
                    <p className="text-xs text-muted-foreground">{k.clicks ?? 0} clicks</p>
                  </div>
                  <Badge variant={getPositionBadgeVariant(k.position)} className="ml-2">#{k.position}</Badge>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" className="w-full mt-3" asChild>
              <Link to={`/app/projects/${projectId}/rankings`}>View all keywords</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No integrations. Connect WordPress and GSC in Integrations.</p>
            ) : (
              integrations.map((i) => (
                <IntegrationCard
                  key={i.name}
                  name={i.name}
                  connected={i.connected}
                  url={i.url}
                  lastSync={i.lastSync}
                  status={i.status}
                />
              ))
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/app/projects/${projectId}/integrations`}>Manage integrations</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Run Agent</p>
                <p className="text-xs text-muted-foreground">Launch any of the 11 AI agents</p>
              </div>
              <Button size="sm" onClick={() => setShowLauncher(true)}>
                <Bot className="h-3 w-3 mr-1" /> Launch
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Automation Loop</p>
                <p className="text-xs text-muted-foreground">{isAutomationActive ? "Running" : "Paused"}</p>
              </div>
              <Button variant={isAutomationActive ? "outline" : "default"} size="sm" onClick={() => setIsAutomationActive(!isAutomationActive)}>
                {isAutomationActive ? <><Pause className="h-3 w-3 mr-1" /> Pause</> : <><Play className="h-3 w-3 mr-1" /> Start</>}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">GSC Data Sync</p>
                <p className="text-xs text-muted-foreground">Update rankings and traffic</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/app/projects/${projectId}/rankings`}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Sync
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">View Analytics</p>
                <p className="text-xs text-muted-foreground">Performance insights</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/app/projects/${projectId}/rankings`}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Open
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Launcher */}
      <AgentLauncher
        projectId={projectId || ""}
        isOpen={showLauncher}
        onClose={() => setShowLauncher(false)}
      />
    </div>
  );
}
