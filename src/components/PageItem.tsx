import { Button } from "@/components/ui/button";

interface PageItemProps {
  title: string;
  slug: string;
  status: string;
  published: string;
  created: string;
}

export function PageItem({ title, slug, status, published, created }: PageItemProps) {
  return (
    <tr className="border-b">
      <td className="px-4 py-3 text-sm font-medium">{title}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{slug}</td>
      <td className="px-4 py-3 text-sm">{status}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{published}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{created}</td>
      <td className="px-4 py-3 text-sm">
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            View
          </Button>
          <Button size="sm" variant="ghost">
            Edit
          </Button>
        </div>
      </td>
    </tr>
  );
}
