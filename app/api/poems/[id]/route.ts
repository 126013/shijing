import { getCuratedPoem } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

/** 单首详情：返回分幕（scenes）与首句，供阅读页与短片合成使用。 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poem = getCuratedPoem(id);
  if (!poem) {
    return Response.json({ error: 'poem_not_found', id }, { status: 404 });
  }
  return Response.json(
    { ...poem, opening: poem.scenes[0]?.lines.join('') ?? '' },
    { headers: { 'cache-control': 'no-store' } },
  );
}
