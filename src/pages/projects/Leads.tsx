import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadRow } from "@/components/LeadRow";

const leads = [
  {
    name: "Sarah Kim",
    email: "sarah@urbangarden.co",
    phone: "(555) 231-9021",
    source: "/urban-gardening-basics",
    captured: "Mar 3, 2024",
  },
  {
    name: "Marcus Lee",
    email: "marcus@urbangarden.co",
    phone: "(555) 118-2321",
    source: "/balcony-composting",
    captured: "Mar 1, 2024",
  },
];

export default function Leads() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leads</h3>
          <p className="text-sm text-muted-foreground">Manage captured leads from content.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export CSV</Button>
          <Button>Filter date range</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input placeholder="Search name or email" className="md:max-w-sm" />
        <Button variant="outline" size="sm">
          More filters
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Source page</th>
              <th className="px-4 py-3">Captured</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <LeadRow key={lead.email} {...lead} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
