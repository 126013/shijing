import type { NextRequest } from 'next/server';
import { listCurated } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

/**
 * 诗词列表。响应形状与线上版本一致：{ items, total, page, pageSize }
 * 支持 q（关键词）、dynasty（朝代）、theme（题材）、author（作者）、page、pageSize。
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = listCurated({
    q: params.get('q') ?? undefined,
    dynasty: params.get('dynasty') ?? undefined,
    theme: params.get('theme') ?? undefined,
    author: params.get('author') ?? undefined,
    page: Number(params.get('page') ?? 1),
    pageSize: Number(params.get('pageSize') ?? 12),
  });

  return Response.json(result, {
    headers: { 'cache-control': 'no-store' },
  });
}
