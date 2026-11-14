'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Meta, PageResult, PoemSummary } from '@/lib/data/types';

const PAGE_SIZE = 12;

interface ListResponse extends PageResult<PoemSummary> {
  source?: 'curated' | 'remote';
  degradedReason?: string;
}

export function LibraryBrowser({ initialMeta }: { initialMeta: Meta }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [dynasty, setDynasty] = useState('全部');
  const [theme, setTheme] = useState('不限');
  const [author, setAuthor] = useState('全部作者');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse>({
    items: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 320);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debounced, dynasty, theme, author]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (debounced) params.set('q', debounced);
    if (dynasty !== '全部') params.set('dynasty', dynasty);
    if (theme !== '不限') params.set('theme', theme);
    if (author !== '全部作者') params.set('author', author);

    try {
      const response = await fetch(`/api/poems?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = (await response.json()) as ListResponse;
      setData(json);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [author, debounced, dynasty, page, theme]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(Math.ceil(data.total / data.pageSize), 1);
  const dynastyOptions = useMemo(
    () => ['全部', ...initialMeta.dynasties.map((item) => item.name)],
    [initialMeta.dynasties],
  );
  const themeOptions = useMemo(
    () => ['不限', ...initialMeta.themes.map((item) => item.name)],
    [initialMeta.themes],
  );

  const goRandom = async () => {
    const response = await fetch('/api/poems/random', { cache: 'no-store' });
    if (!response.ok) return;
    const poem = (await response.json()) as PoemSummary;
    router.push(`/read/${poem.id}`);
  };

  return (
    <>
      <div className="filters">
        <div className="filter-row">
          <span className="filter-label">年代</span>
          {dynastyOptions.map((item) => (
            <button
              key={item}
              type="button"
              className="chip"
              data-active={dynasty === item}
              onClick={() => setDynasty(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span className="filter-label">题材</span>
          {themeOptions.map((item) => (
            <button
              key={item}
              type="button"
              className="chip"
              data-active={theme === item}
              onClick={() => setTheme(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span className="filter-label">作者</span>
          <select className="select" value={author} onChange={(event) => setAuthor(event.target.value)}>
            <option>全部作者</option>
            {AUTHORS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input
            className="search-input"
            placeholder="搜标题、作者或诗句…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="搜索诗词"
          />
          <button type="button" className="btn btn-sm" onClick={goRandom}>
            随机入一境
          </button>
        </div>
      </div>

      {data.degradedReason && (
        <p className="notice" style={{ marginBottom: 14 }}>
          {data.degradedReason}
        </p>
      )}

      <div className="result-bar">
        <span>
          共 {data.total} 首 · 第 {data.page} / {totalPages} 页
          {data.source === 'remote' ? ' · 线上全量库' : ' · 仓库精选集'}
        </span>
        <span>{loading ? '载入中…' : error ? `载入失败：${error}` : '按分幕画面与译文阅读'}</span>
      </div>

      {loading && data.items.length === 0 ? (
        <div className="poem-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="empty-state">
          <h3>此境暂无诗</h3>
          <p>换一个关键词，或把筛选放宽一些试试。</p>
        </div>
      ) : (
        <div className="poem-grid">
          {data.items.map((poem) => (
            <Link key={poem.id} className="poem-card" href={`/read/${poem.id}`}>
              <h3>{poem.title}</h3>
              <p className="author">
                {poem.dynasty} · {poem.author}
              </p>
              <p className="opening">{poem.opening}</p>
              <div className="card-foot">
                <span className="tag">{poem.theme}</span>
                <span className="tag">{poem.sceneCount} 幕</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="pager">
        <button
          type="button"
          className="btn btn-sm"
          disabled={data.page <= 1 || loading}
          onClick={() => setPage((value) => Math.max(value - 1, 1))}
        >
          ← 上一页
        </button>
        <span className="muted" style={{ fontSize: 12, letterSpacing: '0.14em' }}>
          {data.page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={data.page >= totalPages || loading}
          onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
        >
          下一页 →
        </button>
      </div>
    </>
  );
}

/** 作者下拉仅使用仓库内已有诗人，数据量小、无需额外请求 */
const AUTHORS = ['李白', '杜甫', '王维', '孟浩然', '王之涣', '柳宗元', '张继', '苏轼', '李清照', '马致远'];
