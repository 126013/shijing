'use client';

import type { Poem, Scene } from '@/lib/data/types';
import { paintSceneFrame, paintingForScene } from '@/lib/scene/paint';

export interface ComposeProgress {
  ratio: number;
  sceneIndex: number;
  sceneCount: number;
  label: string;
}

export interface ComposeResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
  hasAudio: boolean;
  sceneCount: number;
}

export interface ComposeOptions {
  poem: Poem;
  scenes: Scene[];
  width?: number;
  height?: number;
  onProgress?: (progress: ComposeProgress) => void;
  signal?: { aborted: boolean };
}

/** 浏览器是否具备录制能力（Chrome / Edge / 新版 Safari 支持；旧 Safari 与部分移动端不支持） */
export function isComposeSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof canvas.captureStream === 'function' &&
    pickMimeType() !== null
  );
}

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function sceneDuration(scene: Scene): number {
  if (scene.duration) return scene.duration;
  const chars = scene.lines.join('').length + scene.translation.length * 0.5;
  return Math.min(9, Math.max(4.5, chars * 0.16));
}

/**
 * 短片合成：Canvas 逐帧绘制分幕画面 + WebAudio 生成意境配乐，
 * 用 MediaRecorder 录成 WebM。全程在浏览器本地完成，不上传任何数据。
 *
 * 注意：这里录制的是「字幕配乐版」。浏览器朗读（Web Speech）的声音无法被
 * MediaRecorder 捕获，所以除非配置了服务端 TTS，导出的短片不含人声朗读。
 */
export async function composeFilm({
  poem,
  scenes,
  width = 1280,
  height = 720,
  onProgress,
  signal,
}: ComposeOptions): Promise<ComposeResult> {
  if (!isComposeSupported()) {
    throw new Error('当前浏览器不支持视频录制（需要 MediaRecorder 与 canvas.captureStream）。建议使用桌面版 Chrome 或 Edge。');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建画布上下文。');

  const paintings = scenes.map((scene) => paintingForScene(scene, 'film-'));
  const durations = scenes.map(sceneDuration);
  const totalMs = durations.reduce((sum, value) => sum + value * 1000, 0);
  const cumulative: number[] = [];
  durations.reduce((acc, value, index) => {
    cumulative[index] = acc + value * 1000;
    return cumulative[index];
  }, 0);

  const soundtrack = createSoundtrack(totalMs);
  const stream = canvas.captureStream(30);
  for (const track of soundtrack.stream.getAudioTracks()) stream.addTrack(track);

  const mimeType = pickMimeType()!;
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_600_000,
    audioBitsPerSecond: 128_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(250);

  const fadeMs = 700;
  const startedAt = performance.now();

  const drawScene = (
    index: number,
    localProgress: number,
    alpha: number,
  ) => {
    const scene = scenes[index];
    ctx.save();
    ctx.globalAlpha = Math.min(Math.max(alpha, 0), 1);
    paintSceneFrame(ctx, paintings[index], localProgress, 1.06);
    ctx.restore();

    // 文字层（随幕淡入）
    const textAlpha = Math.min(1, Math.max(0, alpha * 1.2));
    ctx.save();
    ctx.globalAlpha = textAlpha;
    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(227, 199, 110, 0.95)';
    ctx.font = '20px "STKaiti", "KaiTi", "Noto Serif SC", serif';
    ctx.fillText(`${poem.dynasty} · ${poem.author}`, width / 2, height * 0.2);

    ctx.fillStyle = '#fbf5e2';
    ctx.font = `600 ${Math.round(width * 0.042)}px "STKaiti", "KaiTi", "Noto Serif SC", serif`;
    const lineHeight = Math.round(width * 0.062);
    const startY = height * 0.44 - ((scene.lines.length - 1) * lineHeight) / 2;
    scene.lines.forEach((line, lineIndex) => {
      ctx.fillText(line, width / 2, startY + lineIndex * lineHeight);
    });

    ctx.fillStyle = 'rgba(207, 199, 174, 0.9)';
    ctx.font = `${Math.round(width * 0.0145)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    drawWrappedText(ctx, scene.translation, width / 2, height * 0.63, width * 0.62, height * 0.045);

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(227, 199, 110, 0.8)';
    ctx.font = '18px "STKaiti", "KaiTi", serif';
    ctx.fillText(`诗境 · ${poem.title}`, width * 0.06, height * 0.92);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(207, 199, 174, 0.7)';
    ctx.font = '16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`${index + 1} / ${scenes.length}`, width * 0.94, height * 0.92);

    ctx.restore();
  };

  try {
    await new Promise<void>((resolve) => {
      const frame = () => {
        if (signal?.aborted) {
          resolve();
          return;
        }
        const elapsed = performance.now() - startedAt;
        if (elapsed >= totalMs) {
          drawScene(scenes.length - 1, 1, 1);
          onProgress?.({ ratio: 1, sceneIndex: scenes.length, sceneCount: scenes.length, label: '收束画面' });
          resolve();
          return;
        }

        let index = scenes.findIndex((_, i) => elapsed < cumulative[i]);
        if (index < 0) index = scenes.length - 1;
        const sceneStart = index === 0 ? 0 : cumulative[index - 1];
        const localElapsed = elapsed - sceneStart;
        const localProgress = Math.min(1, localElapsed / (durations[index] * 1000));

        ctx.clearRect(0, 0, width, height);
        if (index > 0 && localElapsed < fadeMs) {
          drawScene(index - 1, 1, 1 - localElapsed / fadeMs);
          drawScene(index, localProgress, localElapsed / fadeMs);
        } else {
          drawScene(index, localProgress, 1);
        }

        onProgress?.({
          ratio: elapsed / totalMs,
          sceneIndex: index + 1,
          sceneCount: scenes.length,
          label: `正在合成第 ${index + 1} / ${scenes.length} 幕`,
        });

        requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    });
  } finally {
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;
    soundtrack.close();
    for (const track of stream.getTracks()) track.stop();
  }

  const blob = new Blob(chunks, { type: mimeType });
  if (blob.size === 0) throw new Error('录制结果为空，可能是浏览器中断了编码，请重试。');

  return {
    blob,
    durationMs: Math.round(totalMs),
    mimeType,
    hasAudio: soundtrack.stream.getAudioTracks().length > 0,
    sceneCount: scenes.length,
  };
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
) {
  const chars = [...text];
  let line = '';
  let y = startY;
  for (const char of chars) {
    const candidate = line + char;
    if (ctx.measureText(candidate).width > maxWidth) {
      ctx.fillText(line, centerX, y);
      line = char;
      y += lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line) ctx.fillText(line, centerX, y);
}

interface Soundtrack {
  stream: MediaStream;
  close: () => void;
}

/** 程序生成意境配乐：五声音阶拨弦 + 低音持续音，无需任何音频素材。 */
function createSoundtrack(durationMs: number): Soundtrack {
  const AudioCtor =
    typeof window !== 'undefined'
      ? window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  if (!AudioCtor) {
    return { stream: new MediaStream(), close: () => {} };
  }

  const context = new AudioCtor();
  const destination = context.createMediaStreamDestination();
  const master = context.createGain();
  master.gain.value = 0.9;
  master.connect(destination);

  const now = context.currentTime;
  const seconds = durationMs / 1000;

  // 低音持续音
  const drone = context.createOscillator();
  const droneGain = context.createGain();
  drone.type = 'sine';
  drone.frequency.value = 130.81;
  droneGain.gain.value = 0.045;
  drone.connect(droneGain).connect(master);
  drone.start(now);
  drone.stop(now + seconds + 1);

  const fifth = context.createOscillator();
  const fifthGain = context.createGain();
  fifth.type = 'sine';
  fifth.frequency.value = 196;
  fifthGain.gain.value = 0.028;
  fifth.connect(fifthGain).connect(master);
  fifth.start(now);
  fifth.stop(now + seconds + 1);

  // 五声音阶拨弦
  const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  let step = 0;
  for (let t = 0.4; t < seconds; t += 1.15) {
    const note = scale[step % scale.length];
    step += 1 + (step % 3);

    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;

    osc.type = 'triangle';
    osc.frequency.value = note * (step % 5 === 0 ? 0.5 : 1);
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.13, now + t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 1.7);

    osc.connect(filter).connect(gain).connect(master);
    osc.start(now + t);
    osc.stop(now + t + 1.8);
  }

  void context.resume();

  return {
    stream: destination.stream,
    close: () => {
      void context.close();
    },
  };
}
