import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import type { Story } from '../../shared/types';

const STORY_DIR = path.join(DATA_DIR, 'stories');
export const MEDIA_DIR = path.join(DATA_DIR, 'media');
const cache = new Map<string, Story>();

const fileFor = (id: string) => path.join(STORY_DIR, `${id}.json`);
const isSafeId = (id: string) => /^[a-zA-Z0-9-]{8,64}$/.test(id);

export function getStory(id: string): Story | undefined {
  if (!isSafeId(id)) return undefined;
  const hit = cache.get(id);
  if (hit) return hit;
  try {
    const story = JSON.parse(fs.readFileSync(fileFor(id), 'utf8')) as Story;
    cache.set(id, story);
    return story;
  } catch {
    return undefined;
  }
}

export function saveStory(story: Story) {
  story.updatedAt = Date.now();
  cache.set(story.id, story);
  fs.mkdirSync(STORY_DIR, { recursive: true });
  fs.writeFileSync(fileFor(story.id), JSON.stringify(story));
}

/** Writes a media file for a page and returns its public URL. */
export function saveMedia(storyId: string, name: string, data: Buffer): string {
  const dir = path.join(MEDIA_DIR, storyId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), data);
  return `/media/${storyId}/${name}`;
}

export function readMedia(url: string): Buffer | null {
  const rel = url.replace(/^\/media\//, '');
  const full = path.resolve(MEDIA_DIR, rel);
  if (!full.startsWith(MEDIA_DIR + path.sep)) return null;
  try {
    return fs.readFileSync(full);
  } catch {
    return null;
  }
}
