import { lazy, Suspense, useEffect, useState } from 'react';
import { ToastProvider } from './ui';
import { useAgent } from './agent';
import { Dashboard } from './screens/Dashboard';
import { Recruitment } from './screens/Recruitment';

// Each area loads on demand; players never download the admin console.
const MissionScreen = lazy(() => import('./screens/Mission').then((m) => ({ default: m.MissionScreen })));
const Training = lazy(() => import('./screens/Training').then((m) => ({ default: m.Training })));
const MapScreen = lazy(() => import('./screens/MapScreen').then((m) => ({ default: m.MapScreen })));
const ArchiveScreen = lazy(() => import('./screens/ArchiveScreen').then((m) => ({ default: m.ArchiveScreen })));
const Admin = lazy(() => import('./screens/Admin').then((m) => ({ default: m.Admin })));

const readRoute = () => window.location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);

export const navigate = (path: string) => {
  window.location.hash = `/${path}`;
};

function Loading({ text = 'Wypełnianie formularza B-7…' }: { text?: string }) {
  return (
    <div className="min-h-screen grid place-items-center">
      <span className="eyebrow animate-pulse">{text}</span>
    </div>
  );
}

function AgentRoutes({ screen, id }: { screen: string; id?: string }) {
  const { agent, registered, failed } = useAgent();
  if (!registered || failed) return <Recruitment lost={failed} />;
  if (!agent) return <Loading text="Weryfikacja przepustki…" />;
  switch (screen) {
    case 'misja':
      return id ? <MissionScreen key={id} storyId={id} /> : <Dashboard />;
    case 'szkolenia':
      return <Training game={id} />;
    case 'mapa':
      return <MapScreen focus={id} />;
    case 'archiwum':
      return <ArchiveScreen entryId={id} />;
    default:
      return <Dashboard />;
  }
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

  const [screen, id] = route;
  return (
    <ToastProvider>
      <Suspense fallback={<Loading />}>{screen === 'admin' ? <Admin /> : <AgentRoutes screen={screen} id={id} />}</Suspense>
    </ToastProvider>
  );
}
