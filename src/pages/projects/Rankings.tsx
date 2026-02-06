import { useState } from "react";
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
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
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
  MoreVertical
} from "lucide-react";

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
}

const mockRankings: Ranking[] = [
  {
    id: "1",
    keyword: "urban gardening",
    position: 3,
    change7d: 2,
    change30d: -1,
    searchVolume: 8100,
    difficulty: 65,
    clicks: 1240,
    impressions: 12800,
    ctr: 9.7,
    url: "/urban-gardening-guide",
    lastUpdated: "2 hours ago"
  },
  {
    id: "2",
    keyword: "balcony composting",
    position: 5,
    change7d: -1,
    change30d: 3,
    searchVolume: 3200,
    difficulty: 45,
    clicks: 456,
    impressions: 4200,
    ctr: 10.9,
    url: "/balcony-composting-guide",
    lastUpdated: "2 hours ago"
  },
  {
    id: "3",
    keyword: "container gardening",
    position: 8,
    change7d: 1,
    change30d: -2,
    searchVolume: 5400,
    difficulty: 52,
    clicks: 312,
    impressions: 5600,
    ctr: 5.6,
    url: "/container-gardening-tips",
    lastUpdated: "2 hours ago"
  },
  {
    id: "4",
    keyword: "indoor herb garden",
    position: 12,
    change7d: 0,
    change30d: 1,
    searchVolume: 4400,
    difficulty: 38,
    clicks: 189,
    impressions: 4100,
    ctr: 4.6,
    url: "/indoor-herb-garden-setup",
    lastUpdated: "2 hours ago"
  },
  {
    id: "5",
    keyword: "vertical gardening",
    position: 15,
    change7d: -3,
    change30d: -5,
    searchVolume: 2800,
    difficulty: 42,
    clicks: 89,
    impressions: 3200,
    ctr: 2.8,
    url: "/vertical-gardening-ideas",
    lastUpdated: "2 hours ago"
  },
  {
    id: "6",
    keyword: "apartment gardening",
    position: 18,
    change7d: 2,
    change30d: 4,
    searchVolume: 2100,
    difficulty: 35,
    clicks: 67,
    impressions: 2800,
    ctr: 2.4,
    url: "/apartment-gardening-guide",
    lastUpdated: "2 hours ago"
  },
  {
    id: "7",
    keyword: "small space garden",
    position: 22,
    change7d: -1,
    change30d: 0,
    searchVolume: 1800,
    difficulty: 33,
    clicks: 34,
    impressions: 2100,
    ctr: 1.6,
    url: "/small-space-gardening",
    lastUpdated: "2 hours ago"
  },
  {
    id: "8",
    keyword: "windowsill herbs",
    position: 25,
    change7d: 1,
    change30d: -1,
    searchVolume: 1200,
    difficulty: 28,
    clicks: 23,
    impressions: 1800,
    ctr: 1.3,
    url: "/windowsill-herb-garden",
    lastUpdated: "2 hours ago"
  }
];

const trendData = [
  { date: "Jan 1", position: 8 },
  { date: "Jan 8", position: 7 },
  { date: "Jan 15", position: 5 },
  { date: "Jan 22", position: 4 },
  { date: "Jan 29", position: 3 }
];

export default function Rankings() {
  const [rankings, setRankings] = useState<Ranking[]>(mockRankings);
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("position-asc");
  const [selectedRankings, setSelectedRankings] = useState<Set<string>>(new Set());
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
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
    // Handle CSV export
    console.log("Exporting rankings:", Array.from(selectedRankings));
  };

  const showTrendChart = (keyword: string) => {
    setSelectedKeyword(keyword);
    setShowTrendModal(true);
  };

  const getInsights = () => {
    const top3 = rankings.filter(r => r.position <= 3).length;
    const top10 = rankings.filter(r => r.position <= 10).length;
    const top20 = rankings.filter(r => r.position <= 20).length;
    const improving = rankings.filter(r => r.change7d > 0).length;
    const declining = rankings.filter(r => r.change7d < 0).length;
    
    return { top3, top10, top20, improving, declining };
  };

  const insights = getInsights();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rankings Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Monitor keyword positions and track ranking changes over time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync Data
          </Button>
          <Button variant="outline" className="gap-2">
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
            <div className="text-2xl font-semibold">{insights.top3}</div>
            <div className="text-xs text-muted-foreground">keywords ranking</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Top 10</span>
            </div>
            <div className="text-2xl font-semibold">{insights.top10}</div>
            <div className="text-xs text-muted-foreground">keywords ranking</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Top 20</span>
            </div>
            <div className="text-2xl font-semibold">{insights.top20}</div>
            <div className="text-xs text-muted-foreground">keywords ranking</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Improving</span>
            </div>
            <div className="text-2xl font-semibold text-green-600">{insights.improving}</div>
            <div className="text-xs text-muted-foreground">this week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Declining</span>
            </div>
            <div className="text-2xl font-semibold text-red-600">{insights.declining}</div>
            <div className="text-xs text-muted-foreground">this week</div>
          </CardContent>
        </Card>
      </div>

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
            <span>Keywords ({filteredRankings.length})</span>
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
                {filteredRankings.map((ranking) => (
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
                        <div className="text-sm text-muted-foreground">
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
                          <DropdownMenuItem onClick={() => showTrendChart(ranking.keyword)}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Trend
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Page
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart Modal */}
      <Dialog open={showTrendModal} onOpenChange={setShowTrendModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Keyword Trend: {selectedKeyword}</DialogTitle>
            <DialogDescription>
              Position changes over the last 90 days
            </DialogDescription>
          </DialogHeader>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
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
                  labelFormatter={(label) => `Date: ${label}`}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}