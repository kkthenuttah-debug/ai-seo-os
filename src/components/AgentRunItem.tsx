import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Bot, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  Copy,
  Download,
  RotateCcw
} from "lucide-react";

interface AgentRunItemProps {
  id: string;
  agent: string;
  status: "running" | "completed" | "failed";
  duration: string;
  summary: string;
  timestamp: string;
  inputSize?: string;
  outputSize?: string;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
}

export function AgentRunItem({ 
  id, 
  agent, 
  status, 
  duration, 
  summary, 
  timestamp,
  inputSize,
  outputSize,
  inputData,
  outputData,
  errorMessage
}: AgentRunItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = () => {
    switch (status) {
      case 'running':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getAgentIcon = () => {
    return <Bot className="h-4 w-4" />;
  };

  const handleCopyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const handleDownload = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRetry = () => {
    // This would typically trigger a retry of the failed job
    console.log('Retry job:', id);
  };

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {getAgentIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{agent}</span>
                <Badge variant={getStatusBadgeVariant()} className="text-xs">
                  {status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{duration}</span>
                <span>•</span>
                <span>{timestamp}</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {summary}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {inputSize && (
                <span>Input: {inputSize}</span>
              )}
              {outputSize && (
                <span>Output: {outputSize}</span>
              )}
            </div>
            
            {isExpanded && (inputData || outputData) && (
              <div className="mt-4 pt-4 border-t space-y-3">
                {inputData && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Input Data</span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => handleCopyToClipboard(inputData)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDownload(inputData, `${agent}-input.json`)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                      {JSON.stringify(inputData, null, 2)}
                    </pre>
                  </div>
                )}
                
                {outputData && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Output Data</span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => handleCopyToClipboard(outputData)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDownload(outputData, `${agent}-output.json`)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                      {JSON.stringify(outputData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {status === 'failed' && errorMessage && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-600 dark:text-red-400">
                <strong>Error:</strong> {errorMessage}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
            
            {(inputData || outputData) && (
              <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <span className="sr-only">View details</span>
                    <div className="h-1 w-1 bg-current rounded-full" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{agent} - Job Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Status Information</h4>
                        <div className="space-y-1 text-sm">
                          <div>Status: <Badge variant={getStatusBadgeVariant()}>{status}</Badge></div>
                          <div>Duration: {duration}</div>
                          <div>Timestamp: {timestamp}</div>
                          {inputSize && <div>Input Size: {inputSize}</div>}
                          {outputSize && <div>Output Size: {outputSize}</div>}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Actions</h4>
                        <div className="space-y-2">
                          {status === 'failed' && (
                            <Button variant="outline" size="sm" onClick={handleRetry}>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Retry Job
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {inputData && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Input Data</h4>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCopyToClipboard(inputData)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownload(inputData, `${agent}-input.json`)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                        <pre className="text-xs bg-muted p-4 rounded max-h-96 overflow-y-auto">
                          {JSON.stringify(inputData, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {outputData && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Output Data</h4>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCopyToClipboard(outputData)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownload(outputData, `${agent}-output.json`)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                        <pre className="text-xs bg-muted p-4 rounded max-h-96 overflow-y-auto">
                          {JSON.stringify(outputData, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {errorMessage && (
                      <div>
                        <h4 className="font-medium mb-2 text-red-600">Error Message</h4>
                        <div className="text-sm bg-red-50 dark:bg-red-950/20 p-4 rounded">
                          {errorMessage}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
