'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  deleteFilm,
  formatDuration,
  formatSize,
  isStorageSupported,
  listFilms,
  loadFilmBlob,
  type FilmMeta,
} from '@/lib/storage/videos';

export function VideoGallery() {
  const [films, setFilms] = useState<FilmMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeFilmId, setActiveFilmId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!isStorageSupported()) {
      setSupported(false);
      setLoading(false);
      return;
    }
    try {
      setFilms(await listFilms());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取本地影片库失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const play = async (film: FilmMeta) => {
    const blob = await loadFilmBlob(film.id);
    if (!blob) {
      setError('找不到这部影片的文件，可能已被浏览器清理。');
      return;
    }
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    const url = URL.createObjectURL(blob);
    setActiveUrl(url);
    setActiveFilmId(film.id);
    setError('');
  };

  const download = async (film: FilmMeta) => {
    const blob = await loadFilmBlob(film.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `诗境·${film.poemTitle}.${film.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const remove = async (film: FilmMeta) => {
    await deleteFilm(film.id);
    if (activeFilmId === film.id) {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
      setActiveUrl(null);
      setActiveFilmId(null);
    }
    void refresh();
  };

  if (!supported) {
    return (
      <div className="empty-state">
        <h3>这个浏览器不支持本地影片库</h3>
        <p>影片保存在浏览器的 IndexedDB 里，需要桌面版 Chrome / Edge / Firefox 等支持 IndexedDB 的浏览器。</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="gallery-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="skeleton" />
        ))}
      </div>
    );
  }

  if (films.length === 0) {
    return (
      <div className="empty-state">
        <h3>影片馆还是空的</h3>
        <p>
          打开任意一首诗，点右上角的「生成短片」，逐幕画面与配乐会在你的浏览器里合成一部 WebM 短片，
          保存在这里随时回看、下载。
        </p>
        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-gold" href="/library">
            去书库挑一首 →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="notice" style={{ marginBottom: 16 }}>
          {error}
        </p>
      )}
      <div className="gallery-grid">
        {films.map((film) => (
          <article key={film.id} className="film-card">
            <h3>《{film.poemTitle}》</h3>
            <p className="film-meta">
              <span>
                {film.dynasty} · {film.author}
              </span>
              <span>{formatDuration(film.durationMs)}</span>
              <span>{formatSize(film.size)}</span>
              <span>{film.sceneCount} 幕</span>
            </p>
            <p className="film-meta">
              <span>{new Date(film.createdAt).toLocaleString('zh-CN')}</span>
              {film.hasVoice ? <span>含朗读</span> : <span>字幕配乐版</span>}
            </p>
            {activeFilmId === film.id && activeUrl && (
              <video className="film-player" src={activeUrl} controls autoPlay playsInline />
            )}
            <div className="film-actions">
              <button type="button" className="btn btn-sm" onClick={() => void play(film)}>
                {activeFilmId === film.id ? '重新播放' : '▶ 回看'}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => void download(film)}>
                ↓ 下载
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ color: 'var(--danger)' }}
                onClick={() => void remove(film)}
              >
                删除
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
