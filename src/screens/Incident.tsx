import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Siren } from 'lucide-react';
import { agentApi, api, type TaleCard } from '../api';
import { celebrate } from '../agent';
import { navigate } from '../App';
import { prefs } from './Home';
import { AgentScreen } from '../components/agent/AgentScreen';
import { ComicBurst } from '../components/Effects';
import { Badge, Button, cx, useToast } from '../ui';
import { coverStyle } from '../meta';
import { useArt } from '../artkit';
import type { IncidentState } from '../../shared/dailyPack';
import type { Lang } from '../../shared/types';

const KIND_COLORS = ['var(--color-sane)', 'var(--color-chaos)', 'var(--color-ember)'];

/** Incident of the day: one field report, three ways to handle it, one consequence and IGNIS filing the case. */
export function Incident() {
  const toast = useToast();
  const art = useArt();
  const [state, setState] = useState<(IncidentState & { lang: Lang }) | null>(null);
  const [tales, setTales] = useState<TaleCard[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    agentApi.incident((prefs.get('ignis.lang', 'en') as Lang) || 'en').then(setState).catch((e) => toast(e.message, 'error'));
    api.tales().then(setTales).catch(() => {});
  }, []);

  if (!state) {
    return (
      <AgentScreen eyebrow="Incident of the day" title="Incoming report…">
        <div className="card p-6 inline-flex items-center gap-3 text-muted"><Loader2 className="animate-spin" size={18} /> The report is being decoded. Someone wrote it in glitter again.</div>
      </AgentScreen>
    );
  }

  const { incident, result } = state;
  const tale = tales.find((t) => t.id === incident.tale_id);
  const cover = tale && art.src(`cover-${tale.id}`);

  const decide = async (i: number) => {
    setBusy(i);
    try {
      const r = await agentApi.decide(i, state.lang);
      setState(r.state);
      celebrate(r.xp);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <AgentScreen eyebrow="Incident of the day" title={incident.title}>
      <div className="card overflow-hidden">
        <div className="relative h-32 border-b-[3px] border-outline grid place-items-center overflow-hidden" style={tale ? coverStyle(tale.hue) : coverStyle(200)}>
          {cover ? <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" /> : <span className="text-6xl drop-shadow-[3px_4px_0_#241913]">{tale?.emoji ?? '🏛️'}</span>}
          <span className="absolute top-3 left-3"><Badge tone="danger"><Siren size={12} /> Priority: absurd</Badge></span>
          <span className="absolute bottom-3 right-3"><Badge>{tale ? tale.title[state.lang] : 'Bureau HQ'}</Badge></span>
        </div>
        <div className="p-5 sm:p-6">
          <span className="eyebrow">Field report</span>
          <p className="prose-story mt-2">{incident.report}</p>
        </div>
      </div>

      <h2 className="font-serif font-bold text-xl mt-6 mb-3">{result ? 'Your call' : 'What do you do, Agent?'}</h2>
      <div className="grid gap-3">
        {incident.choices.map((c, i) => {
          const chosen = result?.choice === i;
          return (
            <button
              key={i}
              type="button"
              disabled={!!result || busy !== null}
              onClick={() => decide(i)}
              className={cx('paper sticker spotlight group relative w-full flex items-center gap-4 text-left bg-surface px-3.5 py-3 disabled:cursor-default', result && !chosen && 'opacity-45', chosen && 'ring-4 ring-gold/70')}
              style={{ ['--spot' as string]: KIND_COLORS[i] }}
            >
              <span className="grid place-items-center w-10 h-10 rounded-xl border-[2.5px] border-outline font-comic text-xl text-outline shrink-0" style={{ background: KIND_COLORS[i] }}>
                {busy === i ? <Loader2 size={18} className="animate-spin" /> : i + 1}
              </span>
              <span className="font-semibold">{c.label}</span>
            </button>
          );
        })}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} className="card relative mt-6 p-6 overflow-visible">
          <ComicBurst x="90%" y="8%" color="var(--color-gold)" word={`+${result.xp} XP`} size={130} delay={0.2} />
          <span className="eyebrow">Consequence</span>
          <p className="prose-story mt-2">{result.outcome}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="ember">Case closed: {result.ending_title}</Badge>
          </div>
          <p className="mt-4 text-sm font-semibold text-muted">IGNIS: “{result.signoff}”</p>
          <Button variant="primary" className="mt-5" onClick={() => navigate('')}>Back to your desk</Button>
        </motion.div>
      )}
    </AgentScreen>
  );
}
