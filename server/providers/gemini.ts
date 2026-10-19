import { GoogleGenAI, Modality } from '@google/genai';
import type { Media, ModelInfo } from './types';

const client = (apiKey: string) => new GoogleGenAI({ apiKey });

export async function listGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const out: ModelInfo[] = [];
  for await (const m of await client(apiKey).models.list()) {
    const id = (m.name || '').replace(/^models\//, '');
    if (!id) continue;
    const tags: ModelInfo['tags'] = /tts/i.test(id) ? ['tts'] : /image|imagen/i.test(id) ? ['image'] : ['text'];
    out.push({ id, label: m.displayName, tags });
  }
  return out;
}

/** Generates one image. `refs` are earlier illustrations, passed to keep characters consistent. */
export async function geminiImage(apiKey: string, model: string, prompt: string, refs: Media[] = []): Promise<Media> {
  const response = await client(apiKey).models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          ...refs.map((r) => ({ inlineData: { mimeType: r.mime, data: r.data.toString('base64') } })),
          { text: prompt },
        ],
      },
    ],
    config: { responseModalities: [Modality.IMAGE, Modality.TEXT], imageConfig: { aspectRatio: '1:1' } },
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      return { mime: part.inlineData.mimeType || 'image/png', data: Buffer.from(part.inlineData.data, 'base64') };
    }
  }
  throw new Error('Gemini returned no image.');
}

export async function geminiTts(apiKey: string, model: string, voice: string, text: string): Promise<Media> {
  const response = await client(apiKey).models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: voice ? { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } : undefined,
    },
  });
  const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error('Gemini returned no audio.');
  const pcm = Buffer.from(part.inlineData.data, 'base64');
  const mime = part.inlineData.mimeType || '';
  if (/wav|mpeg|mp3|ogg/i.test(mime)) return { mime, data: pcm };
  // Gemini TTS returns raw 16-bit PCM ("audio/L16;rate=24000"); wrap it so browsers can play it.
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] || 24000);
  return { mime: 'audio/wav', data: pcmToWav(pcm, rate) };
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bits = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bits) / 8;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bits) / 8, 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
