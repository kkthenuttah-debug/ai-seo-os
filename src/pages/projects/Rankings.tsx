import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RankingRow } from "@/components/RankingRow";

const rankings = [
  { keyword: "urban gardening ideas", position: 3, change: "↑2", volume: 2400, difficulty: "Medium" },
  { keyword: "balcony composting", position: 7, change: "↓1", volume: 1300, difficulty: "Low" },
  { keyword: "greenhouse kit", position: 11, change: "↑4", volume: 900, difficulty: "High" },
];

export default function Rankings() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Keyword rankings</h3>
          <p className="text-sm text-muted-foreground">Track GSC performance changes.</p>
        </div>
        <Button>Refresh GSC data</Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input placeholder="Search keyword" className="md:max-w-sm" />
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
              <th className="px-4 py-3">Keyword</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">Search volume</th>
              <th className="px-4 py-3">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((ranking) => (
              <RankingRow key={ranking.keyword} {...ranking} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
