import { lazy, Suspense, useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { ToastProvider } from './ui';
import { Snow } from './components/Effects';
import { useSnow } from './prefs';
import { XpPops } from './components/agent/XpPops';
import { useAgent } from './agent';

// Players never download the admin console, and the reader loads only when a story opens.
const StoryScreen = lazy(() => import('./screens/Story').then((m) => ({ default: m.StoryScreen })));
const Admin = lazy(() => import('./screens/Admin').then((m) => ({ default: m.Admin })));
const Dashboard = lazy(() => import('./screens/Dashboard').then((m) => ({ default: m.Dashboard })));

/** #/ and #/agent/<view>: a section or mission of the agent's desk; visitors who are not logged in get the landing page. */
function AgentRoute({ view, extra }: { view: string | undefined; extra: string | undefined }) {
  const { key } = useAgent();
  if (!key) return <Home />;
  const v = ['hq', 'cases', 'daily', 'archive', 'log', 'quiz', 'incident', 'interrogation', 'key'].includes(view ?? '') ? (view as any) : 'hq';
  return <Dashboard view={v} extra={extra} />;
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
        {screen === 'admin' ? <Admin /> : screen === 'story' && id ? <StoryScreen key={id} storyId={id} /> : screen === 'agent' || !screen ? <AgentRoute view={screen === 'agent' ? id : 'hq'} extra={extra} /> : <Home />}
      </Suspense>
      <XpPops />
    </ToastProvider>
  );
}
