import { lazy, Suspense, useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { ToastProvider } from './ui';
import { Snow } from './components/Effects';
import { useSnow } from './prefs';

// Players never download the admin console, and the reader loads only when a story opens.
const StoryScreen = lazy(() => import('./screens/Story').then((m) => ({ default: m.StoryScreen })));
const Admin = lazy(() => import('./screens/Admin').then((m) => ({ default: m.Admin })));

const readRoute = () => window.location.hash.replace(/^#\/?/, '').split('/');

export const navigate = (path: string) => {
  window.location.hash = `/${path}`;
};

function Loading() {
  return (
    <div className="min-h-screen grid place-items-center">
      <span className="eyebrow animate-pulse">Opening the grimoire…</span>
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

  const [screen, id] = route;
  const snow = useSnow();
  return (
    <ToastProvider>
      {snow && <Snow />}
      <Suspense fallback={<Loading />}>
        {screen === 'admin' ? <Admin /> : screen === 'story' && id ? <StoryScreen key={id} storyId={id} /> : <Home />}
      </Suspense>
    </ToastProvider>
  );
}
