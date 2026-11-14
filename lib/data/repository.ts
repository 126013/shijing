import { poems as curatedPoems } from '@/data/poems';
import { poets } from '@/data/poets';
import type {
  Meta,
  Motif,
  PageResult,
  Palette,
  Poem,
  PoemQuery,
  PoemSummary,
  Scene,
} from '@/lib/data/types';

const API_BASE = (process.env.POETRY_API_BASE ?? '').trim().replace(/\/+$/, '');
const REMOTE_TIMEOUT_MS = 2500;
const CACHE_TTL_MS = 60_000;

/** ---------- 纯函数：可被单元测试直接覆盖 ---------- */

export function summarize(poem: Poem): PoemSummary {
  return {
    id: poem.id,
    title: poem.title,
    author: poem.author,
    dynasty: poem.dynasty,
    theme: poem.theme,
    collection: poem.collection,
    opening: poem.scenes[0]?.lines.join('') ?? '',
    sceneCount: poem.scenes.length,
    place: poem.place,
  };
}

/** 关键词命中标题、作者、诗句、译文、题材与标签 */
export function matchesQuery(poem: Poem, q: string): boolean {
  const key = q.trim().toLowerCase();
  if (!key) return true;
  const haystack = [
    poem.title,
    poem.author,
    poem.dynasty,
    poem.theme,
    poem.collection,
    poem.place ?? '',
    ...poem.tags,
    ...poem.scenes.flatMap((scene) => [...scene.lines, scene.translation]),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(key);
}

export function filterPoems(list: Poem[], query: PoemQuery): Poem[] {
  return list.filter((poem) => {
    if (query.dynasty && query.dynasty !== '全部' && poem.dynasty !== query.dynasty) return false;
    if (query.theme && query.theme !== '不限' && poem.theme !== query.theme) return false;
    if (query.author && query.author !== '全部作者' && poem.author !== query.author) return false;
    if (query.q && !matchesQuery(poem, query.q)) return false;
    return true;
  });
}

export function paginate<T>(list: T[], page: number, pageSize: number): PageResult<T> {
  const safeSize = Math.min(Math.max(Math.trunc(pageSize) || 12, 1), 60);
  const totalPages = Math.max(Math.ceil(list.length / safeSize), 1);
  const safePage = Math.min(Math.max(Math.trunc(page) || 1, 1), totalPages);
  const start = (safePage - 1) * safeSize;
  return {
    items: list.slice(start, start + safeSize),
    total: list.length,
    page: safePage,
    pageSize: safeSize,
  };
}

const PALETTES: Palette[] = ['jade', 'indigo', 'gold', 'frost', 'ember', 'ink'];
const MOTIF_POOL: Motif[][] = [
  ['mountain', 'moon'],
  ['river', 'boat'],
  ['forest', 'rain'],
  ['autumn', 'desert'],
  ['snow', 'mountain'],
  ['spring', 'lake'],
];

/**
 * 线上全量数据只有诗句数组，没有分幕信息时，按每两句一幕自动拆分，
 * 并给出可复现的色板与母题，保证详情页仍能正常渲染。
 */
export function buildScenesFromLines(poemId: string, lines: string[]): Scene[] {
  const cleaned = lines.map((line) => line.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return [
      {
        id: `${poemId}-1`,
        index: 1,
        lines: ['（此诗正文暂未收录）'],
        translation: '线上数据源未返回该诗的正文。',
        prompt: '空旷的山谷与雾气，留白为主。',
        motifs: ['mountain'],
        palette: 'ink',
      },
    ];
  }
  const scenes: Scene[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    const index = scenes.length + 1;
    const seed = (poemId.length + index) % PALETTES.length;
    scenes.push({
      id: `${poemId}-${index}`,
      index,
      lines: cleaned.slice(i, i + 2),
      translation: '（该诗来自线上全量库，暂无逐句译文）',
      prompt: '依据诗句意境生成的中国山水画面。',
      motifs: MOTIF_POOL[seed % MOTIF_POOL.length],
      palette: PALETTES[seed],
    });
  }
  return scenes;
}

/** ---------- 精选集查询 ---------- */

export function listCurated(query: PoemQuery): PageResult<PoemSummary> {
  const filtered = filterPoems(curatedPoems, query);
  const paged = paginate(filtered, query.page ?? 1, query.pageSize ?? 12);
  return { ...paged, items: paged.items.map(summarize) };
}

export function getCuratedPoem(id: string): Poem | undefined {
  return curatedPoems.find((poem) => poem.id === id);
}

export function curatedMeta(): Meta {
  const count = <T extends string>(key: (poem: Poem) => T) => {
    const map = new Map<T, number>();
    for (const poem of curatedPoems) map.set(key(poem), (map.get(key(poem)) ?? 0) + 1);
    return [...map.entries()]
      .map(([name, value]) => ({ name, count: value }))
      .sort((a, b) => b.count - a.count);
  };
  return {
    total: curatedPoems.length,
    dynasties: count((poem) => poem.dynasty),
    themes: count((poem) => poem.theme),
    collections: count((poem) => poem.collection),
    source: 'curated',
  };
}

export function curatedAuthors(): { name: string; dynasty: string; count: number }[] {
  return poets
    .map((poet) => ({ name: poet.name, dynasty: poet.dynasty, count: poet.poemIds.length }))
    .sort((a, b) => b.count - a.count);
}

/** ---------- 可选远程数据源 ---------- */

type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();

async function fetchJson(path: string): Promise<unknown | null> {
  if (!API_BASE) return null;
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const value = (await response.json()) as unknown;
    cache.set(path, { value, expires: Date.now() + CACHE_TTL_MS });
    return value;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** 把线上列表项收敛成仓库内统一的 PoemSummary 形状 */
export function normalizeRemoteSummary(raw: unknown): PoemSummary | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = asString(record.id) || asString(record._id);
  const title = asString(record.title) || asString(record.rhythmic);
  if (!id || !title) return null;
  const lines = asStringArray(record.lines);
  return {
    id,
    title,
    author: asString(record.author, '佚名'),
    dynasty: asString(record.dynasty, '未知') as PoemSummary['dynasty'],
    theme: asString(record.theme, '未分类'),
    collection: asString(record.collection, '全唐诗'),
    opening: asString(record.opening) || lines[0] || '',
    sceneCount: lines.length > 0 ? Math.ceil(lines.length / 2) : 1,
    place: asString(record.place) || undefined,
  };
}

export function normalizeRemotePoem(raw: unknown): Poem | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = asString(record.id) || asString(record._id);
  const title = asString(record.title) || asString(record.rhythmic);
  if (!id || !title) return null;
  const lineSource = asStringArray(record.lines).length
    ? asStringArray(record.lines)
    : asString(record.content)
        .split(/[\n，。！？；]/)
        .map((piece) => piece.trim())
        .filter(Boolean);
  return {
    id,
    title,
    author: asString(record.author, '佚名'),
    dynasty: asString(record.dynasty, '未知') as Poem['dynasty'],
    theme: asString(record.theme, '未分类'),
    collection: asString(record.collection, '全唐诗'),
    tags: asStringArray(record.tags),
    place: asString(record.place) || undefined,
    scenes: buildScenesFromLines(id, lineSource),
  };
}

export interface ListedPoems extends PageResult<PoemSummary> {
  source: Meta['source'];
  degradedReason?: string;
}

export async function listPoems(query: PoemQuery): Promise<ListedPoems> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && `${value}` !== '') params.set(key, `${value}`);
  }
  const remote = await fetchJson(`/api/poems?${params.toString()}`);
  const record = asRecord(remote);
  if (record && Array.isArray(record.items)) {
    const items = record.items.map(normalizeRemoteSummary).filter((item): item is PoemSummary => !!item);
    if (items.length > 0) {
      return {
        items,
        total: typeof record.total === 'number' ? record.total : items.length,
        page: typeof record.page === 'number' ? record.page : (query.page ?? 1),
        pageSize: typeof record.pageSize === 'number' ? record.pageSize : (query.pageSize ?? 12),
        source: 'remote',
      };
    }
  }
  const local = listCurated(query);
  return {
    ...local,
    source: 'curated',
    degradedReason: API_BASE ? '线上诗词接口当前不可用，已回到仓库内置精选集。' : undefined,
  };
}

export async function getPoem(id: string): Promise<{ poem: Poem | null; source: Meta['source'] }> {
  const local = getCuratedPoem(id);
  const remote = await fetchJson(`/api/poems/${encodeURIComponent(id)}`);
  const remotePoem = normalizeRemotePoem(remote);
  if (remotePoem) return { poem: remotePoem, source: 'remote' };
  if (local) return { poem: local, source: 'curated' };
  return { poem: null, source: API_BASE ? 'remote' : 'curated' };
}

export async function randomPoemId(excludeId?: string): Promise<string | null> {
  const pool = curatedPoems.filter((poem) => poem.id !== excludeId);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export async function getMeta(): Promise<Meta> {
  const local = curatedMeta();
  const remote = await fetchJson('/api/meta');
  const record = asRecord(remote);
  if (record && typeof record.total === 'number' && record.total > 0) {
    return {
      ...local,
      total: record.total,
      source: 'remote',
    };
  }
  return {
    ...local,
    degradedReason: API_BASE ? '线上诗词接口当前不可用，统计为仓库内置精选集。' : undefined,
  };
}

export { poets };
