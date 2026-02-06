import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink, 
  Settings, 
  Globe, 
  Key, 
  Shield, 
  AlertCircle,
  Loader2,
  Copy,
  Download,
  Trash2,
  Eye,
  EyeOff,
  BarChart3,
  MapPin
} from "lucide-react";

interface Integration {
  name: string;
  status: "connected" | "disconnected" | "error";
  connected: boolean;
  url?: string;
  lastSync?: string;
  domain?: string;
  authMethod?: string;
  errorMessage?: string;
  details?: {
    username?: string;
    siteTitle?: string;
    version?: string;
    permissions?: string[];
    syncFrequency?: string;
  };
}

const mockIntegrations: Integration[] = [
  {
    name: "WordPress",
    status: "connected",
    connected: true,
    url: "https://urbangarden.co",
    lastSync: "30 minutes ago",
    domain: "urbangarden.co",
    authMethod: "Application Password",
    details: {
      username: "admin",
      siteTitle: "Urban Garden Co",
      version: "6.4.2",
      permissions: ["publish_posts", "edit_posts", "upload_files"],
      syncFrequency: "Every 15 minutes"
    }
  },
  {
    name: "Google Search Console",
    status: "connected",
    connected: true,
    url: "https://urbangarden.co",
    lastSync: "1 hour ago",
    domain: "urbangarden.co",
    details: {
      permissions: ["search_analytics", "sitemaps"],
      syncFrequency: "Daily"
    }
  },
  {
    name: "Google Analytics",
    status: "disconnected",
    connected: false,
    domain: "urbangarden.co"
  },
  {
    name: "Google My Business",
    status: "error",
    connected: false,
    domain: "urbangarden.co",
    errorMessage: "Authentication failed. Please reconnect your account.",
    lastSync: "2 days ago"
  }
];

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [showWordPressDialog, setShowWordPressDialog] = useState(false);
  const [showGscDialog, setShowGscDialog] = useState(false);
  const [wpFormData, setWpFormData] = useState({
    siteUrl: "",
    username: "",
    applicationPassword: ""
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-gray-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="outline">Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleWordPressConnect = async () => {
    setIsConnecting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsConnecting(false);
      setShowWordPressDialog(false);
      
      // Update integration status
      setIntegrations(integrations.map(integration => 
        integration.name === "WordPress" 
          ? { 
              ...integration, 
              status: "connected", 
              connected: true,
              url: wpFormData.siteUrl,
              domain: wpFormData.siteUrl.replace('https://', '').replace('http://', ''),
              lastSync: "Just now",
              authMethod: "Application Password",
              details: {
                username: wpFormData.username,
                siteTitle: "Urban Garden Co",
                version: "6.4.2",
                permissions: ["publish_posts", "edit_posts", "upload_files"],
                syncFrequency: "Every 15 minutes"
              }
            }
          : integration
      ));
      
      // Reset form
      setWpFormData({
        siteUrl: "",
        username: "",
        applicationPassword: ""
      });
    }, 2000);
  };

  const handleWordPressDisconnect = () => {
    setIntegrations(integrations.map(integration => 
      integration.name === "WordPress" 
        ? { 
            ...integration, 
            status: "disconnected", 
            connected: false,
            url: undefined,
            lastSync: undefined,
            details: undefined
          }
        : integration
    ));
  };

  const handleGscConnect = () => {
    // Redirect to Google OAuth
    window.location.href = "https://accounts.google.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=https://www.googleapis.com/auth/webmasters.readonly&response_type=code";
  };

  const handleGscDisconnect = () => {
    setIntegrations(integrations.map(integration => 
      integration.name === "Google Search Console" 
        ? { 
            ...integration, 
            status: "disconnected", 
            connected: false,
            url: undefined,
            lastSync: undefined,
            details: undefined
          }
        : integration
    ));
  };

  const handleManualSync = (integrationName: string) => {
    setIntegrations(integrations.map(integration => 
      integration.name === integrationName 
        ? { ...integration, lastSync: "Syncing..." }
        : integration
    ));
    
    // Simulate sync
    setTimeout(() => {
      setIntegrations(integrations.map(integration => 
        integration.name === integrationName 
          ? { ...integration, lastSync: "Just now" }
          : integration
      ));
    }, 3000);
  };

  const togglePasswordVisibility = (integrationName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [integrationName]: !prev[integrationName]
    }));
  };

  const testConnection = async (integrationName: string) => {
    console.log(`Testing connection for ${integrationName}...`);
    // Implement connection test
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Project Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Manage your external service connections and sync settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync All
          </Button>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* WordPress Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                WordPress
              </CardTitle>
              {getStatusIcon(integrations[0].status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(integrations[0].status)}
            </div>
            
            {integrations[0].connected ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">WordPress URL</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{integrations[0].url}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={integrations[0].url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  
                  {integrations[0].details && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Site Title</span>
                        <span className="text-sm">{integrations[0].details.siteTitle}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">WordPress Version</span>
                        <span className="text-sm">{integrations[0].details.version}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Sync</span>
                        <span className="text-sm">{integrations[0].lastSync}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Sync Frequency</span>
                        <span className="text-sm">{integrations[0].details.syncFrequency}</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleManualSync("WordPress")}
                    className="gap-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Sync Now
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => testConnection("WordPress")}
                    className="gap-2"
                  >
                    <Shield className="h-3 w-3" />
                    Test Connection
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleWordPressDisconnect}
                    className="gap-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connect your WordPress site to automatically publish and manage content.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-medium mb-1">Setup Requirements:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>WordPress admin access</li>
                          <li>Application Password enabled</li>
                          <li>XML-RPC API enabled</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setShowWordPressDialog(true)}
                  className="w-full gap-2"
                >
                  <Key className="h-4 w-4" />
                  Connect WordPress
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Google Search Console Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Google Search Console
              </CardTitle>
              {getStatusIcon(integrations[1].status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(integrations[1].status)}
            </div>
            
            {integrations[1].connected ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Site URL</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{integrations[1].url}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Data Sync</span>
                    <span className="text-sm">{integrations[1].lastSync}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sync Frequency</span>
                    <span className="text-sm">Daily</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Permissions</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">Analytics</Badge>
                      <Badge variant="outline" className="text-xs">Sitemaps</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleManualSync("Google Search Console")}
                    className="gap-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Sync Now
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => testConnection("Google Search Console")}
                    className="gap-2"
                  >
                    <Shield className="h-3 w-3" />
                    Test Connection
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleGscDisconnect}
                    className="gap-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connect Google Search Console to track keyword rankings and site performance.
                  </p>
                  {integrations[1].errorMessage && (
                    <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div className="text-sm text-red-800 dark:text-red-300">
                          <p className="font-medium mb-1">Connection Error:</p>
                          <p>{integrations[1].errorMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={handleGscConnect}
                  className="w-full gap-2"
                >
                  <Key className="h-4 w-4" />
                  Authorize with Google
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Google Analytics Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Google Analytics
              </CardTitle>
              {getStatusIcon(integrations[2].status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(integrations[2].status)}
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect Google Analytics to track website traffic and user behavior.
              </p>
            </div>
            
            <Button className="w-full gap-2">
              <Key className="h-4 w-4" />
              Connect Google Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Google My Business Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Google My Business
              </CardTitle>
              {getStatusIcon(integrations[3].status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(integrations[3].status)}
            </div>
            
            {integrations[3].errorMessage && (
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800 dark:text-red-300">
                    <p className="font-medium mb-1">Connection Error:</p>
                    <p>{integrations[3].errorMessage}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Manage your Google My Business listing and local search presence.
              </p>
            </div>
            
            <Button className="w-full gap-2">
              <Key className="h-4 w-4" />
              Connect Google My Business
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* WordPress Connection Dialog */}
      <Dialog open={showWordPressDialog} onOpenChange={setShowWordPressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect WordPress Site</DialogTitle>
            <DialogDescription>
              Enter your WordPress site details to establish a secure connection.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteUrl">WordPress Site URL</Label>
              <Input
                id="siteUrl"
                placeholder="https://yoursite.com"
                value={wpFormData.siteUrl}
                onChange={(e) => setWpFormData(prev => ({ ...prev, siteUrl: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="admin"
                value={wpFormData.username}
                onChange={(e) => setWpFormData(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="applicationPassword">Application Password</Label>
              <div className="relative">
                <Input
                  id="applicationPassword"
                  type={showPasswords.wordpress ? "text" : "password"}
                  placeholder="abcd efgh ijkl mnop"
                  value={wpFormData.applicationPassword}
                  onChange={(e) => setWpFormData(prev => ({ ...prev, applicationPassword: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => togglePasswordVisibility('wordpress')}
                >
                  {showPasswords.wordpress ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Generate an application password in your WordPress profile settings.
              </p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">Security Note:</p>
                  <p>Your credentials are encrypted and stored securely. We only store the minimum permissions needed.</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWordPressDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleWordPressConnect}
              disabled={isConnecting || !wpFormData.siteUrl || !wpFormData.username || !wpFormData.applicationPassword}
              className="gap-2"
            >
              {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
              Connect Site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}