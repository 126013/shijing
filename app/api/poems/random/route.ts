import type { NextRequest } from 'next/server';
import { getCuratedPoem, randomPoemId, summarize } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

/** 随机入一境：返回一首诗的摘要，供首页「随机入一境」跳转。 */
export async function GET(request: NextRequest) {
  const exclude = request.nextUrl.searchParams.get('exclude') ?? undefined;
  const id = await randomPoemId(exclude);
  if (!id) {
    return Response.json({ error: 'no_poem_available' }, { status: 404 });
  }
  const poem = getCuratedPoem(id);
  if (!poem) {
    return Response.json({ error: 'no_poem_available' }, { status: 404 });
  }
  return Response.json(summarize(poem), { headers: { 'cache-control': 'no-store' } });
}
