import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface IntegrationCardProps {
  title: string;
  status: string;
  details: string[];
  primaryAction: string;
  secondaryAction?: string;
}

export function IntegrationCard({
  title,
  status,
  details,
  primaryAction,
  secondaryAction,
}: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-xs font-medium text-muted-foreground">{status}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1 text-sm text-muted-foreground">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button size="sm">{primaryAction}</Button>
          {secondaryAction ? (
            <Button size="sm" variant="outline">
              {secondaryAction}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
