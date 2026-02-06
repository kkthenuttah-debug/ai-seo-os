import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrafficChart } from "@/components/TrafficChart";
import { KeywordsChart } from "@/components/KeywordsChart";
import { AgentRunItem } from "@/components/AgentRunItem";
import { IntegrationCard } from "@/components/IntegrationCard";
import { ProjectHeader } from "@/components/ProjectHeader";
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
  Calendar
} from "lucide-react";

const projectStats = {
  projectName: "Urban Garden Co",
  domain: "urbangarden.co",
  status: "active",
  lastUpdated: "2 hours ago",
  stats: {
    publishedPages: {
      count: 48,
      change: "+6 this week",
      changeType: "up"
    },
    keywordsRanking: {
      top10: 45,
      top3: 12,
      averagePosition: 8.4,
      change: "+12% MoM",
      changeType: "up"
    },
    leadsCaptured: {
      thisMonth: 89,
      thisWeek: 23,
      change: "+8% MoM",
      changeType: "up"
    },
    siteTraffic: {
      totalClicks: 12450,
      totalImpressions: 125000,
      averageCTR: 9.96,
      averagePosition: 12.3,
      connected: true
    }
  }
};

const trafficData = [
  { name: "Jan 1", impressions: 4200, clicks: 380 },
  { name: "Jan 2", impressions: 3800, clicks: 340 },
  { name: "Jan 3", impressions: 4100, clicks: 390 },
  { name: "Jan 4", impressions: 4500, clicks: 420 },
  { name: "Jan 5", impressions: 4200, clicks: 410 },
  { name: "Jan 6", impressions: 4800, clicks: 450 },
  { name: "Jan 7", impressions: 5100, clicks: 480 },
  { name: "Jan 8", impressions: 4600, clicks: 430 },
  { name: "Jan 9", impressions: 4300, clicks: 400 },
  { name: "Jan 10", impressions: 4900, clicks: 470 },
  { name: "Jan 11", impressions: 5200, clicks: 500 },
  { name: "Jan 12", impressions: 4700, clicks: 440 },
  { name: "Jan 13", impressions: 5100, clicks: 490 },
  { name: "Jan 14", impressions: 5500, clicks: 520 },
  { name: "Jan 15", impressions: 5300, clicks: 510 },
  { name: "Jan 16", impressions: 4800, clicks: 460 },
  { name: "Jan 17", impressions: 5200, clicks: 500 },
  { name: "Jan 18", impressions: 5600, clicks: 540 },
  { name: "Jan 19", impressions: 5400, clicks: 520 },
  { name: "Jan 20", impressions: 5800, clicks: 560 },
  { name: "Jan 21", impressions: 6000, clicks: 580 },
  { name: "Jan 22", impressions: 5700, clicks: 550 },
  { name: "Jan 23", impressions: 5900, clicks: 570 },
  { name: "Jan 24", impressions: 6100, clicks: 590 },
  { name: "Jan 25", impressions: 6300, clicks: 610 },
  { name: "Jan 26", impressions: 6000, clicks: 580 },
  { name: "Jan 27", impressions: 6200, clicks: 600 },
  { name: "Jan 28", impressions: 6400, clicks: 620 },
  { name: "Jan 29", impressions: 6500, clicks: 630 },
  { name: "Jan 30", impressions: 6700, clicks: 650 }
];

const keywordsData = [
  { keyword: "urban gardening", position: 3, volume: 8100, difficulty: 65, clicks: 120 },
  { keyword: "balcony composting", position: 5, volume: 3200, difficulty: 45, clicks: 85 },
  { keyword: "backyard greenhouse", position: 9, volume: 1900, difficulty: 52, clicks: 34 },
  { keyword: "indoor herb garden", position: 12, volume: 5400, difficulty: 38, clicks: 67 },
  { keyword: "vertical gardening", position: 15, volume: 2800, difficulty: 42, clicks: 23 },
  { keyword: "container gardening", position: 18, volume: 4100, difficulty: 41, clicks: 19 },
  { keyword: "apartment gardening", position: 22, volume: 2100, difficulty: 35, clicks: 8 },
  { keyword: "small space garden", position: 25, volume: 1800, difficulty: 33, clicks: 5 },
  { keyword: "windowsill herbs", position: 28, volume: 1200, difficulty: 28, clicks: 3 },
  { keyword: "kitchen garden", position: 32, volume: 1600, difficulty: 30, clicks: 2 }
];

const agentRuns = [
  {
    id: "1",
    agent: "Market Research",
    status: "completed",
    duration: "4m 32s",
    summary: "Discovered 15 new keyword clusters and analyzed competitor content gaps",
    timestamp: "2 hours ago",
    inputSize: "12.3 KB",
    outputSize: "45.7 KB"
  },
  {
    id: "2",
    agent: "Content Builder",
    status: "completed",
    duration: "8m 15s",
    summary: "Published 3 new blog pages optimized for target keywords",
    timestamp: "4 hours ago",
    inputSize: "8.7 KB",
    outputSize: "156.2 KB"
  },
  {
    id: "3",
    agent: "SEO Optimizer",
    status: "running",
    duration: "2m 18s",
    summary: "Optimizing meta descriptions and internal linking structure",
    timestamp: "Now",
    inputSize: "23.1 KB",
    outputSize: "18.4 KB"
  },
  {
    id: "4",
    agent: "Link Builder",
    status: "completed",
    duration: "12m 45s",
    summary: "Created 8 new internal links and optimized anchor text",
    timestamp: "6 hours ago",
    inputSize: "15.6 KB",
    outputSize: "32.1 KB"
  },
  {
    id: "5",
    agent: "Technical SEO",
    status: "completed",
    duration: "6m 3s",
    summary: "Fixed 5 page speed issues and improved Core Web Vitals",
    timestamp: "8 hours ago",
    inputSize: "28.9 KB",
    outputSize: "41.3 KB"
  }
];

const integrations = {
  wordpress: {
    name: "WordPress",
    connected: true,
    url: "https://urbangarden.co",
    lastSync: "30 minutes ago",
    status: "healthy"
  },
  gsc: {
    name: "Google Search Console",
    connected: true,
    url: "https://urbangarden.co",
    lastSync: "1 hour ago",
    status: "healthy"
  }
};

export default function Overview() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [isAutomationActive, setIsAutomationActive] = useState(true);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

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

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <ProjectHeader 
        projectName={projectStats.projectName}
        domain={projectStats.domain}
        status={projectStats.status}
        lastUpdated={projectStats.lastUpdated}
      />

      {/* Stats Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Published Pages */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Published Pages
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{projectStats.stats.publishedPages.count}</div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" />
              {projectStats.stats.publishedPages.change}
            </div>
            <Button size="sm" variant="outline" className="mt-2 w-full text-xs">
              View all pages
            </Button>
          </CardContent>
        </Card>

        {/* Keywords Ranking */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Keywords Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {projectStats.stats.keywordsRanking.top10} <span className="text-sm text-muted-foreground">in top 10</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {projectStats.stats.keywordsRanking.top3} in top 3
            </div>
            <div className="text-xs text-muted-foreground">
              Avg position: {projectStats.stats.keywordsRanking.averagePosition}
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3" />
              {projectStats.stats.keywordsRanking.change}
            </div>
          </CardContent>
        </Card>

        {/* Leads Captured */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Leads Captured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{projectStats.stats.leadsCaptured.thisMonth}</div>
            <div className="text-xs text-muted-foreground">
              {projectStats.stats.leadsCaptured.thisWeek} this week
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3" />
              {projectStats.stats.leadsCaptured.change}
            </div>
          </CardContent>
        </Card>

        {/* Site Traffic */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" />
              Site Traffic
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectStats.stats.siteTraffic.connected ? (
              <>
                <div className="text-2xl font-semibold">
                  {formatNumber(projectStats.stats.siteTraffic.totalClicks)}
                </div>
                <div className="text-xs text-muted-foreground">
                  clicks from {formatNumber(projectStats.stats.siteTraffic.totalImpressions)} impressions
                </div>
                <div className="text-xs text-muted-foreground">
                  CTR: {formatPercentage(projectStats.stats.siteTraffic.averageCTR)}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">GSC not connected</p>
                <Button size="sm" variant="outline" className="text-xs">
                  Connect GSC
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Traffic Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Traffic Trend
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant={selectedTimeRange === "7d" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedTimeRange("7d")}
                >
                  7D
                </Button>
                <Button 
                  variant={selectedTimeRange === "30d" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedTimeRange("30d")}
                >
                  30D
                </Button>
                <Button 
                  variant={selectedTimeRange === "90d" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedTimeRange("90d")}
                >
                  90D
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TrafficChart data={trafficData} />
          </CardContent>
        </Card>

        {/* Top Keywords Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <KeywordsChart data={keywordsData.slice(0, 5)} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Agent Runs & Keywords Performance */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Recent Agent Runs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Agent Runs</CardTitle>
              <Button variant="outline" size="sm">
                View queue
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {agentRuns.map((run) => (
              <AgentRunItem key={run.id} {...run} />
            ))}
          </CardContent>
        </Card>

        {/* Keywords Performance Details */}
        <Card>
          <CardHeader>
            <CardTitle>Keywords Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {keywordsData.slice(0, 6).map((keyword, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{keyword.keyword}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(keyword.volume)} searches/mo</p>
                </div>
                <Badge variant={getPositionBadgeVariant(keyword.position)} className="ml-2">
                  #{keyword.position}
                </Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-3">
              View all keywords
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Project Integrations & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Project Integrations Status */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <IntegrationCard {...integrations.wordpress} />
            <IntegrationCard {...integrations.gsc} />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Automation Loop</p>
                <p className="text-xs text-muted-foreground">
                  {isAutomationActive ? "Currently running" : "Currently paused"}
                </p>
              </div>
              <Button 
                variant={isAutomationActive ? "outline" : "default"}
                size="sm"
                onClick={() => setIsAutomationActive(!isAutomationActive)}
              >
                {isAutomationActive ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">GSC Data Sync</p>
                <p className="text-xs text-muted-foreground">Update rankings and traffic data</p>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync Now
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">View Analytics</p>
                <p className="text-xs text-muted-foreground">Detailed performance insights</p>
              </div>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3 w-3 mr-1" />
                Open
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}