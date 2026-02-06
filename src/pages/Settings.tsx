import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Workspace settings</h2>
        <p className="text-sm text-muted-foreground">Manage global automations and alerts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Email alerts are enabled for ranking drops and publish failures.</p>
          <Button variant="outline">Edit preferences</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Current plan: Growth · 10 projects included.</p>
          <Button variant="outline">Manage plan</Button>
        </CardContent>
      </Card>
    </div>
  );
}
