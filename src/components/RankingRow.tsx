interface RankingRowProps {
  keyword: string;
  position: number;
  change: string;
  volume: number;
  difficulty: string;
}

export function RankingRow({ keyword, position, change, volume, difficulty }: RankingRowProps) {
  return (
    <tr className="border-b">
      <td className="px-4 py-3 text-sm font-medium">{keyword}</td>
      <td className="px-4 py-3 text-sm">{position}</td>
      <td className="px-4 py-3 text-sm">{change}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{volume}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{difficulty}</td>
    </tr>
  );
}
