import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageItem } from "@/components/PageItem";

const pages = [
  {
    title: "Urban Gardening Basics",
    slug: "/urban-gardening-basics",
    status: "Published",
    published: "Mar 2, 2024",
    created: "Feb 25, 2024",
  },
  {
    title: "Balcony Composting Tips",
    slug: "/balcony-composting",
    status: "Draft",
    published: "-",
    created: "Mar 1, 2024",
  },
];

export default function Pages() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pages</h3>
          <p className="text-sm text-muted-foreground">All content produced for this project.</p>
        </div>
        <Button>Create page</Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input placeholder="Search by title" className="md:max-w-sm" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Filter
          </Button>
          <Button variant="outline" size="sm">
            Sort
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <PageItem key={page.slug} {...page} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing 1-2 of 12 pages</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            Previous
          </Button>
          <Button size="sm" variant="outline">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
