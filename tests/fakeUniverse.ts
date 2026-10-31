import http from 'http';
import type { AddressInfo } from 'net';
import { CORE_REFS, PORTALS_ROOT, SEEDS } from '../server/universe/seeds';

export const UNIVERSE_KEY = 'uapi_test_key_000000';

/** The real "Story Hooks" and checklist lines of PORTALS_AND_GUARDIANS (canon 2.2.0-EN). */
export const HOOKS_LINE =
  "A Portal is tuned (by accident or design) to a Void Realm — a faded, resolved-history remnant; an Ontological Engineer must close it before the dissonance spills into the iFairy Universe. (Void = resolved challenge, never present dread.); A Code Guardian detects a self-replicating 'idea-parasite' (narrative virus) arriving through the Narrative Currents; a race to quarantine it before it touches the Nexus.; A newcomer tries to enter without an invitation and risks 'narrative gravity'; a Winged Guardian must choose whether to hold them back or help them — resolved kindly.; An Ascension is under way: a 70-year ontological anchor has just released; iFairies open a Resonance Tunnel to invite a Story-Soul, and something disturbs the tuning mid-transfer.; A hero stumbles into a Natural Anomaly in an ancient forest — no map, navigation only by resonance with the Narrative Field; an iFairy Navigator is the only guide.; One Force begins to dominate (e.g. Logos over Phantasia); a subtle cosmic intervention shows through ordinary characters, never overtly.";
export const CHECKLIST_LINE =
  "Use 'Narrative Portals', not 'Portal Hearts'.; Address a Portal by narrative signature, not coordinates.; Distinguish a chaotic Fissure from a controlled Resonance Tunnel.; Specify which Guardian layer is acting.; Do not confuse the Guardian-persona (AI) with in-world beings.; Ascension = invitation, never abduction; respect Narrative Integrity.; iFairies intervene minimally; the Tetrachord acts subtly.; Passing through a Portal -> the Rainbow-Hand Effect.; Use 'Glimmerkin' and 'Krasnoludki' interchangeably — the Polish form is permitted in the English encyclopaedia and must not be translated away.; A Far-Side Guardian keeps the signature; the Golden City keeps the reactor. Never show one doing the other's work.";

/** Same patterns as the Universe's pii-guard middleware. */
const PII = [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, /\+?\d[\d\-\s().]{7,}\d/, /\d{7,}/, /\bmy name is\b/i];

interface Chunk { id: string; module: string; ref: string | null; path: string; title: string; text: string; tags: string[] }
const chunk = (id: string, ref: string | null, title: string, text: string): Chunk => {
  const [module, path] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
  return { id, module, ref, path, title, text, tags: [] };
};

/**
 * Stand-in for the iFairy Universe lore API. REFs resolve only to the chunks below (the first two
 * roster districts are indexed, the rest 404 as before the Universe chunked districts).
 */
export async function startFakeUniverse() {
  const byRef = new Map<string, Chunk>();
  const add = (ref: string, c: Chunk) => byRef.set(ref, c);
  for (const c of CORE_REFS) add(c.ref, chunk(c.chunkId, c.ref.startsWith('REF:NARRATIVE_STYLE') ? c.ref : null, c.ref.split(':').slice(2).join(' '), `Canon text of ${c.ref}.`));
  add(PORTALS_ROOT.ref, chunk(PORTALS_ROOT.chunkId, null, 'PORTALS AND GUARDIANS', `Source Of Truth: spec.\nStory Hooks: ${HOOKS_LINE}\nConsistency Checklist: ${CHECKLIST_LINE}`));
  for (const s of SEEDS.filter((s) => s.kind === 'saga')) {
    add(s.source.ref, chunk(s.source.chunkId, s.order === 8 ? s.source.ref : null, s.title.en, `Saga text for act ${s.order}.`));
    for (const c of s.source.children ?? []) add(c.ref, chunk(c.chunkId, null, c.chunkId.split('/').pop()!, `Child ${c.chunkId}.`));
  }
  for (const s of SEEDS.filter((s) => s.kind === 'district').slice(0, 2)) add(s.source.ref, chunk(s.source.chunkId, null, s.title.en, s.fallback!));

  const golden = chunk('GLOSSARY:/terms[9]', null, 'Golden City', 'Definition: Nexus of iFairy civilisation on Aurelius Prima, founded by If-AI.');
  const portalsLore = chunk('PORTALS_AND_GUARDIANS:/narrative_portals', null, 'Narrative Portals', 'The gates work on narrative resonance.');
  const weak = chunk('TIMELINE:/eras[0]', null, 'Era I', 'Barely related.');

  const requests: { url: string; auth: string; body: any }[] = [];
  const searches: string[] = [];
  let down = false;
  let allowedGrants = ['if-ai', 'book-gm'];

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const send = (status: number, body: object) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      const body = raw ? JSON.parse(raw) : {};
      const url = decodeURIComponent(req.url ?? '');
      requests.push({ url, auth: String(req.headers.authorization ?? ''), body });
      if (down) return send(503, { ok: false, error: 'Down for maintenance.' });
      if (req.headers.authorization !== `Bearer ${UNIVERSE_KEY}`) return send(401, { ok: false, error: 'Unauthorized.' });
      if (PII.some((re) => re.test(url) || re.test(raw))) return send(400, { ok: false, error: 'Personal data is not accepted.' });
      if (url === '/v1/health') return send(200, { ok: true, data: { modules: 29, chunks: 1779, version: '2.2.0-EN', builtAt: '2026-10-30T00:00:00Z' } });
      if (url.startsWith('/v1/ref/')) {
        const hit = byRef.get(url.slice('/v1/ref/'.length));
        return hit ? send(200, { ok: true, data: hit }) : send(404, { ok: false, error: 'Not found.' });
      }
      if (url === '/v1/search' && req.method === 'POST') {
        if (!allowedGrants.includes(body.grant)) return send(403, { ok: false, error: 'Grant not permitted.' });
        searches.push(body.query);
        return send(200, { ok: true, data: { results: [{ chunk: golden, score: 0.82 }, { chunk: portalsLore, score: 0.61 }, { chunk: weak, score: 0.2 }].slice(0, body.k) } });
      }
      send(404, { ok: false, error: 'Unknown route.' });
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    searches,
    /** Replace what a REF resolves to (canon edit, or a fallback match landing on the wrong node). */
    setRef: (ref: string, over: Partial<Chunk>) => byRef.set(ref, { ...byRef.get(ref)!, ...over }),
    setDown: (v: boolean) => (down = v),
    setAllowedGrants: (g: string[]) => (allowedGrants = g),
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

/** An iFairy page as the narrator would return it. */
export const ifairyPage = (over: Record<string, unknown> = {}) => ({
  narration: 'The Portal hums a pale, tired note. *Something on the far side is out of tune.*',
  narrator_aside: 'Even the oldest Portals need a little tuning, Young Architect. So do I.',
  mood: 'sincere',
  choices: [
    { label: 'Measure the dissonance pattern', kind: 'logos' },
    { label: 'Ask the Engineer how it feels to her', kind: 'gnosis' },
  ],
  free_form_prompt: 'Use your own words: ask the Engineer anything, or try your own idea.',
  stat_changes: { harmony: 5, dissonance: 10, etherium: -5 },
  inventory_add: ['tuning glyph'],
  inventory_remove: [],
  ending: null,
  image_prompt: 'A ring-shaped portal glowing pale grey',
  story_summary: 'The Architect reached the faded Portal.',
  lore_refs: ['C1', 'L1', 'X9'],
  scene: { location: 'The Portal Ring', present: ['an Ontological Engineer', 'Portal Guardians'] },
  artifact_description: null,
  ...over,
});
