import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Target,
  BarChart3,
  Calendar,
  RefreshCw,
  MoreVertical,
  Zap,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { rankingsService, type RankingFromApi, type RankingHistoryItem, type RankingsInsightsResponse } from "@/services/rankings";
import { formatDistanceToNow, format } from "date-fns";
import { useNotification } from "@/hooks/useNotification";

interface Ranking {
  id: string;
  keyword: string;
  position: number;
  change7d: number;
  change30d: number;
  searchVolume: number;
  difficulty: number;
  clicks: number;
  impressions: number;
  ctr: number;
  url: string;
  lastUpdated: string;
  previousPosition?: number;
}

function mapRanking(r: RankingFromApi): Ranking {
  const positionChange = r.position_change ?? 0;
  return {
    id: r.id,
    keyword: r.keyword,
    position: r.position,
    change7d: positionChange,
    change30d: 0,
    searchVolume: r.search_volume ?? 0,
    difficulty: r.difficulty ?? 0,
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    url: r.url ?? "",
    lastUpdated: formatDistanceToNow(new Date(r.tracked_at), { addSuffix: true }),
    previousPosition: r.previous_position,
  };
}

export default function Rankings() {
  const { projectId } = useParams<{ projectId: string }>();
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError, notifySuccess } = useNotification();

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Insights state
  const [insights, setInsights] = useState<RankingsInsightsResponse | null>(null);

  // Trend chart state
  const [trendData, setTrendData] = useState<RankingHistoryItem[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      rankingsService.list(projectId, { limit: 100 }),
      rankingsService.insights(projectId).catch(() => null),
    ])
      .then(([rankingsRes, insightsRes]) => {
        if (!cancelled) {
          setRankings(rankingsRes.rankings.map(mapRanking));
          if (insightsRes) {
            setInsights(insightsRes);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) showError(err instanceof Error ? err.message : "Failed to load rankings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true };
  }, [projectId, showError]);

  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("position-asc");
  const [selectedRankings, setSelectedRankings] = useState<Set<string>>(new Set());
  const [selectedKeyword, setSelectedKeyword] = useState<Ranking | null>(null);
  const [showTrendModal, setShowTrendModal] = useState(false);

  const filteredRankings = rankings
    .filter(ranking => {
      const matchesSearch = ranking.keyword.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" ||
        (positionFilter === "top3" && ranking.position <= 3) ||
        (positionFilter === "top10" && ranking.position <= 10) ||
        (positionFilter === "top20" && ranking.position <= 20) ||
        (positionFilter === "20plus" && ranking.position > 20);
      return matchesSearch && matchesPosition;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "position-asc":
          return a.position - b.position;
        case "position-desc":
          return b.position - a.position;
        case "volume-desc":
          return b.searchVolume - a.searchVolume;
        case "change-desc":
          return b.change7d - a.change7d;
        default:
          return 0;
      }
    });

  const getPositionColor = (position: number) => {
    if (position <= 3) return "text-green-600";
    if (position <= 10) return "text-blue-600";
    if (position <= 20) return "text-yellow-600";
    return "text-gray-600";
  };

  const getPositionBadgeVariant = (position: number) => {
    if (position <= 3) return "default";
    if (position <= 10) return "secondary";
    return "outline";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-3 w-3 text-green-600" />;
    if (change < 0) return <ArrowDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-400";
  };

  const handleSelectRanking = (rankingId: string, checked: boolean) => {
    const newSelected = new Set(selectedRankings);
    if (checked) {
      newSelected.add(rankingId);
    } else {
      newSelected.delete(rankingId);
    }
    setSelectedRankings(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRankings(new Set(filteredRankings.map(r => r.id)));
    } else {
      setSelectedRankings(new Set());
    }
  };

  const handleExport = () => {
    const dataToExport = selectedRankings.size > 0
      ? rankings.filter(r => selectedRankings.has(r.id))
      : rankings;

    const csv = [
      ["Keyword", "Position", "Change (7d)", "Volume", "Difficulty", "Clicks", "Impressions", "CTR", "URL"].join(","),
      ...dataToExport.map(r => [
        `"${r.keyword}"`,
        r.position,
        r.change7d,
        r.searchVolume,
        r.difficulty,
        r.clicks,
        r.impressions,
        `${r.ctr.toFixed(1)}%`,
        `"${r.url}"`,
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rankings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    notifySuccess(`Exported ${dataToExport.length} rankings to CSV`);
  };

  const handleSync = async () => {
    if (!projectId || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await rankingsService.sync(projectId);
      setLastSyncedAt(result.syncedAt);
      notifySuccess(`Synced ${result.snapshotCount} snapshots from GSC`);

      // Refresh data
      const [rankingsRes, insightsRes] = await Promise.all([
        rankingsService.list(projectId, { limit: 100 }),
        rankingsService.insights(projectId).catch(() => null),
      ]);
      setRankings(rankingsRes.rankings.map(mapRanking));
      if (insightsRes) {
        setInsights(insightsRes);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to sync rankings");
    } finally {
      setIsSyncing(false);
    }
  };

  const showTrendChart = async (ranking: Ranking) => {
    setSelectedKeyword(ranking);
    setShowTrendModal(true);
    setLoadingTrend(true);
    setTrendData([]);

    if (projectId) {
      try {
        const history = await rankingsService.history(projectId, ranking.id);
        setTrendData(history.history);
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to load trend data");
      } finally {
        setLoadingTrend(false);
      }
    }
  };

  const getInsights = () => {
    const top3 = rankings.filter(r => r.position <= 3).length;
    const top10 = rankings.filter(r => r.position <= 10).length;
    const top20 = rankings.filter(r => r.position <= 20).length;
    const improving = rankings.filter(r => r.change7d > 0).length;
    const declining = rankings.filter(r => r.change7d < 0).length;

    return { top3, top10, top20, improving, declining };
  };

  const calculatedInsights = getInsights();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rankings Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Monitor keyword positions and track ranking changes over time
            {lastSyncedAt && (
              <span className="ml-2 text-xs">
                (Last synced: {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isSyncing ? "Syncing..." : "Sync Data"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Insights Panel */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Top 3</span>
            </div>
            <div className="text-2xl font-semibold">{calculatedInsights.top3}</div>
            <div className="text-xs text-muted-foreground">keywords ranking</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Top 10</span>
            </div>
            <div className="text-2xl font-semibold">{calculatedInsights.top10}</div>
            <div className="text-xs text-muted-foreground">keywords ranking</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Top 20</span>
            </div>
            <div className="text-2xl font-semibold">{calculatedInsights.top20}</div>
            <div className="text-xs text-muted-foreground">keywords ranking</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Improving</span>
            </div>
            <div className="text-2xl font-semibold text-green-600">{calculatedInsights.improving}</div>
            <div className="text-xs text-muted-foreground">this week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Declining</span>
            </div>
            <div className="text-2xl font-semibold text-red-600">{calculatedInsights.declining}</div>
            <div className="text-xs text-muted-foreground">this week</div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Tabs */}
      {insights && (
        <Tabs defaultValue="gaining" className="space-y-4">
          <TabsList>
            <TabsTrigger value="gaining" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Gaining ({insights.summary.totalGaining})
            </TabsTrigger>
            <TabsTrigger value="losing" className="gap-1">
              <TrendingDown className="h-3 w-3" />
              Losing ({insights.summary.totalLosing})
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="gap-1">
              <Zap className="h-3 w-3" />
              Opportunities ({insights.summary.totalOpportunities})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gaining">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Top Gainers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.gaining.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No keywords gaining positions</p>
                ) : (
                  <div className="space-y-2">
                    {insights.gaining.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm font-medium">{item.keyword}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{item.position}</Badge>
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" />
                            {Math.abs(item.change || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="losing">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Top Losers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.losing.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No keywords losing positions</p>
                ) : (
                  <div className="space-y-2">
                    {insights.losing.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm font-medium">{item.keyword}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{item.position}</Badge>
                          <span className="text-sm text-red-600 flex items-center gap-1">
                            <ArrowDown className="h-3 w-3" />
                            {Math.abs(item.change || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Keyword Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.opportunities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No opportunities found</p>
                ) : (
                  <div className="space-y-2">
                    {insights.opportunities.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <span className="text-sm font-medium">{item.keyword}</span>
                          <p className="text-xs text-muted-foreground">
                            Position #{item.position} · Vol: {item.volume?.toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          +{item.potentialTraffic} potential clicks
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Position Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Position
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setPositionFilter("all")}>
                    All Positions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPositionFilter("top3")}>
                    Top 3
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPositionFilter("top10")}>
                    Top 10
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPositionFilter("top20")}>
                    Top 20
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPositionFilter("20plus")}>
                    20+
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy("position-asc")}>
                    Position ↑
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("position-desc")}>
                    Position ↓
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("volume-desc")}>
                    Volume ↓
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("change-desc")}>
                    Change ↓
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Bulk Actions */}
            {selectedRankings.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedRankings.size} selected
                </span>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-3 w-3 mr-1" />
                  Export Selected
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Keywords ({loading ? "…" : filteredRankings.length})</span>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedRankings.size === filteredRankings.length && filteredRankings.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Select</th>
                  <th className="text-left p-4 font-medium">Keyword</th>
                  <th className="text-left p-4 font-medium">Position</th>
                  <th className="text-left p-4 font-medium">Change (7d)</th>
                  <th className="text-left p-4 font-medium">Change (30d)</th>
                  <th className="text-left p-4 font-medium">Volume</th>
                  <th className="text-left p-4 font-medium">Difficulty</th>
                  <th className="text-left p-4 font-medium">Clicks</th>
                  <th className="text-left p-4 font-medium">Impressions</th>
                  <th className="text-left p-4 font-medium">CTR</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                      Loading rankings…
                    </td>
                  </tr>
                ) : filteredRankings.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                      No rankings yet. <Button variant="link" onClick={handleSync} className="p-0 h-auto">Sync with Google Search Console</Button> to populate.
                    </td>
                  </tr>
                ) : (
                filteredRankings.map((ranking) => (
                  <tr key={ranking.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedRankings.has(ranking.id)}
                        onCheckedChange={(checked) =>
                          handleSelectRanking(ranking.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium">{ranking.keyword}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {ranking.url}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPositionBadgeVariant(ranking.position)}>
                          #{ranking.position}
                        </Badge>
                        {getPositionColor(ranking.position) && (
                          <span className={`text-xs ${getPositionColor(ranking.position)}`}>
                            {ranking.position <= 3 ? 'Excellent' :
                             ranking.position <= 10 ? 'Good' :
                             ranking.position <= 20 ? 'Fair' : 'Poor'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {getChangeIcon(ranking.change7d)}
                        <span className={`text-sm ${getChangeColor(ranking.change7d)}`}>
                          {ranking.change7d !== 0 ? Math.abs(ranking.change7d) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {getChangeIcon(ranking.change30d)}
                        <span className={`text-sm ${getChangeColor(ranking.change30d)}`}>
                          {ranking.change30d !== 0 ? Math.abs(ranking.change30d) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      {ranking.searchVolume.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          ranking.difficulty <= 30 ? 'bg-green-500' :
                          ranking.difficulty <= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm">{ranking.difficulty}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      {ranking.clicks.toLocaleString()}
                    </td>
                    <td className="p-4 text-sm">
                      {ranking.impressions.toLocaleString()}
                    </td>
                    <td className="p-4 text-sm">
                      {ranking.ctr.toFixed(1)}%
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => showTrendChart(ranking)}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Trend
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={ranking.url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-2" />
                              View Page
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart Modal */}
      <Dialog open={showTrendModal} onOpenChange={setShowTrendModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Keyword Trend: {selectedKeyword?.keyword}</DialogTitle>
            <DialogDescription>
              Position and performance changes over time
            </DialogDescription>
          </DialogHeader>

          {loadingTrend ? (
            <div className="h-[400px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : trendData.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
              <p>No historical data available for this keyword</p>
              <p className="text-sm">Sync with GSC to collect trend data</p>
            </div>
          ) : (
            <Tabs defaultValue="position" className="space-y-4">
              <TabsList>
                <TabsTrigger value="position">Position</TabsTrigger>
                <TabsTrigger value="clicks">Clicks</TabsTrigger>
                <TabsTrigger value="impressions">Impressions</TabsTrigger>
              </TabsList>

              <TabsContent value="position" className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), "MMM d")}
                    />
                    <YAxis
                      domain={[1, 50]}
                      reversed
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `#${value}`}
                    />
                    <Tooltip
                      formatter={(value) => [`Position #${value}`, 'Ranking']}
                      labelFormatter={(label) => format(new Date(label), "MMM d, yyyy")}
                    />
                    <Line
                      type="monotone"
                      dataKey="position"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="clicks" className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), "MMM d")}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => [value, 'Clicks']}
                      labelFormatter={(label) => format(new Date(label), "MMM d, yyyy")}
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="impressions" className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), "MMM d")}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : value, 'Impressions']}
                      labelFormatter={(label) => format(new Date(label), "MMM d, yyyy")}
                    />
                    <Area
                      type="monotone"
                      dataKey="impressions"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
