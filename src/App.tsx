import { lazy, Suspense, useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { ToastProvider } from './ui';
import { Snow } from './components/Effects';
import { useSnow } from './prefs';
import { XpPops } from './components/agent/XpPops';

// Players never download the admin console, and the reader loads only when a story opens.
const StoryScreen = lazy(() => import('./screens/Story').then((m) => ({ default: m.StoryScreen })));
const Admin = lazy(() => import('./screens/Admin').then((m) => ({ default: m.Admin })));
const Quiz = lazy(() => import('./screens/Quiz').then((m) => ({ default: m.Quiz })));
const Incident = lazy(() => import('./screens/Incident').then((m) => ({ default: m.Incident })));
const Interrogation = lazy(() => import('./screens/Interrogation').then((m) => ({ default: m.Interrogation })));
const AgentKey = lazy(() => import('./screens/AgentKey').then((m) => ({ default: m.AgentKey })));

/** Agent screens under #/agent/...; anything unknown falls back to the desk. */
function agentScreen(sub: string | undefined, extra: string | undefined) {
  switch (sub) {
    case 'quiz':
      return <Quiz />;
    case 'incident':
      return <Incident />;
    case 'interrogation':
      return <Interrogation />;
    case 'key':
      return <AgentKey fresh={extra === 'new'} />;
    default:
      return <Home />;
  }
}

const readRoute = () => window.location.hash.replace(/^#\/?/, '').split('/');

export const navigate = (path: string) => {
  window.location.hash = `/${path}`;
};

function Loading() {
  return (
    <div className="min-h-screen grid place-items-center">
      <span className="eyebrow animate-pulse">Opening the case file…</span>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const [screen, id, extra] = route;
  const snow = useSnow();
  return (
    <ToastProvider>
      {snow && <Snow />}
      <Suspense fallback={<Loading />}>
        {screen === 'admin' ? <Admin /> : screen === 'story' && id ? <StoryScreen key={id} storyId={id} /> : screen === 'agent' ? agentScreen(id, extra) : <Home />}
      </Suspense>
      <XpPops />
    </ToastProvider>
  );
}
