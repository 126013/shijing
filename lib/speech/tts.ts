'use client';

export type TtsProvider = 'doubao' | 'web-speech' | 'unsupported';

export interface TtsStatus {
  provider: TtsProvider;
  reason: string;
}

export interface SpeakOptions {
  rate?: number;
  voiceName?: string;
}

/**
 * 朗读能力探测：
 *   服务端配置了豆包 TTS → doubao
 *   否则浏览器支持 speechSynthesis → web-speech
 *   都不支持 → unsupported（界面会明确告知，而不是假装在读）
 */
export async function detectTts(): Promise<TtsStatus> {
  const webSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  try {
    const response = await fetch('/api/tts', { cache: 'no-store' });
    const json = (await response.json()) as { available?: boolean; reason?: string };
    if (json.available) {
      return { provider: 'doubao', reason: '豆包语音合成' };
    }
    return {
      provider: webSupported ? 'web-speech' : 'unsupported',
      reason: json.reason ?? '使用浏览器内置朗读',
    };
  } catch {
    return {
      provider: webSupported ? 'web-speech' : 'unsupported',
      reason: webSupported ? '使用浏览器内置朗读' : '当前浏览器不支持语音朗读',
    };
  }
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('zh'));
}

function speakWithWebSpeech(text: string, options: SpeakOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = 1;
    const voices = listVoices();
    const picked = options.voiceName
      ? voices.find((voice) => voice.name === options.voiceName)
      : voices[0];
    if (picked) utterance.voice = picked;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    // 某些浏览器在无语音包时会静默丢掉回调，给一个按字数估算的兜底
    const guard = window.setTimeout(finish, Math.min(30_000, 2_000 + text.length * 320));
    utterance.onend = () => {
      window.clearTimeout(guard);
      finish();
    };
    window.speechSynthesis.speak(utterance);
  });
}

export function stopWebSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/** 逐幕朗读控制器：支持中止，切换场景时不会叠加播放。 */
export class Narrator {
  private provider: TtsProvider = 'web-speech';
  private audio: HTMLAudioElement | null = null;
  private aborted = false;

  setProvider(provider: TtsProvider) {
    this.provider = provider;
  }

  getProvider(): TtsProvider {
    return this.provider;
  }

  abort() {
    this.aborted = true;
    stopWebSpeech();
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
  }

  reset() {
    this.aborted = false;
  }

  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!text.trim()) return;

    if (this.provider === 'doubao') {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, speed: options.rate ?? 1 }),
        });
        if (response.ok) {
          const blob = await response.blob();
          await this.playBlob(blob);
          return;
        }
        // 服务端失败就退回浏览器朗读，并在控制台说明原因
        console.warn('[诗境] 服务端朗读不可用，改用浏览器朗读');
        this.provider = 'web-speech';
      } catch (cause) {
        console.warn('[诗境] 服务端朗读请求失败，改用浏览器朗读', cause);
        this.provider = 'web-speech';
      }
    }

    await speakWithWebSpeech(text, options);
  }

  private playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.audio = audio;
      const done = () => {
        URL.revokeObjectURL(url);
        if (this.audio === audio) this.audio = null;
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      void audio.play().catch(done);
    });
  }
}
