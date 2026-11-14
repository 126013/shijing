'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SceneStage } from '@/components/scene/SceneStage';
import type { Poem } from '@/lib/data/types';
import { Narrator, detectTts, listVoices, type TtsProvider } from '@/lib/speech/tts';
import { saveFilm } from '@/lib/storage/videos';
import { composeFilm, isComposeSupported, sceneDuration } from '@/lib/video/recorder';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function Reader({ poem, source }: { poem: Poem; source: 'curated' | 'remote' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [rate, setRate] = useState(0.9);
  const [voiceName, setVoiceName] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [provider, setProvider] = useState<TtsProvider>('web-speech');
  const [providerNote, setProviderNote] = useState('正在检测朗读音源…');
  const [exporting, setExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState('');
  const [exportNote, setExportNote] = useState('');
  const [savedFilmId, setSavedFilmId] = useState<string | null>(null);

  const narratorRef = useRef<Narrator | null>(null);
  const abortRef = useRef(false);
  const activeRef = useRef(0);

  const scenes = poem.scenes;
  const activeScene = scenes[Math.min(activeIndex, scenes.length - 1)];

  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    narratorRef.current = new Narrator();
    let mounted = true;
    void detectTts().then((status) => {
      if (!mounted) return;
      setProvider(status.provider);
      setProviderNote(
        status.provider === 'doubao'
          ? '音源：豆包语音合成'
          : status.provider === 'web-speech'
            ? '音源：浏览器内置朗读（未配置豆包 TTS）'
            : '当前浏览器不支持语音朗读，可继续阅读画面与文字',
      );
      narratorRef.current?.setProvider(status.provider);
    });

    const syncVoices = () => setVoices(listVoices());
    syncVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = syncVoices;
    }

    return () => {
      mounted = false;
      abortRef.current = true;
      narratorRef.current?.abort();
    };
  }, []);

  const stopPlayback = useCallback(() => {
    abortRef.current = true;
    narratorRef.current?.abort();
    setPlaying(false);
  }, []);

  const speakScene = useCallback(
    async (index: number) => {
      const scene = scenes[index];
      if (!scene || !narratorRef.current) return;
      await narratorRef.current.speak(scene.lines.join(''), { rate, voiceName: voiceName || undefined });
    },
    [rate, scenes, voiceName],
  );

  const playAll = useCallback(async () => {
    if (playing) {
      stopPlayback();
      return;
    }
    abortRef.current = false;
    narratorRef.current?.reset();
    setPlaying(true);
    const start = activeRef.current >= scenes.length - 1 ? 0 : activeRef.current;
    for (let index = start; index < scenes.length; index += 1) {
      if (abortRef.current) break;
      setActiveIndex(index);
      await speakScene(index);
      if (abortRef.current) break;
      await sleep(520);
    }
    if (!abortRef.current) setActiveIndex(0);
    setPlaying(false);
    abortRef.current = false;
  }, [playing, scenes.length, speakScene, stopPlayback]);

  const speakOne = useCallback(async () => {
    stopPlayback();
    narratorRef.current?.reset();
    await speakScene(activeRef.current);
  }, [speakScene, stopPlayback]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    if (!isComposeSupported()) {
      setExportNote('当前浏览器不支持本地视频录制，请用桌面版 Chrome / Edge 打开，或先逐幕浏览。');
      return;
    }
    stopPlayback();
    setExporting(true);
    setSavedFilmId(null);
    setExportNote('');
    setExportLabel('准备画面与配乐…');
    try {
      const result = await composeFilm({
        poem,
        scenes,
        onProgress: (progress) => {
          setExportLabel(`${progress.label} · ${Math.round(progress.ratio * 100)}%`);
        },
      });
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `film-${Date.now()}`;
      await saveFilm(
        {
          id,
          poemId: poem.id,
          poemTitle: poem.title,
          author: poem.author,
          dynasty: poem.dynasty,
          createdAt: Date.now(),
          durationMs: result.durationMs,
          size: result.blob.size,
          mimeType: result.mimeType,
          sceneCount: result.sceneCount,
          hasVoice: false,
        },
        result.blob,
      );
      setSavedFilmId(id);
      setExportNote('短片已保存到本机影片馆（字幕配乐版，不含浏览器朗读的声音）。');
    } catch (cause) {
      setExportNote(cause instanceof Error ? cause.message : '生成失败，请重试。');
    } finally {
      setExporting(false);
      setExportLabel('');
    }
  }, [exporting, poem, scenes, stopPlayback]);

  const totalSeconds = useMemo(
    () => Math.round(scenes.reduce((sum, scene) => sum + sceneDuration(scene), 0)),
    [scenes],
  );

  const progressPercent = ((activeIndex + 1) / scenes.length) * 100;

  return (
    <div className="reader">
      <div className="reader-bg" aria-hidden="true">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="stage" data-active={index === activeIndex}>
            <SceneStage scene={scene} seedPrefix="reader-" />
          </div>
        ))}
      </div>
      <div className="reader-scrim" aria-hidden="true" />

      <div className="reader-top">
        <Link className="btn btn-sm" href="/library">
          ← 返回书库
        </Link>
        <span className="center-note">
          {poem.title} · {poem.dynasty} · {poem.author}
          {source === 'curated' ? '' : ' · 线上全量库'}
        </span>
        <div className="reader-actions">
          <button type="button" className="btn btn-sm" onClick={handleExport} disabled={exporting}>
            {exporting ? '合成中…' : '▣ 生成短片'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowSettings((value) => !value)}
            aria-expanded={showSettings}
          >
            ♫ 朗读设置
          </button>
          <button type="button" className="btn btn-sm btn-gold" onClick={playAll}>
            {playing ? '■ 停止' : '▶ 听全诗'}
          </button>
        </div>
      </div>

      <div className="reader-main">
        <p className="reader-kicker">IMMERSIVE POETRY · 沉浸诗境</p>
        <h1 className="reader-title">{poem.title}</h1>
        <p className="reader-byline">
          {poem.dynasty} · {poem.author}
        </p>
        <div className="reader-tags">
          {poem.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          <span className="tag">{poem.theme}</span>
        </div>

        <div className="reader-scene-text" aria-live="polite">
          {activeScene.lines.map((line, index) => (
            <p key={`${activeScene.id}-${index}`} className={playing ? 'is-active' : undefined}>
              {line}
            </p>
          ))}
        </div>
        <p className="reader-translation">{activeScene.translation}</p>
      </div>

      <div className="scene-rail">
        <div className="scene-rail-head">
          <span>这一首诗的意境路线</span>
          <span>
            {scenes.length} 幕 · 约 {totalSeconds} 秒 · 点击任意一幕进入
          </span>
        </div>
        <div className="scene-strip">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              type="button"
              className="scene-thumb"
              data-active={index === activeIndex}
              onClick={() => {
                stopPlayback();
                setActiveIndex(index);
              }}
            >
              <span className="idx">{String(index + 1).padStart(2, '0')}</span>
              <span className="line">{scene.lines[0]}</span>
              <span className="sub">{scene.translation}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="reader-bottom">
        <div className="reader-progress">
          <span>{playing ? '分幕朗读中' : '当前画面'}</span>
          <span className="progress-track">
            <i style={{ width: `${progressPercent}%` }} />
          </span>
          <span>
            {activeIndex + 1} / {scenes.length}
          </span>
        </div>
        <div className="reader-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              stopPlayback();
              setActiveIndex((value) => Math.max(0, value - 1));
            }}
            disabled={activeIndex === 0}
          >
            ← 上一幕
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void speakOne()}>
            ♫ 读这一幕
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              stopPlayback();
              setActiveIndex((value) => Math.min(scenes.length - 1, value + 1));
            }}
            disabled={activeIndex === scenes.length - 1}
          >
            下一幕 →
          </button>
        </div>
        {exportNote && (
          <p className="export-note" style={{ width: '100%' }}>
            {exportLabel || exportNote}{' '}
            {savedFilmId && (
              <Link href="/video" style={{ color: 'var(--gold)' }}>
                去影片馆回看 →
              </Link>
            )}
          </p>
        )}
      </div>

      {showSettings && (
        <div className="popover" role="dialog" aria-label="朗读设置">
          <h4>朗读设置</h4>
          <p className="export-note" style={{ marginBottom: 12 }}>
            {providerNote}
          </p>
          <label className="field">
            <span>语速 {rate.toFixed(2)}×</span>
            <input
              type="range"
              min={0.6}
              max={1.4}
              step={0.05}
              value={rate}
              onChange={(event) => setRate(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>音色</span>
            <select
              value={voiceName}
              onChange={(event) => setVoiceName(event.target.value)}
              disabled={provider === 'doubao' || voices.length === 0}
            >
              <option value="">
                {provider === 'doubao'
                  ? '由服务端 TTS 决定'
                  : voices.length === 0
                    ? '系统默认音色'
                    : '系统默认音色'}
              </option>
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name}
                </option>
              ))}
            </select>
          </label>
          <p className="export-note">
            生成短片时会用程序生成的五声音阶配乐；浏览器朗读的声音无法被录制，因此导出的短片为「字幕配乐版」。
          </p>
          <button type="button" className="btn btn-sm" onClick={() => setShowSettings(false)}>
            收起
          </button>
        </div>
      )}
    </div>
  );
}
