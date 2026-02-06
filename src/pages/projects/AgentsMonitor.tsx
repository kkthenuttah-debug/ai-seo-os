import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentRunItem } from "@/components/AgentRunItem";
import { 
  Bot, 
  Play, 
  Pause, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  MoreVertical,
  ExternalLink
} from "lucide-react";

interface AgentHealth {
  agentName: string;
  successRate: number;
  avgDuration: string;
  totalRuns: number;
  lastRunTime: string;
  errorCount: number;
  status: "healthy" | "warning" | "error";
}

interface QueueStatus {
  name: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  icon: React.ReactNode;
}

const agentHealthData: AgentHealth[] = [
  {
    agentName: "Market Research",
    successRate: 98.5,
    avgDuration: "4m 23s",
    totalRuns: 147,
    lastRunTime: "2 hours ago",
    errorCount: 2,
    status: "healthy"
  },
  {
    agentName: "Content Builder",
    successRate: 94.2,
    avgDuration: "8m 15s",
    totalRuns: 89,
    lastRunTime: "30 minutes ago",
    errorCount: 5,
    status: "warning"
  },
  {
    agentName: "SEO Optimizer",
    successRate: 97.8,
    avgDuration: "3m 42s",
    totalRuns: 203,
    lastRunTime: "1 hour ago",
    errorCount: 4,
    status: "healthy"
  },
  {
    agentName: "Link Builder",
    successRate: 91.3,
    avgDuration: "12m 8s",
    totalRuns: 56,
    lastRunTime: "3 hours ago",
    errorCount: 5,
    status: "warning"
  },
  {
    agentName: "Technical SEO",
    successRate: 99.1,
    avgDuration: "6m 31s",
    totalRuns: 134,
    lastRunTime: "4 hours ago",
    errorCount: 1,
    status: "healthy"
  }
];

const queueStatusData: QueueStatus[] = [
  {
    name: "Agent Tasks",
    pending: 3,
    processing: 2,
    completed: 247,
    failed: 1,
    icon: <Bot className="h-4 w-4" />
  },
  {
    name: "Build Queue",
    pending: 1,
    processing: 0,
    completed: 89,
    failed: 0,
    icon: <Zap className="h-4 w-4" />
  },
  {
    name: "Publish Queue",
    pending: 0,
    processing: 1,
    completed: 156,
    failed: 2,
    icon: <ExternalLink className="h-4 w-4" />
  },
  {
    name: "Optimize Queue",
    pending: 2,
    processing: 1,
    completed: 178,
    failed: 3,
    icon: <TrendingUp className="h-4 w-4" />
  }
];

const currentJobs = [
  {
    id: "current-1",
    agent: "Content Builder",
    status: "running" as const,
    duration: "6m 23s",
    summary: "Creating comprehensive guide on indoor herb gardening with SEO optimization",
    timestamp: "Running",
    inputSize: "15.2 KB",
    outputSize: "23.7 KB",
    progress: 65,
    inputData: {
      targetKeyword: "indoor herb garden",
      tone: "authoritative",
      wordCount: 2500,
      includeImages: true,
      includeFAQ: true
    },
    outputData: {
      title: "The Complete Guide to Indoor Herb Gardening",
      outline: ["Introduction", "Choosing the Right Herbs", "Container Setup", "Lighting Requirements", "Watering and Care"],
      wordCount: 2456
    }
  }
];

const recentJobs = [
  {
    id: "recent-1",
    agent: "Market Research",
    status: "completed" as const,
    duration: "4m 32s",
    summary: "Discovered 15 new keyword clusters and analyzed competitor content gaps",
    timestamp: "2 hours ago",
    inputSize: "12.3 KB",
    outputSize: "45.7 KB",
    inputData: {
      domain: "urbangarden.co",
      competitorSites: ["gardeners.com", "urbanfarm.com"],
      focusAreas: ["vegetables", "herbs", "sustainable"]
    },
    outputData: {
      keywordClusters: 15,
      contentGaps: 8,
      competitorAnalysis: "detailed"
    }
  },
  {
    id: "recent-2",
    agent: "SEO Optimizer",
    status: "completed" as const,
    duration: "3m 18s",
    summary: "Optimized meta descriptions and internal linking for 12 pages",
    timestamp: "4 hours ago",
    inputSize: "8.7 KB",
    outputSize: "12.4 KB",
    inputData: {
      pages: ["urban-gardening-guide", "balcony-composting", "container-vegetables"],
      optimizationType: "meta"
    },
    outputData: {
      optimizedPages: 12,
      metaDescriptionsUpdated: 12,
      internalLinksAdded: 18
    }
  },
  {
    id: "recent-3",
    agent: "Link Builder",
    status: "failed" as const,
    duration: "8m 45s",
    summary: "Failed to create internal links due to WordPress API timeout",
    timestamp: "6 hours ago",
    inputSize: "25.1 KB",
    outputSize: "0 KB",
    errorMessage: "WordPress API timeout after 30000ms. Please retry.",
    inputData: {
      targetPages: 15,
      linkType: "internal",
      anchorTextStrategy: "natural"
    }
  },
  {
    id: "recent-4",
    agent: "Technical SEO",
    status: "completed" as const,
    duration: "5m 12s",
    summary: "Improved Core Web Vitals and fixed 8 page speed issues",
    timestamp: "8 hours ago",
    inputSize: "18.9 KB",
    outputSize: "31.3 KB",
    inputData: {
      focus: "core web vitals",
      pages: "all"
    },
    outputData: {
      issuesFixed: 8,
      lcpImproved: "12%",
      fidImproved: "8%"
    }
  }
];

export default function AgentsMonitor() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (startTime: Date) => {
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agents Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Monitor agent performance and job queue status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Pause className="h-4 w-4" />
            Pause All
          </Button>
          <Button variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Retry Failed
          </Button>
        </div>
      </div>

      {/* Current Job Display */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Currently Running Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentJobs.map((job) => (
            <div key={job.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="font-medium">{job.agent}</h3>
                    <p className="text-sm text-muted-foreground">{job.summary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{job.duration}</div>
                    <div className="text-xs text-muted-foreground">Elapsed time</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{job.progress}%</span>
                </div>
                <Progress value={job.progress} className="w-full" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Input Size:</span> {job.inputSize}
                </div>
                <div>
                  <span className="text-muted-foreground">Output Size:</span> {job.outputSize}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {queueStatusData.map((queue) => (
              <div key={queue.name} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  {queue.icon}
                  <h3 className="font-medium">{queue.name}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pending</span>
                    <Badge variant="outline">{queue.pending}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing</span>
                    <Badge variant="default">{queue.processing}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <Badge variant="secondary">{queue.completed}</Badge>
                  </div>
                  {queue.failed > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Failed</span>
                      <Badge variant="destructive">{queue.failed}</Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Jobs</TabsTrigger>
          <TabsTrigger value="health">Agent Health</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentJobs.map((job) => (
                <AgentRunItem key={job.id} {...job} />
              ))}
              
              {recentJobs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent jobs found</p>
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
              {agentHealthData.map((agent) => (
                <div key={agent.agentName} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getHealthStatusIcon(agent.status)}
                      <h3 className="font-medium">{agent.agentName}</h3>
                      <Badge 
                        variant={agent.status === 'healthy' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {agent.status}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Success Rate</div>
                      <div className={`font-medium ${getHealthStatusColor(agent.status)}`}>
                        {agent.successRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Duration</div>
                      <div className="font-medium">{agent.avgDuration}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Runs</div>
                      <div className="font-medium">{agent.totalRuns}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Run</div>
                      <div className="font-medium">{agent.lastRunTime}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Errors</div>
                      <div className={`font-medium ${agent.errorCount > 3 ? 'text-red-600' : 'text-green-600'}`}>
                        {agent.errorCount}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Performance</span>
                      <span className={getHealthStatusColor(agent.status)}>
                        {agent.successRate >= 95 ? 'Excellent' : agent.successRate >= 90 ? 'Good' : 'Needs Attention'}
                      </span>
                    </div>
                    <Progress value={agent.successRate} className="h-2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}