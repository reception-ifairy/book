import { useEffect, useState, type MouseEvent } from 'react';
import { FACTIONS, LOCATIONS, PEGASUS_ROUTE, type LocationKind, type MapLocation, type Terrain } from '../../shared/arb';
import type { MapNote } from '../../shared/types';

export type MapLayer = 'fizyczna' | 'polityczna' | 'zagrozen' | 'zasobow';
export const MAP_LAYERS: { id: MapLayer; label: string }[] = [
  { id: 'fizyczna', label: 'Fizyczna' },
  { id: 'polityczna', label: 'Polityczna' },
  { id: 'zagrozen', label: 'Zagrożeń' },
  { id: 'zasobow', label: 'Zasobów' },
];

export const KIND_LABEL: Record<LocationKind, { label: string; emoji: string }> = {
  siedziba: { label: 'Siedziba', emoji: '🏢' },
  miasto: { label: 'Miasto', emoji: '🏙️' },
  kraina: { label: 'Kraina', emoji: '🌳' },
  biblioteka: { label: 'Biblioteka', emoji: '📚' },
  anomalia: { label: 'Anomalia', emoji: '🌀' },
  twierdza: { label: 'Twierdza', emoji: '🏰' },
  wymiar: { label: 'Wymiar', emoji: '🪐' },
};

const TERRAIN_GLYPH: Record<Terrain, string> = { las: '🌲', gory: '⛰️', woda: '🌊', miasto: '🏘️', pustka: '✦', rowniny: '🌾' };

/** Stylised continents: hand-drawn blobs on the 1000 × 640 sheet. */
const REGIONS: { id: string; name: string; d: string; fill: string; labelAt: [number, number] }[] = [
  { id: 'europa', name: 'Baśnie Europejskie', fill: '#cfe3b4', labelAt: [215, 70], d: 'M60 120 C 90 60, 200 40, 300 70 C 380 60, 440 90, 450 150 C 470 210, 420 250, 380 300 C 400 360, 470 420, 470 490 C 440 530, 360 520, 330 470 C 290 430, 240 420, 200 380 C 150 360, 70 340, 60 280 C 40 230, 50 170, 60 120 Z' },
  { id: 'ameryka', name: 'Legendy Ameryki Płd.', fill: '#b9dca4', labelAt: [150, 610], d: 'M40 380 C 90 360, 150 370, 180 410 C 240 440, 280 500, 260 560 C 240 610, 170 625, 110 610 C 60 590, 30 520, 35 460 Z' },
  { id: 'azja', name: 'Mitologie Azjatyckie', fill: '#f2d9a6', labelAt: [850, 140], d: 'M650 200 C 690 140, 780 120, 860 130 C 940 140, 975 220, 965 300 C 960 380, 960 450, 900 470 C 840 490, 780 440, 740 400 C 690 360, 650 320, 660 270 Z' },
  { id: 'centrum', name: 'Centrum', fill: '#ead6b8', labelAt: [520, 430], d: 'M400 220 C 440 180, 520 190, 570 220 C 640 250, 660 320, 630 380 C 600 420, 520 420, 470 390 C 420 360, 380 300, 400 220 Z' },
];
const ISLANDS: { cx: number; cy: number; rx: number; ry: number }[] = [
  { cx: 640, cy: 88, rx: 92, ry: 38 },
  { cx: 935, cy: 68, rx: 58, ry: 30 },
  { cx: 760, cy: 562, rx: 88, ry: 38 },
];

/** 0 at noon, 1 deep at night, from the viewer's clock. */
function nightness(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  return Math.max(0, Math.min(1, (Math.cos(((h - 12) / 24) * 2 * Math.PI) * -1 + 0.2) / 1.2));
}

function useNight() {
  const [n, setN] = useState(nightness);
  useEffect(() => {
    const t = setInterval(() => setN(nightness()), 60_000);
    return () => clearInterval(t);
  }, []);
  return n;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

const ROUTE_D = PEGASUS_ROUTE.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');

export interface MultiverseMapProps {
  layers: Record<MapLayer, boolean>;
  /** Locations that pass the filters; the others are drawn faded. */
  visible: Set<string>;
  selectedId: string | null;
  /** Locations with a mission waiting for this agent (NarratoMat offer). */
  missionIds: string[];
  notes: MapNote[];
  noteMode: boolean;
  onSelect: (id: string | null) => void;
  onAddNote: (x: number, y: number) => void;
  onSelectNote?: (id: string) => void;
}

export function MultiverseMap({ layers, visible, selectedId, missionIds, notes, noteMode, onSelect, onAddNote, onSelectNote }: MultiverseMapProps) {
  const night = useNight();
  const reduced = useReducedMotion();

  const onBackground = (e: MouseEvent<SVGSVGElement>) => {
    if (!noteMode) return onSelect(null);
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    onAddNote(Math.round(Math.max(0, Math.min(1000, pt.x))), Math.round(Math.max(0, Math.min(640, pt.y))));
  };

  return (
    <svg
      viewBox="0 0 1000 640"
      className="w-full h-auto block select-none"
      style={{ cursor: noteMode ? 'crosshair' : 'default' }}
      onClick={onBackground}
      role="img"
      aria-label="Mapa Multiwersum"
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#b9986d" strokeOpacity="0.25" strokeWidth="1" />
        </pattern>
        <radialGradient id="heat">
          <stop offset="0%" stopColor="#d8423b" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#ff7a2f" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ff7a2f" stopOpacity="0" />
        </radialGradient>
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="6" />
        </filter>
      </defs>

      {/* Sea and parchment */}
      <rect width="1000" height="640" fill={layers.fizyczna ? '#bfe0e6' : '#fdf5e4'} />
      <rect width="1000" height="640" fill="url(#grid)" />

      {/* Physical layer: continents and floating dimension islands */}
      <g filter="url(#rough)">
        {REGIONS.map((r) => (
          <path key={r.id} d={r.d} fill={layers.fizyczna ? r.fill : '#f3e4c4'} stroke="#241913" strokeWidth="2.5" />
        ))}
        {ISLANDS.map((i, k) => (
          <ellipse key={k} cx={i.cx} cy={i.cy} rx={i.rx} ry={i.ry} fill={layers.fizyczna ? '#d9c8f2' : '#efe2f6'} stroke="#241913" strokeWidth="2.5" strokeDasharray="7 5" />
        ))}
      </g>
      {REGIONS.map((r) => (
        <text key={r.id} x={r.labelAt[0]} y={r.labelAt[1]} textAnchor="middle" className="font-serif" fontSize="15" fontWeight="700" fill="#6b5242" opacity="0.8" style={{ pointerEvents: 'none' }}>
          {r.name}
        </text>
      ))}
      <text x="800" y="22" textAnchor="middle" fontSize="13" fontWeight="700" fill="#6b5242" opacity="0.8" className="font-serif" style={{ pointerEvents: 'none' }}>Wymiary</text>

      {layers.fizyczna &&
        LOCATIONS.map((l) => (
          <text key={`t-${l.id}`} x={l.x - 34} y={l.y + 30} fontSize="16" opacity="0.7" style={{ pointerEvents: 'none' }}>
            {TERRAIN_GLYPH[l.terrain]}
          </text>
        ))}

      {/* Political layer: faction territories */}
      {layers.polityczna && (
        <g style={{ pointerEvents: 'none' }}>
          {LOCATIONS.map((l) => (
            <circle key={`p-${l.id}`} cx={l.x} cy={l.y} r={64} fill={FACTIONS[l.faction].color} fillOpacity="0.22" stroke={FACTIONS[l.faction].color} strokeWidth="2" strokeDasharray="5 4" />
          ))}
        </g>
      )}

      {/* Threat layer: heat halos */}
      {layers.zagrozen && (
        <g style={{ pointerEvents: 'none' }}>
          {LOCATIONS.filter((l) => l.threat > 0).map((l) => (
            <circle key={`h-${l.id}`} cx={l.x} cy={l.y} r={18 + l.threat * 14} fill="url(#heat)" />
          ))}
        </g>
      )}

      {/* Pegasus migration (weather simulation) */}
      <g style={{ pointerEvents: 'none' }}>
        <path d={ROUTE_D} fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
        {[0, 1.4, 2.8].map((delay, i) =>
          reduced ? (
            i === 0 && <text key={i} x={PEGASUS_ROUTE[1][0]} y={PEGASUS_ROUTE[1][1] - 12} fontSize="18">🦄</text>
          ) : (
            <text key={i} fontSize={18 - i * 3} x="-9" y="6">
              🦄
              <animateMotion dur="60s" begin={`${delay}s`} repeatCount="indefinite" path={ROUTE_D} />
            </text>
          ),
        )}
      </g>

      {/* Locations */}
      {LOCATIONS.map((l) => (
        <LocationMarker
          key={l.id}
          loc={l}
          faded={!visible.has(l.id)}
          selected={selectedId === l.id}
          mission={missionIds.includes(l.id)}
          showResources={layers.zasobow}
          reduced={reduced}
          onClick={() => onSelect(l.id)}
        />
      ))}

      {/* Personal notes */}
      {notes.map((n) => (
        <g
          key={n.id}
          transform={`translate(${n.x} ${n.y})`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectNote?.(n.id);
          }}
        >
          <title>{n.text}</title>
          <text x="-8" y="0" fontSize="22">📌</text>
        </g>
      ))}

      {/* Day / night tint from the viewer's clock */}
      <rect width="1000" height="640" fill="#0d1440" opacity={night * 0.35} style={{ pointerEvents: 'none' }} />
      {night > 0.5 && (
        <g style={{ pointerEvents: 'none' }} opacity={night}>
          {[[90, 40], [300, 30], [520, 140], [700, 30], [980, 200], [40, 600], [600, 610]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.8" fill="#fff6e2" />
          ))}
        </g>
      )}
    </svg>
  );
}

function LocationMarker({ loc, faded, selected, mission, showResources, reduced, onClick }: { loc: MapLocation; faded: boolean; selected: boolean; mission: boolean; showResources: boolean; reduced: boolean; onClick: () => void }) {
  return (
    <g
      transform={`translate(${loc.x} ${loc.y})`}
      opacity={faded ? 0.25 : 1}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={faded ? -1 : 0}
      aria-label={loc.name}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {mission && (
        <circle r="26" fill="none" stroke="#d8423b" strokeWidth="3">
          {!reduced && <animate attributeName="r" values="22;32;22" dur="1.6s" repeatCount="indefinite" />}
          {!reduced && <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite" />}
        </circle>
      )}
      {selected && <circle r="24" fill="#f4c84a" stroke="#241913" strokeWidth="2.5" />}
      <circle r="17" fill="#fff6e2" stroke="#241913" strokeWidth="2.5" />
      <text textAnchor="middle" dy="6" fontSize="17">{KIND_LABEL[loc.kind].emoji}</text>
      {mission && (
        <g transform="translate(14 -20)">
          <circle r="9" fill="#d8423b" stroke="#241913" strokeWidth="2" />
          <text textAnchor="middle" dy="4" fontSize="12" fontWeight="800" fill="#fff6e2">!</text>
        </g>
      )}
      <text
        y="34"
        textAnchor="middle"
        fontSize="13"
        fontWeight="800"
        fill="#2b211c"
        stroke="#fdf5e4"
        strokeWidth="4"
        paintOrder="stroke"
        className="font-serif"
      >
        {loc.name}
      </text>
      {showResources && (
        <text y="50" textAnchor="middle" fontSize="11" fontWeight="700" fill="#7a2f08" stroke="#fdf5e4" strokeWidth="3" paintOrder="stroke">
          📦 {loc.resources.slice(0, 2).join(' · ')}
        </text>
      )}
    </g>
  );
}
