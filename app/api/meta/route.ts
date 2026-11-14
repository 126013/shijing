import { getMeta } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

/** 统计信息：总量、朝代、题材、合集分布，以及当前数据源（精选集 / 线上全量）。 */
export async function GET() {
  const meta = await getMeta();
  return Response.json(meta, { headers: { 'cache-control': 'no-store' } });
}
