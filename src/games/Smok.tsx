import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge, Button, Meter, Kbd } from '../ui';

type Tactic = 'komplement' | 'prawo' | 'oferta' | 'formularz' | 'milczenie';
const TACTICS: Record<Tactic, { label: string; desc: string }> = {
  komplement: { label: 'Komplement', desc: 'Pochwal łuski, ogień albo gust w urządzaniu jaskini.' },
  prawo: { label: 'Argument prawny', desc: 'Powołaj się na Kodeks Bajkowy, art. 7 § 3.' },
  oferta: { label: 'Oferta', desc: 'Zaproponuj coś w zamian.' },
  formularz: { label: 'Formularz N-2', desc: 'Protokół negocjacji z istotą odradzającą się.' },
  milczenie: { label: 'Wymowne milczenie', desc: 'Patrz w oczy. Nie mrugaj.' },
};
const OFFERS = ['światłowód 10 Tb/s', 'owcę (wypchaną siarką? nie!)', 'skrzynię złota', 'abonament na seriale', 'zapas pierników', 'tytuł Smoka Miesiąca'];

const ROUNDS = 8;
const WIN_MOOD = 85;

const LINES: Record<Tactic, Record<'love' | 'like' | 'meh' | 'hate', string[]>> = {
  komplement: {
    love: ['Smok rumieni się na szkarłatno. „Naprawdę uważasz, że moje łuski są… lśniące?”', 'Smok przegląda się w tarczy. „Mów dalej, agencie.”'],
    like: ['Smok mruczy jak duży, ognisty kot.', '„No, przynajmniej masz oczy.”'],
    meh: ['Smok ziewa. Z ziewnięcia wylatuje mała chmurka dymu.', '„Komplementy słyszałem już od rycerzy. Przed śniadaniem.”'],
    hate: ['„Pochlebstwa? Ostatni pochlebca skończył jako przystawka.”', 'Smok mruży oczy. „Coś kombinujesz.”'],
  },
  prawo: {
    love: ['Smok wyciąga okulary. „Art. 7 § 3, powiadasz? Fascynujące. Czytaj dalej.”', '„Wreszcie ktoś, kto zna procedury!”'],
    like: ['Smok kiwa głową z szacunkiem dla paragrafów.', '„Hm. Mój prawnik by się z tym zgodził. Gdybym go nie zjadł.”'],
    meh: ['Smok zaczyna liczyć łuski na ogonie.', '„Prawo, prawo… a gdzie tu jest miejsce na uczucia?”'],
    hate: ['„Kodeksy! Spaliłem trzy biblioteki prawnicze i dalej je cytujecie!”', 'Smok buchnął ogniem w sufit. Paragrafy się tlą.'],
  },
  oferta: {
    love: ['Oczy smoka zamieniają się w dwa złote dukaty. „TO. Właśnie TO.”', '„Dlaczego nie od tego zaczęliśmy?!”'],
    like: ['Smok przechyla łeb. „Brzmi… rozsądnie.”', '„Do negocjacji. Ale ciepło, ciepło.”'],
    meh: ['„Mam już takie trzy. Jedno w piwnicy.”', 'Smok wzrusza skrzydłami.'],
    hate: ['„To ma być oferta? Obraza całego smoczego rodu!”', 'Smok odwraca się ogonem. Dosłownie.'],
  },
  formularz: {
    love: ['Smok pieczołowicie wypełnia rubrykę „imię”. Ma ładny charakter pisma.', '„N-2! Kocham ten druczek. Ma takie przyjemne kratki.”'],
    like: ['Smok podpisuje pierwszą stronę pazurem. Druga jest w drodze.', '„No dobrze, ale tylko w trzech egzemplarzach.”'],
    meh: ['Formularz nieco się przypalił na brzegach.', '„Wypełnię go później. Może w przyszłym tysiącleciu.”'],
    hate: ['Formularz N-2 zamienia się w kupkę popiołu. Kopia też.', '„BIUROKRACJA?! W MOJEJ JASKINI?!”'],
  },
  milczenie: {
    love: ['Smok też milczy. To najpiękniejsza rozmowa, jaką odbył od wieków.', 'Smok ociera łzę. „Ty mnie rozumiesz.”'],
    like: ['Smok w końcu mówi: „Dobra, dobra. Słucham.”', 'Cisza wisi w powietrzu. Smok wygląda na zaintrygowanego.'],
    meh: ['„Halo? Jest tam kto?”', 'Smok stuka pazurem w skałę.'],
    hate: ['„Ignorujesz mnie?! MNIE?!”', 'Smok zaczyna nucić, żeby przerwać ciszę. Fałszuje ogniem.'],
  },
};

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

type Feel = 'love' | 'like' | 'meh' | 'hate';
const EFFECT: Record<Feel, number> = { love: 22, like: 11, meh: 0, hate: -14 };

function randomPrefs() {
  const feelings: Feel[] = shuffle(['love', 'like', 'meh', 'hate', 'like']);
  const tactics = Object.keys(TACTICS) as Tactic[];
  const prefs = Object.fromEntries(tactics.map((t, i) => [t, feelings[i]])) as Record<Tactic, Feel>;
  const offerFeel = Object.fromEntries(OFFERS.map((o) => [o, pick<Feel>(['love', 'like', 'meh', 'hate'])])) as Record<string, Feel>;
  // One offer is always the dragon's dream.
  offerFeel[pick(OFFERS)] = 'love';
  return { prefs, offerFeel };
}

function DragonFace({ mood }: { mood: number }) {
  const happy = mood >= 60;
  const angry = mood < 25;
  return (
    <svg viewBox="0 0 160 120" className="w-40 h-32" role="img" aria-label={happy ? 'Smok zadowolony' : angry ? 'Smok rozgniewany' : 'Smok nieufny'}>
      <path d="M30 40 L20 8 L48 30 Z M130 40 L140 8 L112 30 Z" fill="#3f9f5f" stroke="#241913" strokeWidth="4" strokeLinejoin="round" />
      <ellipse cx="80" cy="66" rx="58" ry="46" fill="#5bbf7a" stroke="#241913" strokeWidth="5" />
      <ellipse cx="80" cy="88" rx="34" ry="20" fill="#a8e3b8" stroke="#241913" strokeWidth="4" />
      <circle cx="70" cy="86" r="3" fill="#241913" />
      <circle cx="90" cy="86" r="3" fill="#241913" />
      <circle cx="58" cy="54" r="11" fill="#fff6e2" stroke="#241913" strokeWidth="4" />
      <circle cx="102" cy="54" r="11" fill="#fff6e2" stroke="#241913" strokeWidth="4" />
      <circle cx="60" cy="56" r="5" fill="#241913" />
      <circle cx="100" cy="56" r="5" fill="#241913" />
      {angry && <path d="M44 38 L70 46 M116 38 L90 46" stroke="#241913" strokeWidth="5" strokeLinecap="round" />}
      {happy ? (
        <path d="M62 100 Q80 112 98 100" fill="none" stroke="#241913" strokeWidth="4" strokeLinecap="round" />
      ) : (
        <path d={angry ? 'M62 106 Q80 96 98 106' : 'M64 103 L96 103'} fill="none" stroke="#241913" strokeWidth="4" strokeLinecap="round" />
      )}
      {angry && <path d="M112 92 q14 -4 22 6 q-10 0 -6 10 q-8 -8 -16 -6Z" fill="#ff7a2f" stroke="#241913" strokeWidth="3" />}
      {happy && <><circle cx="44" cy="76" r="6" fill="#ff9aa2" opacity="0.7" /><circle cx="116" cy="76" r="6" fill="#ff9aa2" opacity="0.7" /></>}
    </svg>
  );
}

export function Smok({ onFinish }: { onFinish: (score: number) => void }) {
  const { prefs, offerFeel } = useMemo(randomPrefs, []);
  const [round, setRound] = useState(1);
  const [mood, setMood] = useState(35);
  const [patience, setPatience] = useState(100);
  const [last, setLast] = useState<Tactic | null>(null);
  const [log, setLog] = useState<{ id: number; you: string; dragon: string }[]>([
    { id: 0, you: 'Dzień dobry, Agencja Ratowania Bajek. Chciałbym porozmawiać o pańskich żądaniach.', dragon: '„Rozmawiać? Ja chcę światłowodu. I szacunku. Kolejność dowolna.”' },
  ]);
  const [over, setOver] = useState<null | 'win' | 'lose'>(null);
  const options = useMemo(() => {
    const ts = shuffle(Object.keys(TACTICS) as Tactic[]).slice(0, 4);
    return ts.map((t) => ({ tactic: t, offer: t === 'oferta' ? pick(OFFERS) : null }));
  }, [round]);

  const play = (i: number) => {
    if (over) return;
    const opt = options[i];
    if (!opt) return;
    const feel: Feel = opt.offer ? offerFeel[opt.offer] : prefs[opt.tactic];
    const repeat = last === opt.tactic;
    let delta = EFFECT[feel];
    if (repeat) delta = delta > 0 ? Math.round(delta / 2) : delta - 4;
    const nextMood = Math.max(0, Math.min(100, mood + delta));
    const nextPatience = Math.max(0, patience - 10 - (feel === 'hate' ? 12 : 0) - (repeat ? 5 : 0));
    const line = (repeat ? '„Już to mówiłeś.” ' : '') + pick(LINES[opt.tactic][feel]);
    setLog((l) => [...l, { id: round + 1, you: opt.offer ? `Oferuję: ${opt.offer}.` : `${TACTICS[opt.tactic].label}.`, dragon: line }]);
    setMood(nextMood);
    setPatience(nextPatience);
    setLast(opt.tactic);
    if (nextMood >= WIN_MOOD) {
      setOver('win');
      const roundsLeft = ROUNDS - round;
      onFinish(Math.min(100, 50 + roundsLeft * 7 + nextPatience * 0.25));
    } else if (round >= ROUNDS || nextPatience <= 0) {
      setOver('lose');
      onFinish(nextMood * 0.45);
    } else {
      setRound(round + 1);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) play(Number(e.key) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr] max-w-5xl mx-auto items-start">
      <div className="card p-5 flex flex-col items-center gap-4">
        <motion.div animate={{ rotate: mood < 25 ? [0, -3, 3, 0] : 0 }} transition={{ repeat: mood < 25 ? Infinity : 0, duration: 0.4 }}>
          <DragonFace mood={mood} />
        </motion.div>
        <div className="w-full space-y-3">
          <Meter label="Nastrój smoka" value={mood} color="var(--color-ember)" />
          <Meter label="Cierpliwość" value={patience} color="var(--color-mana)" />
        </div>
        <Badge tone="warn">Runda {Math.min(round, ROUNDS)}/{ROUNDS}</Badge>
        <p className="text-xs text-faint text-center">Porozumienie przy nastroju {WIN_MOOD}+. Każdy smok lubi co innego. Powtarzanie się nudzi.</p>
      </div>
      <div className="card p-5 flex flex-col gap-4">
        <div className="space-y-3 max-h-80 overflow-y-auto scroll-thin pr-1" aria-live="polite">
          <AnimatePresence initial={false}>
            {log.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                <p className="text-sm"><b>Ty:</b> {m.you}</p>
                <p className="text-sm bg-raised rounded-xl px-3 py-2 border-2 border-outline">🐲 {m.dragon}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {over ? (
          <div className="text-center font-bold">
            {over === 'win' ? '📜 Smok podpisał porozumienie! (Pazurem, w trzech egzemplarzach.)' : '🔥 Negocjacje zerwane. Formularz N-2 spłonął razem z teczką.'}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((o, i) => (
              <button
                key={`${round}-${i}`}
                onClick={() => play(i)}
                className="text-left rounded-xl border-[2.5px] border-outline bg-[#fff6e2] px-3 py-2 shadow-[0_3px_0_var(--color-outline)] hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
              >
                <span className="flex items-center justify-between gap-2 font-bold">
                  {TACTICS[o.tactic].label} <Kbd>{i + 1}</Kbd>
                </span>
                <span className="block text-xs text-muted mt-0.5">{o.offer ? `Proponujesz: ${o.offer}` : TACTICS[o.tactic].desc}</span>
              </button>
            ))}
          </div>
        )}
        {!over && <Button variant="ghost" size="sm" onClick={() => { setOver('lose'); onFinish(mood * 0.3); }}>Zakończ negocjacje przed czasem</Button>}
      </div>
    </div>
  );
}
