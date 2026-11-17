import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Crosshair, MapPin, Trash2, X } from 'lucide-react';
import { FACTIONS, LOCATIONS, MISSIONS, MISSION_TYPES, locationOf, missionOf, type LocationKind } from '../../shared/arb';
import type { ArchiveListItem } from '../../shared/archive';
import { Shell } from '../components/Shell';
import { KIND_LABEL, MAP_LAYERS, MultiverseMap, type MapLayer } from '../components/MultiverseMap';
import { useAgent } from '../agent';
import { api } from '../api';
import { Badge, Button, cx, useToast } from '../ui';

const ALL_CHARACTERS = [...new Set(LOCATIONS.flatMap((l) => l.characters))].sort((a, b) => a.localeCompare(b, 'pl'));
const KINDS = Object.keys(KIND_LABEL) as LocationKind[];

function Pips({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${value} z ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className="w-3 h-3 rounded-full border-2 border-outline" style={{ background: i < value ? color : 'transparent' }} />
      ))}
    </span>
  );
}

export function MapScreen({ focus }: { focus?: string }) {
  const { agent, setAgent } = useAgent();
  const toast = useToast();
  const [layers, setLayers] = useState<Record<MapLayer, boolean>>({ fizyczna: true, polityczna: false, zagrozen: false, zasobow: false });
  const [kind, setKind] = useState<LocationKind | ''>('');
  const [minMagic, setMinMagic] = useState(1);
  const [character, setCharacter] = useState('');
  const [selected, setSelected] = useState<string | null>(focus && locationOf(focus) ? focus : null);
  const [noteMode, setNoteMode] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number; text: string } | null>(null);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archive, setArchive] = useState<ArchiveListItem[]>([]);

  useEffect(() => {
    if (focus && locationOf(focus)) setSelected(focus);
  }, [focus]);

  useEffect(() => {
    if (!agent) return;
    api.archive(agent.id).then(setArchive).catch(() => setArchive([]));
  }, [agent?.id]);

  const visible = useMemo(
    () =>
      new Set(
        LOCATIONS.filter((l) => (!kind || l.kind === kind) && l.magic >= minMagic && (!character || l.characters.includes(character))).map((l) => l.id),
      ),
    [kind, minMagic, character],
  );

  if (!agent) return null;
  const offerLoc = agent.offer ? missionOf(agent.offer.missionId)?.locationId : undefined;
  const loc = selected ? locationOf(selected) : undefined;
  const filtersOn = !!kind || minMagic > 1 || !!character;

  const saveNote = async () => {
    if (!draft?.text.trim()) return;
    setSaving(true);
    try {
      setAgent(await api.addNote(agent.id, { x: draft.x, y: draft.y, text: draft.text.trim().slice(0, 200) }));
      setDraft(null);
      setNoteMode(false);
      toast('Notatka przypięta do mapy.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async (noteId: string) => {
    try {
      setAgent(await api.removeNote(agent.id, noteId));
      if (activeNote === noteId) setActiveNote(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <Shell active="mapa" wide>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <p className="eyebrow">Kartograf Narracji</p>
          <h1 className="toon-title text-3xl sm:text-4xl">Mapa Multiwersum</h1>
        </div>
        {offerLoc && (
          <button onClick={() => setSelected(offerLoc)} className="text-left">
            <Badge tone="danger">❗ Misja z NarratoMatu: {locationOf(offerLoc)?.name}</Badge>
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          {/* Layers and filters */}
          <div className="card p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1">Warstwy</span>
              {MAP_LAYERS.map((l) => (
                <button
                  key={l.id}
                  aria-pressed={layers[l.id]}
                  onClick={() => setLayers((s) => ({ ...s, [l.id]: !s[l.id] }))}
                  className={cx(
                    'h-8 px-3 rounded-lg border-2 border-outline text-sm font-serif font-semibold transition-colors',
                    layers[l.id] ? 'bg-gold text-outline shadow-[0_2px_0_var(--color-outline)]' : 'bg-field text-muted',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="eyebrow">Typ lokacji</span>
                <select className="field mt-1" value={kind} onChange={(e) => setKind(e.target.value as LocationKind | '')}>
                  <option value="">Wszystkie</option>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>{KIND_LABEL[k].emoji} {KIND_LABEL[k].label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="eyebrow">Min. poziom magii: {minMagic}</span>
                <input type="range" min={1} max={5} value={minMagic} onChange={(e) => setMinMagic(Number(e.target.value))} className="w-full mt-3 accent-[var(--color-chaos)]" />
              </label>
              <label className="block">
                <span className="eyebrow">Obecność postaci</span>
                <select className="field mt-1" value={character} onChange={(e) => setCharacter(e.target.value)}>
                  <option value="">Dowolna</option>
                  {ALL_CHARACTERS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            {filtersOn && (
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Pasuje lokacji: <b className="text-ink">{visible.size}</b> z {LOCATIONS.length}</span>
                <Button size="sm" variant="ghost" onClick={() => { setKind(''); setMinMagic(1); setCharacter(''); }}>
                  <X size={14} /> Wyczyść filtry
                </Button>
              </div>
            )}
          </div>

          <div className={cx('card overflow-hidden p-0', noteMode && 'ring-4 ring-ember')}>
            <MultiverseMap
              layers={layers}
              visible={visible}
              selectedId={selected}
              missionIds={offerLoc ? [offerLoc] : []}
              notes={agent.notes}
              noteMode={noteMode}
              onSelect={(id) => {
                setSelected(id);
                setActiveNote(null);
              }}
              onAddNote={(x, y) => setDraft({ x, y, text: '' })}
              onSelectNote={(id) => {
                setActiveNote(id);
                setSelected(null);
              }}
            />
          </div>
          <p className="text-xs text-faint">
            Pogoda symulowana: pora dnia według Twojego zegara, 🦄 trasa migracji pegazów. {noteMode ? 'Kliknij w mapę, by wbić pinezkę.' : ''}
          </p>
        </div>

        {/* Side panel */}
        <aside className="space-y-4 min-w-0">
          <div className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif font-bold text-lg flex items-center gap-2"><MapPin size={18} /> Notatki agenta</h2>
              <Button size="sm" variant={noteMode ? 'primary' : 'secondary'} onClick={() => { setNoteMode((m) => !m); setDraft(null); }}>
                <Crosshair size={15} /> {noteMode ? 'Anuluj' : 'Dodaj'}
              </Button>
            </div>
            {draft && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted">Pinezka w punkcie ({draft.x}, {draft.y})</p>
                <textarea
                  autoFocus
                  className="field min-h-20"
                  maxLength={200}
                  placeholder="Np. „Tu smok trzyma zapas siarki. Nie wchodzić bez B-7.”"
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" disabled={saving || !draft.text.trim()} onClick={saveNote}>Przypnij</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Odrzuć</Button>
                </div>
              </div>
            )}
            {agent.notes.length === 0 && !draft ? (
              <p className="text-sm text-muted mt-2">Brak notatek. Kliknij „Dodaj”, a potem miejsce na mapie.</p>
            ) : (
              <ul className="mt-3 space-y-2 max-h-56 overflow-y-auto scroll-thin">
                {agent.notes.map((n) => (
                  <li key={n.id} className={cx('flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm', activeNote === n.id ? 'bg-gold/40' : 'bg-raised')}>
                    <button className="flex-1 text-left min-w-0 break-words" onClick={() => setActiveNote(n.id)}>📌 {n.text}</button>
                    <button aria-label="Usuń notatkę" className="text-faint hover:text-candy shrink-0" onClick={() => removeNote(n.id)}>
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {loc ? (
            <LocationPanel locId={loc.id} archive={archive} isOffer={loc.id === offerLoc} onClose={() => setSelected(null)} />
          ) : (
            <div className="card p-4 text-sm text-muted">
              <p className="font-serif font-bold text-ink text-lg mb-1">Wybierz lokację</p>
              Kliknij znacznik na mapie, aby zobaczyć poziom magii, zagrożenie, frakcję, zasoby, obecne postacie, misje i wpisy w Archiwum.
              <ul className="mt-3 space-y-1">
                {Object.entries(FACTIONS).map(([id, f]) => (
                  <li key={id} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full border-2 border-outline" style={{ background: f.color }} /> {f.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function LocationPanel({ locId, archive, isOffer, onClose }: { locId: string; archive: ArchiveListItem[]; isOffer: boolean; onClose: () => void }) {
  const loc = locationOf(locId)!;
  const missions = MISSIONS.filter((m) => m.locationId === loc.id);
  const entries = archive.filter((e) => e.locationId === loc.id);
  const faction = FACTIONS[loc.faction];
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="eyebrow">{KIND_LABEL[loc.kind].emoji} {KIND_LABEL[loc.kind].label}</p>
          <h2 className="font-serif font-bold text-xl leading-tight">{loc.name}</h2>
        </div>
        <button aria-label="Zamknij" className="text-faint hover:text-ink" onClick={onClose}><X size={18} /></button>
      </div>
      {isOffer && <Badge tone="danger">❗ Tu czeka Twoja misja</Badge>}
      <p className="text-sm">{loc.desc}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm items-center">
        <dt className="eyebrow">Magia</dt>
        <dd><Pips value={loc.magic} color="var(--color-chaos)" /></dd>
        <dt className="eyebrow">Zagrożenie</dt>
        <dd><Pips value={loc.threat} color="var(--color-candy)" /></dd>
        <dt className="eyebrow">Frakcja</dt>
        <dd className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-outline" style={{ background: faction.color }} /> {faction.name}</dd>
        <dt className="eyebrow">Zasoby</dt>
        <dd>{loc.resources.join(', ')}</dd>
      </dl>
      <div>
        <p className="eyebrow mb-1">Postacie na miejscu</p>
        <div className="flex flex-wrap gap-1.5">
          {loc.characters.map((c) => <Badge key={c}>{c}</Badge>)}
        </div>
      </div>
      {missions.length > 0 && (
        <div>
          <p className="eyebrow mb-1">Misje w tej lokacji</p>
          <ul className="space-y-1.5 text-sm">
            {missions.map((m) => (
              <li key={m.id} className="rounded-lg bg-raised px-2 py-1.5">
                <span className="mr-1">{MISSION_TYPES[m.type].emoji}</span>
                <b>{m.title}</b>
                <span className="block text-xs text-muted">{MISSION_TYPES[m.type].name} · trudność {m.difficulty}/5</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {entries.length > 0 && (
        <div>
          <p className="eyebrow mb-1">W Archiwum</p>
          <ul className="space-y-1 text-sm">
            {entries.map((e) => (
              <li key={e.id}>
                <a href={`#/archiwum/${e.id}`} className="inline-flex items-center gap-1.5 font-semibold hover:text-ember underline decoration-dotted underline-offset-2">
                  <BookOpen size={14} /> {e.locked ? '[UTAJNIONE] ' : ''}{e.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
