import { getConfig, getKey } from './config';
import { geminiImage, geminiTts } from './providers/gemini';
import { openaiImage, openaiTts } from './providers/openai';
import { cleanProviderMessage, ProviderError, type Media } from './providers/types';

export class ModalityUnavailable extends Error {}

function requireKey(provider: 'gemini' | 'openai') {
  const key = getKey(provider);
  if (!key) throw new ModalityUnavailable(`No ${provider} API key configured. Add one in the admin panel.`);
  return key;
}

export const IMAGE_STYLE =
  'Cozy cartoon storybook illustration in a modern animated-series style: bold clean dark ink outlines, flat cel shading with soft gradients, warm palette of honey wood, cream paper, stamp red, pine green and gold. The world of a magical bureaucratic agency that rescues fairy tales: field agents with clipboards, stacks of forms, rubber stamps, glowing portals, fairy-tale characters behaving slightly absurdly. Expressive slapstick poses, comic motion lines when something goes wrong. Square composition with a clear focal character. No text, no letters, no watermark.';

/** Runs a provider call, turning its failure into a short ProviderError naming the provider. */
async function viaProvider<T>(provider: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (e) {
    throw new ProviderError(`${provider}: ${cleanProviderMessage(e)}`);
  }
}

export async function generateImage(prompt: string, refs: Media[] = []): Promise<Media> {
  const { image } = getConfig();
  if (image.provider === 'off' || !image.model) throw new ModalityUnavailable('Illustrations are switched off.');
  if (image.provider === 'gemini') {
    const key = requireKey('gemini');
    return viaProvider('Gemini', () => geminiImage(key, image.model, prompt, refs));
  }
  const key = requireKey('openai');
  return viaProvider('OpenAI', () => openaiImage(key, image.model, prompt));
}

/** Returns null when speech is left to the browser's built-in synthesizer. */
export async function generateSpeech(text: string): Promise<Media | null> {
  const { tts } = getConfig();
  if (tts.provider === 'browser') return null;
  if (!tts.model) throw new ModalityUnavailable('No TTS model selected.');
  if (tts.provider === 'gemini') {
    const key = requireKey('gemini');
    return viaProvider('Gemini', () => geminiTts(key, tts.model, tts.voice, text));
  }
  const key = requireKey('openai');
  return viaProvider('OpenAI', () => openaiTts(key, tts.model, tts.voice, text));
}

export const extFor = (mime: string) =>
  ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' })[mime] || 'bin';

export const mimeFromUrl = (url: string) =>
  ({ png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' })[url.split('.').pop() || ''] || 'image/png';
