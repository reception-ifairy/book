import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { DATA_DIR } from '../config';
import { ARCHIVE, type ArchiveComment, type ArchiveEntry, type ArchiveListItem } from '../../shared/archive';

const FILE = path.join(DATA_DIR, 'archive', 'comments.json');
let comments: ArchiveComment[] | null = null;

function all(): ArchiveComment[] {
  if (!comments) {
    try {
      comments = JSON.parse(fs.readFileSync(FILE, 'utf8')) as ArchiveComment[];
    } catch {
      comments = [];
    }
  }
  return comments;
}

export const entryOf = (id: string): ArchiveEntry | undefined => ARCHIVE.find((e) => e.id === id);
export const commentsFor = (entryId: string) => all().filter((c) => c.entryId === entryId).sort((a, b) => b.createdAt - a.createdAt);

/** The list as an agent with this clearance sees it: titles and summaries for all, bodies only through entry(). */
export function listFor(clearance: number): ArchiveListItem[] {
  return ARCHIVE.map((e) => {
    const cs = commentsFor(e.id);
    return {
      id: e.id,
      title: e.title,
      category: e.category,
      clearance: e.clearance,
      summary: e.summary,
      locked: e.clearance > clearance,
      rating: cs.length ? Math.round((cs.reduce((s, c) => s + c.rating, 0) / cs.length) * 10) / 10 : null,
      comments: cs.length,
      warnings: cs.filter((c) => c.warning).length,
      ...(e.locationId ? { locationId: e.locationId } : {}),
    };
  });
}

export function addComment(entryId: string, codename: string, text: string, rating: number, warning: boolean): ArchiveComment {
  const comment: ArchiveComment = { id: randomUUID(), entryId, codename, text, rating, warning, createdAt: Date.now() };
  const list = all();
  list.push(comment);
  // Keep the newest 50 per entry so the file cannot grow without bound.
  const mine = list.filter((c) => c.entryId === entryId);
  if (mine.length > 50) comments = list.filter((c) => c.entryId !== entryId || mine.slice(-50).includes(c));
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(comments));
  return comment;
}
