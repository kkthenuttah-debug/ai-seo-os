import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
import { integrationsService, type IntegrationFromApi } from "@/services/integrations";
import { formatDistanceToNow } from "date-fns";
import { useNotification } from "@/hooks/useNotification";

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

const DEFAULT_INTEGRATION: Integration = {
  name: "",
  status: "disconnected",
  connected: false,
};

function mapIntegration(i: IntegrationFromApi): Integration {
  const name = i.type === "wordpress" ? "WordPress" : i.type === "gsc" ? "Google Search Console" : i.type;
  const connected = i.status === "active";
  const status: Integration["status"] = i.status === "active" ? "connected" : i.status === "error" ? "error" : "disconnected";
  const data = (i.data || {}) as Record<string, unknown>;
  return {
    name,
    status,
    connected,
    url: data.site_url as string | undefined,
    lastSync: i.last_sync_at ? formatDistanceToNow(new Date(i.last_sync_at), { addSuffix: true }) : undefined,
    domain: data.site_url ? String(data.site_url).replace(/^https?:\/\//, "").split("/")[0] : undefined,
    authMethod: i.type === "wordpress" ? "Application Password" : undefined,
    details: i.type === "wordpress" ? { username: data.username as string } : undefined,
  };
}

export default function Integrations() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [gscDomainAlert, setGscDomainAlert] = useState(false);
  const { showError, notifySuccess } = useNotification();

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    integrationsService
      .list(projectId)
      .then((data) => {
        if (!cancelled) setIntegrations(Array.isArray(data) ? data.map(mapIntegration) : []);
      })
      .catch((err) => {
        if (!cancelled) showError(err instanceof Error ? err.message : "Failed to load integrations");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId, showError]);

  useEffect(() => {
    const gsc = searchParams.get("gsc");
    if (gsc !== "success" && gsc !== "error") return;
    if (!projectId) return;
    if (gsc === "success") {
      notifySuccess("Google Search Console connected.");
      integrationsService.list(projectId).then((data) => {
        setIntegrations(Array.isArray(data) ? data.map(mapIntegration) : []);
      });
    } else {
      const msg = searchParams.get("message");
      if (msg) showError(decodeURIComponent(msg));
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("gsc");
      next.delete("message");
      return next;
    }, { replace: true });
  }, [projectId, searchParams, setSearchParams, notifySuccess, showError]);
  const [showWordPressDialog, setShowWordPressDialog] = useState(false);
  const [showGscDialog, setShowGscDialog] = useState(false);
  const [wpFormData, setWpFormData] = useState({
    siteUrl: "",
    username: "",
    applicationPassword: ""
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});

  const getStatusIcon = (status: string | undefined) => {
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

  const getStatusBadge = (status: string | undefined) => {
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
    if (!projectId) return;
    setIsConnecting(true);
    try {
      await integrationsService.connectWordPress(projectId, {
        siteUrl: wpFormData.siteUrl,
        username: wpFormData.username,
        applicationPassword: wpFormData.applicationPassword,
      });
      setShowWordPressDialog(false);
      setWpFormData({ siteUrl: "", username: "", applicationPassword: "" });
      const data = await integrationsService.list(projectId);
      setIntegrations(Array.isArray(data) ? data.map(mapIntegration) : []);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to connect WordPress");
    } finally {
      setIsConnecting(false);
    }
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

  const handleGscConnect = async () => {
    if (!projectId) return;
    setIsConnecting(true);
    try {
      const { url } = await integrationsService.connectGsc(projectId);
      if (url) window.location.href = url;
      else showError("No authorization URL returned");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to start Google authorization");
    } finally {
      setIsConnecting(false);
    }
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

  const handleManualSync = async (integrationName: string) => {
    if (!projectId) return;
    if (integrationName === "Google Search Console") {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.name === integrationName ? { ...i, lastSync: "Syncing..." } : i
        )
      );
      try {
        await integrationsService.syncGsc(projectId);
                setGscDomainAlert(false);
                const data = await integrationsService.list(projectId);
                setIntegrations(Array.isArray(data) ? data.map(mapIntegration) : []);
              } catch (err) {
                const msg = err instanceof Error ? err.message : "GSC sync failed";
                const isDomainNotSet = msg.includes("No GSC property URL") && msg.includes("Set your project domain");
                if (isDomainNotSet) {
                  setGscDomainAlert(true);
                  showError("Set your project domain in Project Settings, then try Sync again.");
                } else {
                  if (msg.includes("No verified") || msg.includes("verification") || msg.includes("verify")) {
                    setGscDomainAlert(true);
                  }
                  showError(msg);
                }
                const data = await integrationsService.list(projectId);
                setIntegrations(Array.isArray(data) ? data.map(mapIntegration) : []);
              }
      return;
    }
    setIntegrations((prev) =>
      prev.map((i) =>
        i.name === integrationName ? { ...i, lastSync: "Syncing..." } : i
      )
    );
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.name === integrationName ? { ...i, lastSync: "Just now" } : i
        )
      );
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

  const wp = integrations.find((i) => i.name === "WordPress") ?? DEFAULT_INTEGRATION;
  const gsc = integrations.find((i) => i.name === "Google Search Console") ?? DEFAULT_INTEGRATION;
  const ga = integrations.find((i) => i.name === "Google Analytics") ?? DEFAULT_INTEGRATION;
  const gmb = integrations.find((i) => i.name === "Google My Business") ?? DEFAULT_INTEGRATION;

  const safeStatus = (i: Integration) => i?.status ?? "disconnected";

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
              {getStatusIcon(safeStatus(wp))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(safeStatus(wp))}
            </div>
            
            {wp.connected ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">WordPress URL</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{wp.url}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={wp.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  
                  {wp.details && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Site Title</span>
                        <span className="text-sm">{wp.details.siteTitle}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">WordPress Version</span>
                        <span className="text-sm">{wp.details.version}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Sync</span>
                        <span className="text-sm">{wp.lastSync}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Sync Frequency</span>
                        <span className="text-sm">{wp.details.syncFrequency}</span>
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
              {getStatusIcon(safeStatus(gsc))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(safeStatus(gsc))}
            </div>
            
            {gsc.connected ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Property URL</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{gsc.url || "Uses project domain"}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    GSC uses your project domain (Project Settings). When you sync, we add the property to Search Console via the API if needed; you only need to complete verification once in GSC (DNS, HTML file, or meta tag).
                  </p>
                  {gscDomainAlert && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          <p className="font-medium mb-1">Set your project domain to sync</p>
                          <p className="mb-2">Set your project domain in Project Settings. We add the property to Search Console via the API when you sync; complete verification once in Google Search Console (DNS, HTML file, or meta tag). If you connected GSC before, disconnect and reconnect so we can add your property automatically.</p>
                          <Button variant="outline" size="sm" asChild className="gap-1">
                            <Link to={`/app/projects/${projectId}/settings`} onClick={() => setGscDomainAlert(false)}>
                              Go to Project Settings
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Data Sync</span>
                    <span className="text-sm">{gsc.lastSync}</span>
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
                  {gsc.errorMessage && (
                    <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div className="text-sm text-red-800 dark:text-red-300">
                          <p className="font-medium mb-1">Connection Error:</p>
                          <p>{gsc.errorMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={handleGscConnect}
                  className="w-full gap-2"
                  disabled={isConnecting}
                >
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  {isConnecting ? "Redirecting..." : "Authorize with Google"}
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
              {getStatusIcon(safeStatus(ga))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(safeStatus(ga))}
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
              {getStatusIcon(safeStatus(gmb))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(safeStatus(gmb))}
            </div>
            
            {gmb.errorMessage && (
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800 dark:text-red-300">
                    <p className="font-medium mb-1">Connection Error:</p>
                    <p>{gmb.errorMessage}</p>
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