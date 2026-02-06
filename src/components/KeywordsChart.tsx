import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface KeywordsData {
  keyword: string;
  position: number;
  volume: number;
  difficulty: number;
  clicks: number;
}

interface KeywordsChartProps {
  data: KeywordsData[];
}

export function KeywordsChart({ data }: KeywordsChartProps) {
  const getPositionColor = (position: number) => {
    if (position <= 3) return "#10b981"; // green
    if (position <= 10) return "#3b82f6"; // blue
    if (position <= 20) return "#f59e0b"; // yellow
    return "#6b7280"; // gray
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium mb-2">{data.keyword}</p>
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground">Position: <span className="text-foreground font-medium">#{data.position}</span></p>
            <p className="text-muted-foreground">Volume: <span className="text-foreground font-medium">{data.volume.toLocaleString()}/mo</span></p>
            <p className="text-muted-foreground">Difficulty: <span className="text-foreground font-medium">{data.difficulty}%</span></p>
            <p className="text-muted-foreground">Clicks: <span className="text-foreground font-medium">{data.clicks}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatKeyword = (keyword: string) => {
    return keyword.split(' ').slice(0, 2).join(' ');
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="keyword" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10 }}
            tickFormatter={formatKeyword}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            domain={[0, 50]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="position" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getPositionColor(entry.position)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span>Top 3</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span>Top 10</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500"></div>
          <span>Top 20</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-500"></div>
          <span>20+</span>
        </div>
      </div>
    </div>
  );
}