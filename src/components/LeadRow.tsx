import { Button } from "@/components/ui/button";

interface LeadRowProps {
  name: string;
  email: string;
  phone: string;
  source: string;
  captured: string;
}

export function LeadRow({ name, email, phone, source, captured }: LeadRowProps) {
  return (
    <tr className="border-b">
      <td className="px-4 py-3 text-sm font-medium">{name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{email}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{phone}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{source}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{captured}</td>
      <td className="px-4 py-3 text-sm">
        <Button size="sm" variant="ghost">
          Delete
        </Button>
      </td>
    </tr>
  );
}
