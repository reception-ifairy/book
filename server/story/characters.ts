import { t1000Configured, t1000Pool } from '../db';

/**
 * The tale's characters from the t1000 registry (ignis_characters + DNA + persona, mode "grimm", plus the
 * active retelling), reduced to what the story prompt needs. Loaded at startup and refreshed every 10 minutes,
 * so the system prompt stays byte-stable between refreshes and keeps hitting the prompt cache.
 * Without a database, or when it is down, the cache is empty and the prompt is exactly what it was before.
 */

export interface TaleCharacter {
  name: string;
  nameEn: string;
  epithet: string | null;
  role: string | null;
  desire: string;
  blindSpot: string;
  facts: string[];
  objects: string[];
  register: string;
  cadence: string;
  signature: string[];
  pressure: string;
}

export interface TaleSetPiece {
  title: string;
  absurdRule: string;
  setup: string;
  punchline: string;
  runningGag: string | null;
  humourBoundary: string;
}

export interface TaleCast {
  characters: TaleCharacter[];
  setPiece: TaleSetPiece | null;
}

export const PERSONA_MODE = 'grimm';
const REFRESH_MS = 10 * 60 * 1000;

let cache = new Map<string, TaleCast>();
let timer: NodeJS.Timeout | null = null;

export const charactersFor = (taleId: string): TaleCast | null => cache.get(taleId) ?? null;

/** Tests inject a cast; an empty map turns the feature off. */
export function setCharacterCache(next: Map<string, TaleCast>) {
  cache = next;
}

export function characterStats() {
  let n = 0;
  for (const c of cache.values()) n += c.characters.length;
  return { loaded: n, tales: cache.size };
}

const parse = (v: unknown) => {
  if (v == null) return {};
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v as any;
};
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

/** Builds the cache from raw rows. Exported for tests. */
export function castFromRows(rows: any[], retellings: any[]): Map<string, TaleCast> {
  const out = new Map<string, TaleCast>();
  for (const r of rows) {
    if (!r.tale_id) continue; // the narrator lives in the prompt itself
    const dna = parse(r.dna_json).arb_character_v1 ?? {};
    const voice = parse(r.interaction_style).arb_voice_v1 ?? {};
    const entry = out.get(r.tale_id) ?? { characters: [], setPiece: null };
    entry.characters.push({
      name: r.name,
      nameEn: r.name_en || r.name,
      epithet: r.epithet ?? null,
      role: r.role ?? null,
      desire: dna.desire ?? '',
      blindSpot: dna.blind_spot ?? '',
      facts: list(dna.immutable_facts).slice(0, 3),
      objects: (Array.isArray(dna.signature_objects) ? dna.signature_objects : [])
        .slice(0, 2)
        .map((o: any) => [o.name, o.function && `(${o.function}${o.limit ? `; limit: ${o.limit}` : ''})`].filter(Boolean).join(' ')),
      register: voice.register ?? '',
      cadence: voice.cadence ?? '',
      signature: list(voice.speech_signature).slice(0, 2),
      pressure: voice.pressure_response ?? '',
    });
    out.set(r.tale_id, entry);
  }
  for (const t of retellings) {
    const entry = out.get(t.tale_id);
    if (!entry || entry.setPiece) continue;
    const j = parse(t.retelling_json);
    const gag = j.running_gag ? `${j.running_gag.trigger} → ${j.running_gag.variation}` : null;
    entry.setPiece = {
      title: t.title,
      absurdRule: j.absurd_rule ?? '',
      setup: j.setup ?? '',
      punchline: j.punchline ?? '',
      runningGag: gag,
      humourBoundary: j.humour_boundary ?? '',
    };
  }
  return out;
}

export async function loadCharacters(log: (msg: string) => void = console.log): Promise<void> {
  if (!t1000Configured()) return;
  try {
    const db = await t1000Pool();
    const [rows] = await db.query(
      `SELECT c.slug, c.name, c.name_en, c.epithet, c.role, c.tale_id, d.dna_json, p.interaction_style
         FROM ignis_characters c
         JOIN ignis_character_dna d ON d.character_id = c.id AND d.status = 1
         JOIN ignis_character_personas p ON p.character_id = c.id AND p.mode = ? AND p.status = 1
        WHERE c.status = 1
        ORDER BY c.tale_id, c.item_order, c.id`,
      [PERSONA_MODE],
    );
    const [retellings] = await db.query(
      `SELECT c.tale_id, r.title, r.retelling_json
         FROM ignis_character_retellings r
         JOIN ignis_characters c ON c.id = r.character_id AND c.status = 1
        WHERE r.status = 'active' AND c.tale_id IS NOT NULL
        ORDER BY r.id`,
    );
    cache = castFromRows(rows as any[], retellings as any[]);
    const s = characterStats();
    log(`[characters] loaded ${s.loaded} characters for ${s.tales} tales from t1000.`);
  } catch (e) {
    console.error('[characters] could not load from t1000, keeping the previous cast:', (e as Error).message);
  }
}

/** Loads once now and then every 10 minutes. Never throws. */
export function startCharacterRefresh() {
  if (!t1000Configured() || timer) return;
  void loadCharacters();
  timer = setInterval(() => void loadCharacters(() => {}), REFRESH_MS);
  timer.unref();
}
