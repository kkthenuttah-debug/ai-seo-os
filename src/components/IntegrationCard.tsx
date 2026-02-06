import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";

interface IntegrationCardProps {
  name: string;
  status: string;
  connected: boolean;
  url?: string;
  lastSync?: string;
  domain?: string;
  details?: {
    username?: string;
    siteTitle?: string;
    version?: string;
    permissions?: string[];
    syncFrequency?: string;
  };
}

export function IntegrationCard({
  name,
  status,
  connected,
  url,
  lastSync,
  domain,
  details
}: IntegrationCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="text-xs">Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-sm font-medium">{name}</span>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {connected ? (
          <div className="space-y-2">
            {url && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">URL:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs">{url}</span>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
            {details?.username && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Username:</span>
                <span className="text-xs">{details.username}</span>
              </div>
            )}
            {details?.version && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version:</span>
                <span className="text-xs">{details.version}</span>
              </div>
            )}
            {lastSync && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Sync:</span>
                <span className="text-xs">{lastSync}</span>
              </div>
            )}
            {details?.syncFrequency && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sync Frequency:</span>
                <span className="text-xs">{details.syncFrequency}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {name} integration is not connected.
          </p>
        )}
        
        <div className="flex gap-2 pt-2">
          {connected ? (
            <>
              <Button size="sm" variant="outline" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync
              </Button>
              <Button size="sm" variant="destructive" className="text-xs">
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" className="text-xs">
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
