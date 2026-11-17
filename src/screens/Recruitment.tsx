import { useState } from 'react';
import { motion } from 'motion/react';
import { FileSignature, KeyRound, Loader2, Stamp } from 'lucide-react';
import { SPECIALIZATIONS, type SpecializationId } from '../../shared/arb';
import { api } from '../api';
import { setAgent, signOut } from '../agent';
import { Cat } from '../components/Cat';
import { Badge, Button, Logo, Segmented, cx, useToast } from '../ui';

const ID_RE = /^[a-zA-Z0-9-]{8,64}$/;

/** Formularz B-7: joining the agency. Also restores an agent from its pass id on another device. */
export function Recruitment({ lost }: { lost?: boolean }) {
  const toast = useToast();
  const [codename, setCodename] = useState('');
  const [spec, setSpec] = useState<SpecializationId>('europa');
  const [lang, setLang] = useState<'pl' | 'en'>('pl');
  const [busy, setBusy] = useState(false);
  const [passId, setPassId] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const agent = await api.register(codename.trim(), spec, lang);
      setAgent(agent);
      window.scrollTo(0, 0);
      toast(`Formularz B-7 przyjęty. Witamy, Agencie ${agent.codename}!`);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    const id = passId.trim();
    if (!ID_RE.test(id)) return toast('To nie wygląda na numer przepustki.', 'error');
    setBusy(true);
    try {
      setAgent(await api.agent(id));
      toast('Przepustka zweryfikowana. Witamy z powrotem.');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center">
        <Logo />
      </header>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pb-16">
        <section className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center pt-6">
          <div>
            <Badge tone="danger">Wersja 3.15 · ściśle tajne</Badge>
            <h1 className="toon-title text-4xl sm:text-6xl mt-4 leading-[1.05]">Porządkujemy Narrację, jedna bajka na raz.</h1>
            <p className="text-muted mt-4 text-lg leading-relaxed">
              Kopciuszek zgubił smartfona zamiast pantofelka. Smok Wawelski żąda światłowodu 10&nbsp;Tb/s. Wróżki strajkują, bo nikt nie zapłacił za brokat.
              Agencja Ratowania Bajek potrzebuje Cię w terenie, zaraz po wypełnieniu formularza B-7, trzech załącznikach i pieczątce DKSF.
            </p>
            {lost && (
              <div className="card mt-5 px-4 py-3 text-sm !bg-[#ffe9a8]">
                Nie znaleźliśmy Twojej przepustki w rejestrze. Złóż formularz ponownie albo wpisz numer przepustki poniżej.
                <button onClick={signOut} className="ml-2 underline font-bold">Wyczyść</button>
              </div>
            )}
          </div>
          <motion.div className="flex justify-center" initial={{ rotate: -6, scale: 0.9, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }}>
            <div className="card p-5 flex items-center gap-4 max-w-sm">
              <Cat mood="zaciekawiony" size={110} talking />
              <p className="text-sm">
                <span className="eyebrow block mb-1">Zastępca Dyrektora mówi</span>
                „Mrrrau.”
                <span className="block text-faint mt-1 font-mono text-xs">[MRUCZ-TERM, pewność 62%: „Kolejny stażysta. Daj mu długopis, który nie pisze.”]</span>
              </p>
            </div>
          </motion.div>
        </section>

        <form onSubmit={submit} className="card mt-10 p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <FileSignature className="text-candy" />
            <h2 className="font-serif font-bold text-2xl">Formularz B-7: Wniosek o przyjęcie do służby</h2>
          </div>
          <div className="grid md:grid-cols-[1fr_auto] gap-5 mt-6">
            <label className="block">
              <span className="eyebrow">Rubryka 1: kryptonim agenta</span>
              <input value={codename} onChange={(e) => setCodename(e.target.value)} maxLength={24} placeholder="np. Szara Sowa" className="field mt-1.5" required minLength={2} autoFocus />
              <span className="text-xs text-faint mt-1 block">Wymyślony. DZLiN nie przyjmuje prawdziwych imion ani danych osobowych.</span>
            </label>
            <div>
              <span className="eyebrow block mb-1.5">Rubryka 2: język akt</span>
              <Segmented<"pl" | "en"> label="Język akt" value={lang} onChange={setLang} options={[{ value: 'pl', label: 'Polski' }, { value: 'en', label: 'English' }]} />
            </div>
          </div>

          <fieldset className="mt-6">
            <legend className="eyebrow">Rubryka 3: sekcja Departamentu Interwencji Terenowych</legend>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {SPECIALIZATIONS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSpec(s.id)}
                  aria-pressed={spec === s.id}
                  className={cx(
                    'text-left rounded-2xl border-[2.5px] border-outline px-4 py-3 transition-all',
                    spec === s.id ? 'bg-gold shadow-[0_4px_0_var(--color-outline)] -translate-y-0.5' : 'bg-field hover:bg-raised',
                  )}
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="block font-serif font-bold mt-1">{s.name}</span>
                  <span className="block text-xs text-muted">{s.kind === 'geo' ? 'Sekcja geograficzna' : 'Sekcja tematyczna'}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4 mt-8">
            <Button variant="primary" size="lg" disabled={busy || codename.trim().length < 2}>
              {busy ? <Loader2 className="animate-spin" size={18} /> : <Stamp size={18} />} Złóż wniosek i przystaw pieczątkę
            </Button>
            <span className="text-xs text-faint">Składając wniosek, akceptujesz regulamin (847 stron, w tym 3 przypisy o kawie).</span>
          </div>
        </form>

        <div className="card mt-6 p-5 flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="flex-1">
            <span className="eyebrow flex items-center gap-1.5"><KeyRound size={14} /> Masz już przepustkę z innego urządzenia?</span>
            <input value={passId} onChange={(e) => setPassId(e.target.value)} placeholder="Numer przepustki (z Pulpitu → Przepustka)" className="field mt-1.5 font-mono" />
          </label>
          <Button type="button" onClick={restore} disabled={busy || !passId.trim()}>Zweryfikuj</Button>
        </div>
      </main>
    </div>
  );
}
