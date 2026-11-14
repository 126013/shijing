import { curatedAuthors } from '@/lib/data/repository';
import { poets } from '@/data/poets';

export const dynamic = 'force-dynamic';

/** 诗人名录与行迹节点（示意坐标，非地理坐标）。 */
export async function GET() {
  return Response.json(
    {
      items: poets.map((poet) => ({
        id: poet.id,
        name: poet.name,
        dynasty: poet.dynasty,
        years: poet.years,
        birthplace: poet.birthplace,
        coord: poet.coord,
        poemCount: poet.poemIds.length,
      })),
      authors: curatedAuthors(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
