import OpenAI from 'openai';
import type { Media, ModelInfo } from './types';

const client = (apiKey: string) => new OpenAI({ apiKey });

const VOICE_DIRECTION =
  'Voice of a sarcastic, glitchy cyber-magic grimoire narrating a twisted fairy tale. Dry, theatrical, slightly robotic.';

export async function listOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  const out: ModelInfo[] = [];
  for await (const m of client(apiKey).models.list()) {
    const tags: ModelInfo['tags'] = /tts/i.test(m.id) ? ['tts'] : /^(gpt-image|dall-e|chatgpt-image)/i.test(m.id) ? ['image'] : ['text'];
    out.push({ id: m.id, tags });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export async function openaiImage(apiKey: string, model: string, prompt: string): Promise<Media> {
  const res = await client(apiKey).images.generate({
    model,
    prompt,
    n: 1,
    size: '1024x1024',
    // gpt-image models always return base64 and reject this parameter; DALL·E needs it.
    ...(model.startsWith('dall-e') ? { response_format: 'b64_json' as const } : {}),
  });
  const item = res.data?.[0];
  if (item?.b64_json) return { mime: 'image/png', data: Buffer.from(item.b64_json, 'base64') };
  if (item?.url) {
    const r = await fetch(item.url);
    return { mime: r.headers.get('content-type') || 'image/png', data: Buffer.from(await r.arrayBuffer()) };
  }
  throw new Error('OpenAI returned no image.');
}

export async function openaiTts(apiKey: string, model: string, voice: string, text: string): Promise<Media> {
  const res = await client(apiKey).audio.speech.create({
    model,
    voice: voice || 'onyx',
    input: text,
    response_format: 'mp3',
    // tts-1 / tts-1-hd ignore voice direction and reject it.
    ...(model.startsWith('tts-1') ? {} : { instructions: VOICE_DIRECTION }),
  });
  return { mime: 'audio/mpeg', data: Buffer.from(await res.arrayBuffer()) };
}

/**
 * One Art Kit image. GPT image models get the exact size, quality and a real transparent background;
 * legacy DALL·E 3 gets the nearest supported size and an opaque background.
 */
export async function openaiArt(
  apiKey: string,
  model: string,
  prompt: string,
  opts: { size: '1024x1024' | '1536x1024' | '1024x1536'; transparent: boolean; quality: 'low' | 'medium' | 'high' },
): Promise<Media> {
  const legacy = model.startsWith('dall-e');
  const res = await client(apiKey).images.generate(
    legacy
      ? {
          model,
          prompt: prompt.slice(0, 4000),
          n: 1,
          size: opts.size === '1536x1024' ? '1792x1024' : opts.size === '1024x1536' ? '1024x1792' : '1024x1024',
          quality: opts.quality === 'high' ? 'hd' : 'standard',
          response_format: 'b64_json',
        }
      : {
          model,
          prompt,
          n: 1,
          size: opts.size,
          quality: opts.quality,
          background: opts.transparent ? 'transparent' : 'opaque',
          output_format: 'png',
        },
  );
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI returned no image.');
  return { mime: 'image/png', data: Buffer.from(b64, 'base64') };
}
