/** 服务端语音合成：优先豆包（火山方舟）TTS，未配置时明确返回降级信号。 */

export const dynamic = 'force-dynamic';

const ENDPOINT = process.env.DOUBAO_TTS_ENDPOINT ?? 'https://openspeech.bytedance.com/api/v1/tts';
const APPID = process.env.DOUBAO_TTS_APPID ?? '';
const TOKEN = process.env.DOUBAO_TTS_TOKEN ?? '';
const CLUSTER = process.env.DOUBAO_TTS_CLUSTER ?? 'volcano_tts';
const DEFAULT_VOICE = process.env.DOUBAO_TTS_VOICE ?? 'zh_female_qingxin';

export function isConfigured(): boolean {
  return Boolean(APPID && TOKEN);
}

/** 前端用它判断音源：配置了服务端 TTS 就用 TTS，否则退回浏览器朗读。 */
export async function GET() {
  return Response.json(
    {
      available: isConfigured(),
      provider: isConfigured() ? 'doubao' : 'none',
      fallback: 'web-speech',
      reason: isConfigured()
        ? undefined
        : '未配置豆包 TTS 密钥（DOUBAO_TTS_APPID / DOUBAO_TTS_TOKEN），前端将使用浏览器内置朗读。',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return Response.json(
      {
        error: 'tts_not_configured',
        fallback: 'web-speech',
        message: '未配置豆包 TTS 密钥，请使用浏览器朗读。',
      },
      { status: 501 },
    );
  }

  let payload: { text?: string; voice?: string; speed?: number };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const text = (payload.text ?? '').trim().slice(0, 400);
  if (!text) return Response.json({ error: 'empty_text' }, { status: 400 });

  const speed = typeof payload.speed === 'number' ? Math.min(Math.max(payload.speed, 0.5), 2) : 1;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer;${TOKEN}`,
      },
      body: JSON.stringify({
        app: { appid: APPID, token: TOKEN, cluster: CLUSTER },
        user: { uid: 'shijing' },
        audio: {
          voice_type: payload.voice || DEFAULT_VOICE,
          encoding: 'mp3',
          speed_ratio: speed,
        },
        request: {
          reqid: crypto.randomUUID(),
          text,
          operation: 'query',
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return Response.json(
        { error: 'tts_upstream_error', status: response.status, fallback: 'web-speech' },
        { status: 502 },
      );
    }

    const json = (await response.json()) as { code?: number; data?: string; message?: string };
    if (json.code !== 3000 || !json.data) {
      return Response.json(
        { error: 'tts_synthesis_failed', message: json.message ?? '上游未返回音频', fallback: 'web-speech' },
        { status: 502 },
      );
    }

    return new Response(Buffer.from(json.data, 'base64'), {
      headers: {
        'content-type': 'audio/mpeg',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return Response.json({ error: 'tts_request_failed', fallback: 'web-speech' }, { status: 502 });
  }
}
