import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IntegrationCard } from "@/components/IntegrationCard";

export default function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Integrations</h3>
        <p className="text-sm text-muted-foreground">Manage external services powering automation.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <IntegrationCard
          title="WordPress"
          status="Connected"
          details={["Domain: urbangarden.co", "Last sync: 2 hours ago"]}
          primaryAction="Test connection"
          secondaryAction="Disconnect"
        />
        <IntegrationCard
          title="Google Search Console"
          status="Connected"
          details={["Site URL: https://urbangarden.co", "Last sync: 1 hour ago"]}
          primaryAction="Sync now"
          secondaryAction="Disconnect"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connect a new integration</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline">Add WordPress credentials</Button>
          <Button variant="outline">Start GSC OAuth flow</Button>
        </CardContent>
      </Card>
    </div>
  );
}
